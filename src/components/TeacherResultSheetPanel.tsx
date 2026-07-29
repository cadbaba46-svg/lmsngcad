import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, FileSpreadsheet, Plus, Trash2, Save, Send, Download } from "lucide-react";
import { toast } from "sonner";

interface Course { id: string; name: string; short_code?: string | null }
interface Assessment { key: string; name: string; total: number; weightage: number }
interface StudentRow {
  enrollment_id: string;
  user_id: string;
  full_name: string | null;
  reg_number: string | null;
  marks: Record<string, number | null>;
}

const GRADE_ORDER = ["A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D"] as const;
const DEFAULT_THRESHOLDS: Record<string, number> = {
  A: 80, "A-": 75, "B+": 70, B: 65, "B-": 64, "C+": 62, C: 60, "C-": 59, "D+": 58, D: 57,
};
const DEFAULT_ASSESSMENTS: Assessment[] = [
  { key: "class_participation", name: "Class Participation", total: 10, weightage: 10 },
  { key: "assignment", name: "Assignment", total: 20, weightage: 20 },
  { key: "mid", name: "Mid", total: 30, weightage: 30 },
  { key: "final", name: "Final", total: 40, weightage: 40 },
];

const REVIEW_ITEMS = [
  "No sit-in student in this course",
  "All assessments are mapped with course content",
  "All marks entered are verified against answer sheets",
  "I hereby acknowledge that the grades awarded are as per Next Gen Cad Academy rules. After submission, grade change is allowed to the competent authority only.",
];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || `a_${Date.now()}`;

