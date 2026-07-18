import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Calendar } from "lucide-react";

interface Enrollment { id: string; course_id: string; selected_teacher_id: string | null; selected_section: string | null; courses: { name: string } }
interface Slot { id: string; teacher_id: string; course_id: string; section: string | null; day_of_week: string; start_time: string; end_time: string; room: string | null }

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

const StudentTimeTablePanel = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<{ enr: Enrollment; slots: Slot[]; teacherName: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data: enr } = await supabase
        .from("enrollments")
        .select("id, course_id, selected_teacher_id, selected_section, courses(name)")
        .eq("user_id", user.id);
      const list = ((enr || []) as any as Enrollment[]).filter((e) => e.selected_teacher_id);
      const result: any[] = [];
      for (const e of list) {
        const { data: tt } = await (supabase as any)
          .from("teacher_timetables")
          .select("*")
          .eq("course_id", e.course_id)
          .eq("teacher_id", e.selected_teacher_id);
        const slots = ((tt || []) as Slot[]).filter((s) => (e.selected_section || "") === (s.section || ""));
        const { data: profs } = await (supabase as any).rpc("get_public_teacher_profiles", { _teacher_ids: [e.selected_teacher_id] });
        result.push({ enr: e, slots, teacherName: (profs?.[0]?.full_name) || "Instructor" });
      }
      setRows(result);
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <div className="p-6 flex items-center justify-center min-h-[300px]"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  if (rows.length === 0) return (
    <div className="p-6 text-center text-muted-foreground min-h-[200px] flex items-center justify-center">
      <p>No instructor selected yet. Please choose your instructor in <strong>Department TimeTable</strong>.</p>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-bold text-foreground flex items-center gap-2"><Calendar className="h-5 w-5" /> My TimeTable</h2>
      {rows.map(({ enr, slots, teacherName }) => (
        <div key={enr.id} className="bg-card border border-border rounded-lg p-5 space-y-3">
          <div>
            <h3 className="font-bold text-foreground">{enr.courses.name}</h3>
            <p className="text-sm text-muted-foreground">Instructor: {teacherName}{enr.selected_section ? ` · Section ${enr.selected_section}` : ""}</p>
          </div>
          {slots.length === 0 ? (
            <p className="text-sm text-muted-foreground">No timetable slots.</p>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="bg-muted"><th className="p-2 text-left">Day</th><th className="p-2 text-left">Time</th><th className="p-2 text-left">Room</th></tr></thead>
              <tbody>
                {DAYS.flatMap((d) => slots.filter((s) => s.day_of_week === d).map((s) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="p-2 font-medium text-foreground">{d}</td>
                    <td className="p-2 text-muted-foreground">{s.start_time.slice(0,5)} – {s.end_time.slice(0,5)}</td>
                    <td className="p-2 text-muted-foreground">{s.room || "—"}</td>
                  </tr>
                )))}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </div>
  );
};

export default StudentTimeTablePanel;