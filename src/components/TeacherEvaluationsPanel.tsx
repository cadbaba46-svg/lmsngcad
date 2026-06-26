import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ClipboardCheck, Save } from "lucide-react";
import { toast } from "sonner";

interface Course { id: string; name: string; }
interface StudentRow {
  enrollment_id: string;
  user_id: string;
  full_name: string | null;
  roll_number: string | null;
  course_roll_number: string | null;
  evalId?: string;
  mid_marks?: number | null;
  final_marks?: number | null;
  oel_marks?: number | null;
  cep_marks?: number | null;
  report_marks?: number | null;
  dirty?: boolean;
  saving?: boolean;
}

const TOTALS = { mid: 20, final: 30, oel: 20, cep: 20, report: 10 } as const;

const TeacherEvaluationsPanel = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState("");
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("teacher_assignments").select("courses(id, name)").eq("teacher_id", user.id);
      const cs = (data || []).map((d: any) => d.courses).filter(Boolean);
      setCourses(cs);
      if (cs[0]) setCourseId(cs[0].id);
      setLoading(false);
    })();
  }, [user]);

  useEffect(() => {
    if (!courseId) return;
    (async () => {
      setLoading(true);
      const { data: enrolls } = await supabase
        .from("enrollments")
        .select("id, user_id, course_roll_number")
        .eq("course_id", courseId);
      const userIds = (enrolls || []).map((e: any) => e.user_id);
      const [{ data: profs }, { data: evals }] = await Promise.all([
        userIds.length ? supabase.from("profiles").select("user_id, full_name, roll_number").in("user_id", userIds) : Promise.resolve({ data: [] } as any),
        (supabase as any).from("course_evaluations").select("*").in("enrollment_id", (enrolls || []).map((e: any) => e.id)),
      ]);
      const profMap = Object.fromEntries(((profs as any) || []).map((p: any) => [p.user_id, p]));
      const evalMap = Object.fromEntries(((evals as any) || []).map((e: any) => [e.enrollment_id, e]));
      const out: StudentRow[] = (enrolls || []).map((e: any) => {
        const ev = evalMap[e.id] || {};
        const p = profMap[e.user_id] || {};
        return {
          enrollment_id: e.id,
          user_id: e.user_id,
          full_name: p.full_name,
          roll_number: p.roll_number,
          course_roll_number: e.course_roll_number,
          evalId: ev.id,
          mid_marks: ev.mid_marks,
          final_marks: ev.final_marks,
          oel_marks: ev.oel_marks,
          cep_marks: ev.cep_marks,
          report_marks: ev.report_marks,
        };
      });
      setRows(out);
      setLoading(false);
    })();
  }, [courseId]);

  const updateField = (i: number, field: keyof StudentRow, raw: string) => {
    const cap = (TOTALS as any)[String(field).replace("_marks", "")] ?? 100;
    let v: number | null = raw === "" ? null : Number(raw);
    if (v != null && (isNaN(v) || v < 0)) return;
    if (v != null && v > cap) v = cap;
    setRows((p) => p.map((r, idx) => idx === i ? { ...r, [field]: v, dirty: true } : r));
  };

  const save = async (i: number) => {
    const r = rows[i];
    setRows((p) => p.map((x, idx) => idx === i ? { ...x, saving: true } : x));
    const payload = {
      enrollment_id: r.enrollment_id,
      mid_marks: r.mid_marks, mid_total: TOTALS.mid,
      final_marks: r.final_marks, final_total: TOTALS.final,
      oel_marks: r.oel_marks, oel_total: TOTALS.oel,
      cep_marks: r.cep_marks, cep_total: TOTALS.cep,
      report_marks: r.report_marks, report_total: TOTALS.report,
    };
    const res = r.evalId
      ? await (supabase as any).from("course_evaluations").update(payload).eq("id", r.evalId).select("id").maybeSingle()
      : await (supabase as any).from("course_evaluations").insert(payload).select("id").maybeSingle();
    setRows((p) => p.map((x, idx) => idx === i ? { ...x, saving: false, dirty: false, evalId: res.data?.id || x.evalId } : x));
    if (res.error) toast.error(res.error.message); else toast.success(`Saved: ${r.full_name || "student"}`);
  };

  const totalPossible = TOTALS.mid + TOTALS.final + TOTALS.oel + TOTALS.cep + TOTALS.report;
  const pct = (r: StudentRow) => {
    const obt = (r.mid_marks || 0) + (r.final_marks || 0) + (r.oel_marks || 0) + (r.cep_marks || 0) + (r.report_marks || 0);
    return Math.round((obt / totalPossible) * 100);
  };

  if (loading) return <div className="p-6 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-bold flex items-center gap-2"><ClipboardCheck className="h-5 w-5" /> Mark Course Evaluations</h2>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Course:</span>
        <Select value={courseId} onValueChange={setCourseId}>
          <SelectTrigger className="w-72"><SelectValue /></SelectTrigger>
          <SelectContent>{courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {courses.length === 0 ? (
        <p className="text-muted-foreground">No courses assigned to you yet.</p>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Roll No</TableHead>
                <TableHead>Mid /{TOTALS.mid}</TableHead>
                <TableHead>Final /{TOTALS.final}</TableHead>
                <TableHead>OEL /{TOTALS.oel}</TableHead>
                <TableHead>CEP /{TOTALS.cep}</TableHead>
                <TableHead>Report /{TOTALS.report}</TableHead>
                <TableHead>%</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6">No students enrolled.</TableCell></TableRow>
              ) : rows.map((r, i) => (
                <TableRow key={r.enrollment_id}>
                  <TableCell className="font-medium">{r.full_name || "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{r.course_roll_number || r.roll_number || "—"}</TableCell>
                  {(["mid_marks","final_marks","oel_marks","cep_marks","report_marks"] as (keyof StudentRow)[]).map((f) => (
                    <TableCell key={String(f)}>
                      <Input className="w-20" type="number" min={0}
                        value={(r as any)[f] ?? ""}
                        onChange={(e) => updateField(i, f, e.target.value)} />
                    </TableCell>
                  ))}
                  <TableCell className="font-semibold">{pct(r)}%</TableCell>
                  <TableCell>
                    <Button size="sm" disabled={!r.dirty || r.saving} onClick={() => save(i)} className="gap-1">
                      <Save className="h-3 w-3" /> {r.saving ? "…" : "Save"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default TeacherEvaluationsPanel;