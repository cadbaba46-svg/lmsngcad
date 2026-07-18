import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2, Calendar, User, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Enrollment { id: string; course_id: string; selected_teacher_id: string | null; selected_section: string | null; courses: { id: string; name: string } }
interface Slot { id: string; teacher_id: string; course_id: string; section: string | null; day_of_week: string; start_time: string; end_time: string; room: string | null }

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

const DepartmentTimeTablePanel = () => {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [teacherNames, setTeacherNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data: enr } = await supabase
      .from("enrollments")
      .select("id, course_id, selected_teacher_id, selected_section, courses(id, name)")
      .eq("user_id", user.id);
    const list = (enr || []) as any as Enrollment[];
    setEnrollments(list);
    const courseIds = list.map((e) => e.course_id);
    if (courseIds.length) {
      const { data: tt } = await (supabase as any).from("teacher_timetables").select("*").in("course_id", courseIds).order("day_of_week").order("start_time");
      const s = (tt || []) as Slot[];
      setSlots(s);
      const teacherIds = Array.from(new Set(s.map((x) => x.teacher_id)));
      if (teacherIds.length) {
        const { data: profs } = await (supabase as any).rpc("get_public_teacher_profiles", { _teacher_ids: teacherIds });
        setTeacherNames(Object.fromEntries((profs || []).map((p: any) => [p.user_id, p.full_name || "Instructor"])));
      }
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const choose = async (enrollmentId: string, teacherId: string, section: string | null) => {
    setSaving(enrollmentId + teacherId + (section || ""));
    const { error } = await supabase.from("enrollments").update({ selected_teacher_id: teacherId, selected_section: section } as any).eq("id", enrollmentId);
    setSaving(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Instructor selected. See Student TimeTable.");
    load();
  };

  if (loading) return <div className="p-6 flex items-center justify-center min-h-[300px]"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (enrollments.length === 0) return <div className="p-6 text-center text-muted-foreground">You have no enrolled courses yet.</div>;

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-bold text-foreground flex items-center gap-2"><Calendar className="h-5 w-5" /> Department TimeTable</h2>
      {enrollments.map((e) => {
        const courseSlots = slots.filter((s) => s.course_id === e.course_id);
        // group by teacher+section
        const groups: Record<string, Slot[]> = {};
        courseSlots.forEach((s) => {
          const key = s.teacher_id + "|" + (s.section || "");
          (groups[key] = groups[key] || []).push(s);
        });
        const groupKeys = Object.keys(groups);
        return (
          <div key={e.id} className="bg-card border border-border rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-bold text-foreground">{e.courses.name}</h3>
              {e.selected_teacher_id && (
                <span className="text-xs text-green-700 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Selected: {teacherNames[e.selected_teacher_id] || "Instructor"}{e.selected_section ? ` · Section ${e.selected_section}` : ""}</span>
              )}
            </div>
            {groupKeys.length === 0 ? (
              <p className="text-sm text-muted-foreground">No timetable published yet for this course. Please contact admin.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groupKeys.map((k) => {
                  const [tid, sec] = k.split("|");
                  const rows = groups[k];
                  const isSelected = e.selected_teacher_id === tid && (e.selected_section || "") === sec;
                  return (
                    <div key={k} className={`border rounded-lg p-4 space-y-2 ${isSelected ? "border-primary bg-primary/5" : "border-border"}`}>
                      <div className="flex items-center gap-2 font-semibold text-foreground">
                        <User className="h-4 w-4 text-primary" /> {teacherNames[tid] || "Instructor"}{sec ? ` · Section ${sec}` : ""}
                      </div>
                      <table className="w-full text-xs">
                        <tbody>
                          {DAYS.map((d) => {
                            const day = rows.filter((r) => r.day_of_week === d);
                            if (day.length === 0) return null;
                            return (
                              <tr key={d} className="border-t border-border">
                                <td className="py-1 font-medium text-muted-foreground pr-2">{d}</td>
                                <td className="py-1 text-foreground">
                                  {day.map((r) => (
                                    <div key={r.id}>{r.start_time.slice(0,5)}–{r.end_time.slice(0,5)}{r.room ? ` · ${r.room}` : ""}</div>
                                  ))}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      <Button size="sm" disabled={isSelected || saving === e.id + tid + sec} onClick={() => choose(e.id, tid, sec || null)} className="w-full">
                        {isSelected ? "Selected" : saving === e.id + tid + sec ? "Saving…" : "Choose this instructor"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default DepartmentTimeTablePanel;