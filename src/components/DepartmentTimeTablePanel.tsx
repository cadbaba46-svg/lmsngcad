import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2, Calendar, User, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TimetableSlot { id: string; day_of_week: string; start_time: string; end_time: string; room: string | null }
interface TimetableOption {
  enrollment_id: string;
  course_id: string;
  course_name: string;
  selected_teacher_id: string | null;
  selected_section: string | null;
  teacher_id: string;
  teacher_name: string;
  section: string | null;
  slots: TimetableSlot[];
}

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

const DepartmentTimeTablePanel = () => {
  const { user } = useAuth();
  const [options, setOptions] = useState<TimetableOption[]>([]);
  const [courseCount, setCourseCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("get_student_timetable_options");
    if (error) {
      toast.error(error.message || "Department TimeTable failed to load");
      setOptions([]);
      setCourseCount(0);
      setLoading(false);
      return;
    }
    const rows = ((data || []) as TimetableOption[]).map((row) => ({ ...row, slots: row.slots || [] }));
    setOptions(rows);
    setCourseCount(new Set(rows.map((row) => row.enrollment_id)).size);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const choose = async (enrollmentId: string, teacherId: string, section: string | null) => {
    setSaving(enrollmentId + teacherId + (section || ""));
    const { error } = await (supabase as any).rpc("choose_student_instructor", {
      _enrollment_id: enrollmentId,
      _teacher_id: teacherId,
      _section: section,
    });
    setSaving(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Instructor selected. See Student TimeTable.");
    load();
  };

  if (loading) return <div className="p-6 flex items-center justify-center min-h-[300px]"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (courseCount === 0) return <div className="p-6 text-center text-muted-foreground">You have no enrolled courses yet.</div>;

  const groupedByEnrollment = options.reduce<Record<string, TimetableOption[]>>((acc, option) => {
    (acc[option.enrollment_id] = acc[option.enrollment_id] || []).push(option);
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-bold text-foreground flex items-center gap-2"><Calendar className="h-5 w-5" /> Department TimeTable</h2>
      {Object.entries(groupedByEnrollment).map(([enrollmentId, courseOptions]) => {
        const first = courseOptions[0];
        return (
          <div key={enrollmentId} className="bg-card border border-border rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-bold text-foreground">{first.course_name}</h3>
              {first.selected_teacher_id && (
                <span className="text-xs text-green-700 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Selected instructor</span>
              )}
            </div>
            {courseOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No timetable published yet for this course. Please contact admin.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {courseOptions.map((option) => {
                  const sec = option.section || "";
                  const isSelected = option.selected_teacher_id === option.teacher_id && (option.selected_section || "") === sec;
                  return (
                    <div key={`${option.teacher_id}-${sec}`} className={`border rounded-lg p-4 space-y-2 ${isSelected ? "border-primary bg-primary/5" : "border-border"}`}>
                      <div className="flex items-center gap-2 font-semibold text-foreground">
                        <User className="h-4 w-4 text-primary" /> {option.teacher_name || "Instructor"}{sec ? ` · Section ${sec}` : ""}
                      </div>
                      {option.slots.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Instructor assigned. Timetable slots are not published yet.</p>
                      ) : (
                        <table className="w-full text-xs">
                          <tbody>
                            {DAYS.map((d) => {
                              const day = option.slots.filter((r) => r.day_of_week === d);
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
                      )}
                      <Button size="sm" disabled={isSelected || saving === enrollmentId + option.teacher_id + sec} onClick={() => choose(enrollmentId, option.teacher_id, sec || null)} className="w-full">
                        {isSelected ? "Selected" : saving === enrollmentId + option.teacher_id + sec ? "Saving…" : "Choose this instructor"}
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