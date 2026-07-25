import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, CheckCircle, Save } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TeacherAttendancePanel = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [courses, setCourses] = useState<any[]>([]);
  const [attendanceState, setAttendanceState] = useState<Record<string, string>>({});
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split("T")[0]);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setLoading(true);
      const { data: assignments } = await (supabase as any)
        .from("teacher_assignments")
        .select("course_id, courses(id, name)")
        .eq("teacher_id", user.id);

      const courseList = (assignments || []).map((a: any) => a.courses).filter(Boolean);
      setCourses(courseList);
      if (courseList.length > 0 && !selectedCourse) {
        setSelectedCourse(courseList[0].id);
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  useEffect(() => {
    if (!selectedCourse) return;
    const fetchStudents = async () => {
      setLoading(true);
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("*, courses(total_weeks)")
        .eq("course_id", selectedCourse);

      if (!enrollments || enrollments.length === 0) {
        setStudents([]);
        setAttendanceState({});
        setLoading(false);
        return;
      }

      const { data: profiles } = await (supabase as any).rpc("get_teacher_students", {
        _course_ids: [selectedCourse],
      });

      const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p]));

      const mapped = enrollments.map((e) => ({
        ...e,
        profile: profileMap[e.user_id],
      }));

      setStudents(mapped);
      setLoading(false);
    };
    fetchStudents();
  }, [selectedCourse]);

  // Pre-fill attendance state from existing entries for the selected date
  useEffect(() => {
    const state: Record<string, string> = {};
    students.forEach((s) => {
      const arr = Array.isArray(s.attendance) ? s.attendance : [];
      const existing = arr.find((a: any) => a.date === selectedDate);
      state[s.id] = existing?.status || "";
    });
    setAttendanceState(state);
  }, [students, selectedDate]);

  const handleSaveAttendance = async () => {
    setSaving(true);
    const dateStr = selectedDate;

    for (const student of students) {
      const status = attendanceState[student.id];
      if (!status) continue;

      const existingAttendance = Array.isArray(student.attendance) ? student.attendance : [];
      const totalWeeks = student.courses?.total_weeks || 0;
      const others = existingAttendance.filter((a: any) => a.date !== dateStr);
      const otherAttended =
        others.filter((a: any) => a.status === "present").length +
        others.filter((a: any) => a.status === "late").length * 0.5;
      const add = status === "present" ? 1 : status === "late" ? 0.5 : 0;
      if (totalWeeks > 0 && otherAttended + add > totalWeeks) {
        toast.error(
          `${student.profile?.full_name || "Student"}: attendance already reached the requirement (${totalWeeks}/${totalWeeks}). Cannot mark another "Present".`
        );
        continue;
      }
      const filtered = existingAttendance.filter((a: any) => a.date !== dateStr);
      const updated = [...filtered, { date: dateStr, status }];

      await supabase
        .from("enrollments")
        .update({ attendance: updated as any })
        .eq("id", student.id);
      // reflect locally so percentages update without refetch
      student.attendance = updated;
    }

    toast.success("Attendance saved!");
    setStudents([...students]);
    setSaving(false);
  };

  const calcPercents = (s: any) => {
    const arr = Array.isArray(s.attendance) ? s.attendance : [];
    const present = arr.filter((a: any) => a.status === "present").length;
    const late = arr.filter((a: any) => a.status === "late").length;
    // 2 lates = 1 absent → each late counts as half a present
    const attended = present + late * 0.5;
    const markedTotal = arr.length;
    const totalWeeks = s.courses?.total_weeks || 0;
    const round = (n: number) => Math.round(n * 10) / 10;
    return {
      running: markedTotal > 0 ? round((attended / markedTotal) * 100) : 0,
      overall: totalWeeks > 0 ? round((attended / totalWeeks) * 100) : 0,
      present,
      late,
      attended: Math.round(attended * 10) / 10,
      markedTotal,
      totalWeeks,
    };
  };

  if (loading && courses.length === 0) return <div className="p-6 flex items-center justify-center min-h-[300px]"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const totalMarkedForDate = students.filter((s) => {
    const arr = Array.isArray(s.attendance) ? s.attendance : [];
    return arr.some((a: any) => a.date === selectedDate);
  }).length;
  const pendingForDate = students.length - totalMarkedForDate;

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
        <CheckCircle className="h-5 w-5" /> Live Attendance
      </h2>

      {courses.length === 0 ? (
        <p className="text-muted-foreground">No courses assigned to you.</p>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">Select Course:</span>
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-muted-foreground">Date:</span>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-44"
            />
            <span className="text-xs text-muted-foreground">Pick any date (past, today, or future).</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : students.length === 0 ? (
            <p className="text-muted-foreground">No students enrolled in this course.</p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-card border border-border rounded-lg p-3">
                  <div className="text-xs text-muted-foreground">Total Students</div>
                  <div className="text-lg font-bold text-foreground">{students.length}</div>
                </div>
                <div className="bg-card border border-border rounded-lg p-3">
                  <div className="text-xs text-muted-foreground">Marked ({selectedDate})</div>
                  <div className="text-lg font-bold text-primary">{totalMarkedForDate}</div>
                </div>
                <div className="bg-card border border-border rounded-lg p-3">
                  <div className="text-xs text-muted-foreground">Pending</div>
                  <div className="text-lg font-bold text-destructive">{pendingForDate}</div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Note: 2 lates count as 1 absent (each late = 0.5 present).</p>
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted">
                      <th className="text-left p-3 font-medium text-muted-foreground">#</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Roll Number</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Running %</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Total %</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s, idx) => {
                      const p = calcPercents(s);
                      return (
                      <tr key={s.id} className="border-t border-border hover:bg-muted/50">
                        <td className="p-3 text-muted-foreground">{idx + 1}</td>
                        <td className="p-3 text-foreground">{s.profile?.full_name || "—"}</td>
                        <td className="p-3 text-muted-foreground">{s.profile?.roll_number || "—"}</td>
                        <td className="p-3 text-foreground">
                          <span className="font-semibold">{p.running}%</span>
                          <span className="text-xs text-muted-foreground ml-1">({p.present}/{p.markedTotal})</span>
                        </td>
                        <td className="p-3 text-foreground">
                          <span className="font-semibold">{p.overall}%</span>
                          <span className="text-xs text-muted-foreground ml-1">({p.present}/{p.totalWeeks})</span>
                        </td>
                        <td className="p-3">
                          <Select
                            value={attendanceState[s.id] || ""}
                            onValueChange={(val) => setAttendanceState((prev) => ({ ...prev, [s.id]: val }))}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="present">Present</SelectItem>
                              <SelectItem value="absent">Absent</SelectItem>
                              <SelectItem value="late">Late</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    );})}
                  </tbody>
                </table>
              </div>

              <Button onClick={handleSaveAttendance} disabled={saving} className="gap-2">
                <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Attendance"}
              </Button>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default TeacherAttendancePanel;
