import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Loader2, TrendingUp, CheckCircle2, Circle } from "lucide-react";
import { getAttendanceStats } from "@/lib/attendance";

interface Enrollment {
  id: string;
  course_id: string;
  attendance: any[];
  courses: { id: string; name: string; total_weeks: number };
}

const TOTALS = { mid: 20, final: 30, oel: 20, cep: 20, report: 10 };
const TOTAL_POSSIBLE = TOTALS.mid + TOTALS.final + TOTALS.oel + TOTALS.cep + TOTALS.report;

const Row = ({ label, done }: { label: string; done: boolean }) => (
  <div className="flex items-center justify-between border-b border-border py-2 last:border-0">
    <span className="text-sm">{label}</span>
    {done ? <CheckCircle2 className="h-5 w-5 text-sky-500" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
  </div>
);

const CourseTrackPanel = () => {
  const { user } = useAuth();
  const [enrolls, setEnrolls] = useState<Enrollment[]>([]);
  const [selected, setSelected] = useState("");
  const [evalRow, setEvalRow] = useState<any>(null);
  const [surveySubmitted, setSurveySubmitted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("enrollments")
        .select("id, course_id, attendance, courses(id, name, total_weeks)")
        .eq("user_id", user.id)
        .eq("challan_paid", true);
      const list = (data || []) as unknown as Enrollment[];
      setEnrolls(list);
      if (list[0]) setSelected(list[0].id);
      setLoading(false);
    })();
  }, [user]);

  const current = enrolls.find((e) => e.id === selected);

  useEffect(() => {
    if (!current || !user) return;
    (async () => {
      const { data: ev } = await (supabase as any)
        .from("course_evaluations").select("*").eq("enrollment_id", current.id).maybeSingle();
      setEvalRow(ev);
      const { data: survey } = await supabase.from("surveys").select("id").eq("course_id", current.course_id).eq("is_active", true).maybeSingle();
      if (survey?.id) {
        const { data: sub } = await supabase.from("survey_submissions").select("id").eq("survey_id", survey.id).eq("student_id", user.id).maybeSingle();
        setSurveySubmitted(!!sub);
      } else setSurveySubmitted(false);
    })();
  }, [current?.id, user?.id]);

  if (loading) return <div className="p-6 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-bold flex items-center gap-2"><TrendingUp className="h-5 w-5" /> Course Track</h2>
      {enrolls.length === 0 ? (
        <p className="text-muted-foreground">No active courses yet.</p>
      ) : (
        <>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-muted-foreground">Course:</span>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger className="w-72"><SelectValue /></SelectTrigger>
              <SelectContent>
                {enrolls.map((e) => <SelectItem key={e.id} value={e.id}>{e.courses?.name || "—"}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {current && (() => {
            const attendance = getAttendanceStats(current.attendance, current.courses?.total_weeks || 0);
            const has = (m?: number | null) => m != null;
            const items = [
              { label: "Attendance ≥ 75%", done: attendance.totalPercent >= 75 },
              { label: "Mid Assessment", done: has(evalRow?.mid_marks) },
              { label: "Final Assessment", done: has(evalRow?.final_marks) },
              { label: "Open Ended Lab (OEL)", done: has(evalRow?.oel_marks) },
              { label: "Complex Engineering Problem (CEP)", done: has(evalRow?.cep_marks) },
              { label: "Reports", done: has(evalRow?.report_marks) },
              { label: "Course Survey", done: surveySubmitted },
            ];
            const completed = items.filter((i) => i.done).length;
            const progress = Math.round((completed / items.length) * 100);
            return (
              <div className="bg-card border border-border rounded-lg p-5 space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">{current.courses?.name}</h3>
                  <div className="flex items-center gap-3 mt-2">
                    <Progress value={progress} className="flex-1 h-2" />
                    <span className="text-sm font-bold">{progress}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{completed} of {items.length} requirements complete</p>
                </div>
                <div>
                  {items.map((it) => <Row key={it.label} label={it.label} done={it.done} />)}
                </div>
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
};

export default CourseTrackPanel;