import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2, Circle, Award, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatAttendanceCount, getAttendanceStats } from "@/lib/attendance";

interface Enrollment {
  id: string;
  course_id: string;
  status: string;
  challan_paid: boolean;
  course_roll_number: string | null;
  attendance: any[];
  courses: { id: string; name: string; total_weeks: number };
}

const Item = ({ label, met, detail }: { label: string; met: boolean; detail?: string }) => (
  <div className="flex items-start justify-between gap-3 border-b border-border py-3 last:border-0">
    <div className="flex items-start gap-2">
      {met ? (
        <CheckCircle2 className="h-5 w-5 text-sky-500 mt-0.5" />
      ) : (
        <Circle className="h-5 w-5 text-muted-foreground mt-0.5" />
      )}
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
      </div>
    </div>
    <Badge variant={met ? "default" : "secondary"} className={met ? "bg-sky-500 hover:bg-sky-500/90" : ""}>
      {met ? "Completed" : "Pending"}
    </Badge>
  </div>
);

const ViewDMCPanel = () => {
  const { user } = useAuth();
  const [enrolls, setEnrolls] = useState<Enrollment[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [evalRow, setEvalRow] = useState<any | null>(null);
  const [surveySubmitted, setSurveySubmitted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("enrollments")
        .select("id, course_id, status, challan_paid, course_roll_number, attendance, courses(id, name, total_weeks)")
        .eq("user_id", user.id)
        .in("status", ["active", "completed"]);
      const list = ((data || []) as unknown as Enrollment[]).sort((a, b) =>
        a.status === b.status ? (a.courses?.name || "").localeCompare(b.courses?.name || "") : a.status === "active" ? -1 : 1
      );
      setEnrolls(list);
      if (list.length && !selected) setSelected(list[0].id);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const current = enrolls.find((e) => e.id === selected);

  useEffect(() => {
    if (!current || !user) { setEvalRow(null); setSurveySubmitted(false); return; }
    (async () => {
      const { data: ev } = await (supabase as any)
        .from("course_evaluations")
        .select("*")
        .eq("enrollment_id", current.id)
        .maybeSingle();
      setEvalRow(ev);

      const { data: survey } = await supabase
        .from("surveys")
        .select("id")
        .eq("course_id", current.course_id)
        .eq("is_active", true)
        .maybeSingle();
      if (survey?.id) {
        const { data: sub } = await supabase
          .from("survey_submissions")
          .select("id")
          .eq("survey_id", survey.id)
          .eq("student_id", user.id)
          .maybeSingle();
        setSurveySubmitted(!!sub);
      } else {
        setSurveySubmitted(false);
      }
    })();
  }, [current?.id, user?.id]);

  if (loading) return <div className="p-6 flex items-center justify-center min-h-[300px]"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
        <Award className="h-5 w-5" /> View DMC
      </h2>

      {enrolls.length === 0 ? (
        <p className="text-muted-foreground">No active courses yet.</p>
      ) : (
        <>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-muted-foreground">Course Track for:</span>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger className="w-72"><SelectValue /></SelectTrigger>
              <SelectContent>
                {enrolls.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.courses?.name || "—"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {enrolls.map((enrollment) => (
              <Button
                key={enrollment.id}
                type="button"
                variant={selected === enrollment.id ? "default" : "outline"}
                className="h-auto justify-start gap-3 p-3 text-left"
                onClick={() => setSelected(enrollment.id)}
              >
                <BookOpen className="h-4 w-4 flex-shrink-0" />
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{enrollment.courses?.name || "—"}</span>
                  <span className="block text-xs opacity-80">{enrollment.status === "completed" ? "Completed" : "Currently enrolled"}</span>
                </span>
              </Button>
            ))}
          </div>

          {current && (() => {
            const attendance = getAttendanceStats(current.attendance, current.courses?.total_weeks || 0);
            const has = (m?: number | null) => m != null;
            // Final % aggregates marked components against their totals.
            const components = [
              { m: evalRow?.mid_marks, t: evalRow?.mid_total ?? 20 },
              { m: evalRow?.final_marks, t: evalRow?.final_total ?? 30 },
              { m: evalRow?.oel_marks, t: evalRow?.oel_total ?? 20 },
              { m: evalRow?.cep_marks, t: evalRow?.cep_total ?? 20 },
              { m: evalRow?.report_marks, t: evalRow?.report_total ?? 10 },
            ];
            const obtained = components.reduce((s, c) => s + (c.m != null ? Number(c.m) : 0), 0);
            const totalMax = components.reduce((s, c) => s + Number(c.t || 0), 0);
            const finalPct = totalMax > 0 ? Math.round((obtained / totalMax) * 100) : 0;
            return (
              <div className="bg-card border border-border rounded-lg p-5">
                <div className="mb-3 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{current.courses?.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      Status: <span className="font-medium text-foreground">{current.status === "completed" ? "Completed" : "Currently enrolled"}</span>
                      {current.course_roll_number ? ` · Roll No: ${current.course_roll_number}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Blue tick = requirement met. Marks are entered by your teacher; only your final percentage is shown.
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Final Percentage</p>
                    <p className="text-2xl font-bold text-primary">{finalPct}%</p>
                  </div>
                </div>
                <Item
                  label="Attendance (≥ 75%)"
                  met={attendance.totalPercent >= 75}
                  detail={`Weighted: ${formatAttendanceCount(attendance.attended)}/${attendance.totalWeeks} · Running: ${attendance.runningPercent}% · Total: ${attendance.totalPercent}% · Present ${attendance.present}, Late ${attendance.late}, Absent ${attendance.absent}`}
                />
                <Item label="Mid Assessment" met={has(evalRow?.mid_marks)} />
                <Item label="Final Assessment" met={has(evalRow?.final_marks)} />
                <Item label="Open Ended Lab (OEL)" met={has(evalRow?.oel_marks)} />
                <Item label="Complex Engineering Problem (CEP)" met={has(evalRow?.cep_marks)} />
                <Item label="Reports" met={has(evalRow?.report_marks)} />
                <Item label="Course Survey" met={surveySubmitted} detail={surveySubmitted ? "Submitted" : "Submit from Surveys For Subjects"} />
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
};

export default ViewDMCPanel;