const TeacherResultSheetPanel = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState("");
  const [step, setStep] = useState<"upload" | "grading" | "review">("upload");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [sheetId, setSheetId] = useState<string | null>(null);
  const [status, setStatus] = useState("draft");
  const [assessments, setAssessments] = useState<Assessment[]>(DEFAULT_ASSESSMENTS);
  const [thresholds, setThresholds] = useState<Record<string, number>>(DEFAULT_THRESHOLDS);
  const [comments, setComments] = useState("");
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [checks, setChecks] = useState<boolean[]>(REVIEW_ITEMS.map(() => false));

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("teacher_assignments").select("courses(id, name, short_code)").eq("teacher_id", user.id);
      const list: Course[] = ((data || []) as any[]).map((d) => d.courses).filter(Boolean);
      const unique = Array.from(new Map(list.map((c) => [c.id, c])).values());
      setCourses(unique);
      if (unique[0]) setCourseId(unique[0].id);
      setLoading(false);
    })();
  }, [user]);

  const loadSheet = async () => {
    if (!courseId || !user) return;
    setLoading(true);

    const { data: sheet } = await (supabase as any)
      .from("result_sheets").select("*").eq("course_id", courseId).maybeSingle();

    const activeAssessments: Assessment[] = sheet?.assessments?.length ? sheet.assessments : DEFAULT_ASSESSMENTS;
    setSheetId(sheet?.id ?? null);
    setStatus(sheet?.status ?? "draft");
    setAssessments(activeAssessments);
    setThresholds({ ...DEFAULT_THRESHOLDS, ...(sheet?.thresholds || {}) });
    setComments(sheet?.comments ?? "");
    setChecks(REVIEW_ITEMS.map(() => sheet?.status === "submitted"));

    const { data: enrolls } = await supabase
      .from("enrollments").select("id, user_id, course_roll_number").eq("course_id", courseId);
    const userIds = ((enrolls || []) as any[]).map((e) => e.user_id);
    const [{ data: profs }, { data: marks }] = await Promise.all([
      userIds.length
        ? supabase.from("profiles").select("user_id, full_name, roll_number, registration_number").in("user_id", userIds)
        : Promise.resolve({ data: [] } as any),
      sheet?.id
        ? (supabase as any).from("result_sheet_marks").select("*").eq("result_sheet_id", sheet.id)
        : Promise.resolve({ data: [] } as any),
    ]);
    const profMap = Object.fromEntries(((profs as any[]) || []).map((p) => [p.user_id, p]));
    const markMap = Object.fromEntries(((marks as any[]) || []).map((m) => [m.enrollment_id, m]));

    setRows(((enrolls || []) as any[]).map((e) => {
      const p = profMap[e.user_id] || {};
      return {
        enrollment_id: e.id,
        user_id: e.user_id,
        full_name: p.full_name ?? null,
        reg_number: e.course_roll_number || p.registration_number || p.roll_number || null,
        marks: (markMap[e.id]?.marks as Record<string, number | null>) || {},
      };
    }));
    setLoading(false);
  };

  useEffect(() => { loadSheet(); }, [courseId]);

  const totalMarks = useMemo(() => assessments.reduce((s, a) => s + (Number(a.total) || 0), 0), [assessments]);
  const totalWeightage = useMemo(() => assessments.reduce((s, a) => s + (Number(a.weightage) || 0), 0), [assessments]);

  const weightedOf = (row: StudentRow) =>
    assessments.reduce((sum, a) => {
      const obtained = Number(row.marks[a.key] ?? 0);
      const total = Number(a.total) || 0;
      if (!total) return sum;
      return sum + (obtained / total) * (Number(a.weightage) || 0);
    }, 0);

  const gradeOf = (weighted: number) => {
    for (const g of GRADE_ORDER) {
      if (weighted >= (thresholds[g] ?? 0)) return g;
    }
    return "F";
  };

  const gradeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    rows.forEach((r) => {
      const g = gradeOf(Math.round(weightedOf(r) * 10) / 10);
      counts[g] = (counts[g] || 0) + 1;
    });
    return counts;
  }, [rows, thresholds, assessments]);

  const locked = status === "submitted";

  const updateAssessment = (i: number, patch: Partial<Assessment>) =>
    setAssessments((prev) => prev.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));

  const addAssessment = () =>
    setAssessments((prev) => [...prev, { key: `assessment_${prev.length + 1}_${Date.now()}`, name: `Assessment ${prev.length + 1}`, total: 10, weightage: 10 }]);

  const removeAssessment = (i: number) => setAssessments((prev) => prev.filter((_, idx) => idx !== i));

  const setMark = (rowIdx: number, key: string, raw: string, cap: number) => {
    let v: number | null = raw === "" ? null : Number(raw);
    if (v != null && (isNaN(v) || v < 0)) return;
    if (v != null && v > cap) v = cap;
    setRows((prev) => prev.map((r, i) => (i === rowIdx ? { ...r, marks: { ...r.marks, [key]: v } } : r)));
  };

  const persist = async (nextStatus?: string) => {
    if (!user || !courseId) return null;
    setBusy(true);
    const payload: any = {
      course_id: courseId,
      teacher_id: user.id,
      assessments,
      thresholds,
      comments,
    };
    if (nextStatus) {
      payload.status = nextStatus;
      payload.submitted_at = nextStatus === "submitted" ? new Date().toISOString() : null;
    }

    const saved = sheetId
      ? await (supabase as any).from("result_sheets").update(payload).eq("id", sheetId).select("id").maybeSingle()
      : await (supabase as any).from("result_sheets").insert(payload).select("id").maybeSingle();

    if (saved.error || !saved.data?.id) {
      setBusy(false);
      toast.error(saved.error?.message || "Could not save the result sheet");
      return null;
    }
    const id = saved.data.id as string;
    setSheetId(id);

    const markRows = rows.map((r) => {
      const weighted = Math.round(weightedOf(r) * 10) / 10;
      return {
        result_sheet_id: id,
        enrollment_id: r.enrollment_id,
        user_id: r.user_id,
        marks: r.marks,
        total_obtained: assessments.reduce((s, a) => s + Number(r.marks[a.key] ?? 0), 0),
        weighted_score: weighted,
        grade: gradeOf(weighted),
      };
    });

    if (markRows.length) {
      const { error } = await (supabase as any)
        .from("result_sheet_marks")
        .upsert(markRows, { onConflict: "result_sheet_id,enrollment_id" });
      if (error) {
        setBusy(false);
        toast.error(error.message || "Could not save student marks");
        return null;
      }
    }

    if (nextStatus) setStatus(nextStatus);
    setBusy(false);
    toast.success(nextStatus === "submitted" ? "Result submitted to the controller." : "Result sheet saved.");
    return id;
  };

  const downloadCsv = () => {
    const header = ["Registration_No", "Name", ...assessments.map((a) => `${a.name} /${a.total}`), "Weighted", "Grade"];
    const body = rows.map((r) => {
      const weighted = Math.round(weightedOf(r) * 10) / 10;
      return [r.reg_number || "", r.full_name || "", ...assessments.map((a) => r.marks[a.key] ?? ""), weighted, gradeOf(weighted)];
    });
    const csv = [header, ...body].map((line) => line.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `result-sheet-${courses.find((c) => c.id === courseId)?.short_code || "course"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="p-6 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const course = courses.find((c) => c.id === courseId);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-xl font-bold flex items-center gap-2"><FileSpreadsheet className="h-5 w-5" /> Result Sheet</h2>
        <div className="flex items-center gap-2">
          <Select value={courseId} onValueChange={setCourseId}>
            <SelectTrigger className="w-72"><SelectValue placeholder="Select course" /></SelectTrigger>
            <SelectContent>{courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.short_code ? `${c.short_code} — ` : ""}{c.name}</SelectItem>)}</SelectContent>
          </Select>
          <Badge variant={locked ? "default" : "outline"}>{locked ? "Submitted" : "Draft"}</Badge>
        </div>
      </div>

      {courses.length === 0 ? (
        <p className="text-muted-foreground">No courses assigned to you yet.</p>
      ) : (
        <>
          <div className="rounded-lg border border-border bg-card p-4 flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="font-semibold text-foreground">{course?.name}</p>
              <p className="text-xs text-muted-foreground">Total marks: {totalMarks} · Total weightage: {totalWeightage}% · Registered: {rows.length}</p>
            </div>
            <div className="flex gap-1">
              {(["upload", "grading", "review"] as const).map((s) => (
                <Button key={s} size="sm" variant={step === s ? "default" : "outline"} onClick={() => setStep(s)} className="capitalize">{s}</Button>
              ))}
            </div>
          </div>

          {step === "upload" && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-foreground">Assessments</p>
                  <Button size="sm" variant="outline" onClick={addAssessment} disabled={locked} className="gap-1"><Plus className="h-3 w-3" /> Add assessment</Button>
                </div>
                <div className="grid gap-2">
                  {assessments.map((a, i) => (
                    <div key={a.key} className="flex items-center gap-2 flex-wrap">
                      <Input className="w-56" value={a.name} disabled={locked}
                        onChange={(e) => updateAssessment(i, { name: e.target.value, key: a.key || slug(e.target.value) })} />
                      <Input className="w-28" type="number" min={0} value={a.total} disabled={locked}
                        onChange={(e) => updateAssessment(i, { total: Number(e.target.value) })} placeholder="Total" />
                      <Input className="w-28" type="number" min={0} value={a.weightage} disabled={locked}
                        onChange={(e) => updateAssessment(i, { weightage: Number(e.target.value) })} placeholder="Weightage" />
                      <span className="text-xs text-muted-foreground">total / weightage %</span>
                      <Button size="icon" variant="ghost" disabled={locked} onClick={() => removeAssessment(i)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>
                {totalWeightage !== 100 && (
                  <p className="text-xs text-destructive">Total weightage is {totalWeightage}% — it should add up to 100%.</p>
                )}
              </div>

              <div className="rounded-lg border border-border bg-card overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Registration No</TableHead>
                      <TableHead>Name</TableHead>
                      {assessments.map((a) => <TableHead key={a.key}>{a.name} /{a.total}</TableHead>)}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 ? (
                      <TableRow><TableCell colSpan={assessments.length + 2} className="text-center text-muted-foreground py-6">No students registered in this course.</TableCell></TableRow>
                    ) : rows.map((r, i) => (
                      <TableRow key={r.enrollment_id}>
                        <TableCell className="font-mono text-xs">{r.reg_number || "—"}</TableCell>
                        <TableCell className="font-medium">{r.full_name || "—"}</TableCell>
                        {assessments.map((a) => (
                          <TableCell key={a.key}>
                            <Input className="w-20" type="number" min={0} max={a.total} disabled={locked}
                              value={r.marks[a.key] ?? ""}
                              onChange={(e) => setMark(i, a.key, e.target.value, Number(a.total) || 0)} />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => persist()} disabled={busy || locked} className="gap-2"><Save className="h-4 w-4" /> Save marks</Button>
                <Button variant="outline" onClick={downloadCsv} className="gap-2"><Download className="h-4 w-4" /> Download sheet</Button>
                <Button variant="secondary" onClick={() => setStep("grading")}>Next: Grading</Button>
              </div>
            </div>
          )}

          {step === "grading" && (
            <div className="grid gap-4 md:grid-cols-[260px_1fr]">
              <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                <p className="font-semibold text-foreground">Grading thresholds</p>
                {GRADE_ORDER.map((g) => (
                  <div key={g} className="flex items-center gap-2">
                    <span className="w-8 text-sm font-semibold">{g}</span>
                    <Slider className="flex-1" min={0} max={100} step={1} disabled={locked}
                      value={[thresholds[g] ?? 0]}
                      onValueChange={([v]) => setThresholds((p) => ({ ...p, [g]: v }))} />
                    <Input className="w-16 h-8" type="number" min={0} max={100} disabled={locked}
                      value={thresholds[g] ?? 0}
                      onChange={(e) => setThresholds((p) => ({ ...p, [g]: Number(e.target.value) }))} />
                    <span className="w-6 text-xs text-muted-foreground text-right">{gradeCounts[g] || 0}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-sm font-semibold text-destructive">F</span>
                  <span className="text-sm text-destructive">{gradeCounts["F"] || 0}</span>
                </div>
                <Button className="w-full gap-2" onClick={() => persist()} disabled={busy || locked}><Save className="h-4 w-4" /> Save / Re-calculate</Button>
              </div>

              <div className="rounded-lg border border-border bg-card overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Registration No</TableHead>
                      <TableHead>Name</TableHead>
                      {assessments.map((a) => <TableHead key={a.key}>{a.name}</TableHead>)}
                      <TableHead>Total</TableHead>
                      <TableHead>Weightage</TableHead>
                      <TableHead>Grade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => {
                      const weighted = Math.round(weightedOf(r) * 10) / 10;
                      return (
                        <TableRow key={r.enrollment_id}>
                          <TableCell className="font-mono text-xs">{r.reg_number || "—"}</TableCell>
                          <TableCell className="font-medium">{r.full_name || "—"}</TableCell>
                          {assessments.map((a) => <TableCell key={a.key}>{r.marks[a.key] ?? 0}</TableCell>)}
                          <TableCell>{assessments.reduce((s, a) => s + Number(r.marks[a.key] ?? 0), 0)}</TableCell>
                          <TableCell>{weighted}</TableCell>
                          <TableCell><Badge variant={gradeOf(weighted) === "F" ? "destructive" : "secondary"}>{gradeOf(weighted)}</Badge></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {step === "review" && (
            <div className="rounded-lg border border-border bg-card p-5 space-y-4 max-w-3xl">
              <p className="text-sm font-semibold text-destructive">Course survey submission is compulsory before the result can be finalised.</p>
              <div className="space-y-3">
                {REVIEW_ITEMS.map((item, i) => (
                  <label key={item} className="flex items-start gap-3 text-sm">
                    <Checkbox checked={checks[i]} disabled={locked}
                      onCheckedChange={(v) => setChecks((p) => p.map((c, idx) => (idx === i ? Boolean(v) : c)))} />
                    <span>{item}</span>
                  </label>
                ))}
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Share your comments about course content, assessments or any other improvement point.</p>
                <Textarea rows={5} value={comments} disabled={locked} onChange={(e) => setComments(e.target.value)} />
              </div>
              <Button
                className="gap-2"
                disabled={busy || locked || !checks.every(Boolean) || rows.length === 0}
                onClick={() => persist("submitted")}
              >
                <Send className="h-4 w-4" /> {locked ? "Already submitted" : "Accept and send to controller"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TeacherResultSheetPanel;