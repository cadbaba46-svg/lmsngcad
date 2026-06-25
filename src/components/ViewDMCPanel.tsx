import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2, Circle, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Enrollment {
  id: string;
  course_id: string;
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
        .select("id, course_id, attendance, courses(id, name, total_weeks)")
        .eq("user_id", user.id)
        .eq("challan_paid", true);
      const list = (data || []) as unknown as Enrollment[];
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

          {current && (() => {
            const att = Array.isArray(current.attendance) ? current.attendance : [];
            const present = att.filter((a: any) => a?.status === "present").length;
            const totalWeeks = current.courses?.total_weeks || 0;
            const attPct = totalWeeks > 0 ? Math.round((present / totalWeeks) * 100) : 0;
            const fmtMark = (m?: number | null, t?: number | null) =>
              m != null && t != null ? `${m}/${t}` : "Not yet marked";
            const has = (m?: number | null) => m != null;
            return (
              <div className="bg-card border border-border rounded-lg p-5">
                <div className="mb-3">
                  <h3 className="text-lg font-semibold text-foreground">{current.courses?.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    Blue tick = requirement met. Attendance & survey update in real time; the rest are marked by your teacher.
                  </p>
                </div>
                <Item
                  label="Attendance (≥ 75%)"
                  met={attPct >= 75}
                  detail={`Current: ${attPct}% (${present}/${totalWeeks})`}
                />
                <Item
                  label="Mid Assessment"
                  met={has(evalRow?.mid_marks)}
                  detail={`Marks: ${fmtMark(evalRow?.mid_marks, evalRow?.mid_total)}`}
                />
                <Item
                  label="Final Assessment"
                  met={has(evalRow?.final_marks)}
                  detail={`Marks: ${fmtMark(evalRow?.final_marks, evalRow?.final_total)}`}
                />
                <Item
                  label="Open Ended Lab (OEL)"
                  met={has(evalRow?.oel_marks)}
                  detail={`Marks: ${fmtMark(evalRow?.oel_marks, evalRow?.oel_total)}`}
                />
                <Item
                  label="Complex Engineering Problem (CEP)"
                  met={has(evalRow?.cep_marks)}
                  detail={`Marks: ${fmtMark(evalRow?.cep_marks, evalRow?.cep_total)}`}
                />
                <Item
                  label="Course Survey"
                  met={surveySubmitted}
                  detail={surveySubmitted ? "Submitted" : "Submit from Surveys For Subjects"}
                />
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
};

export default ViewDMCPanel;