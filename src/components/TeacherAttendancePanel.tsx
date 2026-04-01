import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Users, CheckCircle, Save } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TeacherAttendancePanel = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [courses, setCourses] = useState<any[]>([]);
  const [attendanceState, setAttendanceState] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setLoading(true);
      const { data: assignments } = await supabase
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
      const { data } = await supabase
        .from("enrollments")
        .select("*, profiles!inner(full_name, roll_number)")
        .eq("course_id", selectedCourse);

      setStudents(data || []);
      // Initialize attendance state
      const state: Record<string, string> = {};
      (data || []).forEach((s: any) => { state[s.id] = ""; });
      setAttendanceState(state);
      setLoading(false);
    };
    fetchStudents();
  }, [selectedCourse]);

  const handleSaveAttendance = async () => {
    setSaving(true);
    const today = new Date().toISOString().split("T")[0];

    for (const student of students) {
      const status = attendanceState[student.id];
      if (!status) continue;

      const existingAttendance = Array.isArray(student.attendance) ? student.attendance : [];
      // Check if today already has entry
      const filtered = existingAttendance.filter((a: any) => a.date !== today);
      const updated = [...filtered, { date: today, status }];

      await supabase
        .from("enrollments")
        .update({ attendance: updated })
        .eq("id", student.id);
    }

    toast.success("Attendance saved!");
    setSaving(false);
  };

  if (loading) return <div className="p-6 flex items-center justify-center min-h-[300px]"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

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
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-muted-foreground">Date: <strong className="text-foreground">{new Date().toLocaleDateString()}</strong></div>

          {students.length === 0 ? (
            <p className="text-muted-foreground">No students enrolled in this course.</p>
          ) : (
            <>
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted">
                      <th className="text-left p-3 font-medium text-muted-foreground">#</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Roll Number</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s, idx) => (
                      <tr key={s.id} className="border-t border-border hover:bg-muted/50">
                        <td className="p-3 text-muted-foreground">{idx + 1}</td>
                        <td className="p-3 text-foreground">{(s as any).profiles?.full_name || "—"}</td>
                        <td className="p-3 text-muted-foreground">{(s as any).profiles?.roll_number || "—"}</td>
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
                    ))}
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
