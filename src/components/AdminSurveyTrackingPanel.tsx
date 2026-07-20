import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, ClipboardList, Eye } from "lucide-react";
import { SURVEY_QUESTIONS, RATING_LEGEND } from "@/lib/surveyQuestions";
import AdminSurveysPanel from "@/components/AdminSurveysPanel";

interface Row {
  id: string;
  student_name: string | null;
  roll_number: string | null;
  course_name: string | null;
  course_code: string | null;
  batch_name: string | null;
  teacher_name: string | null;
  submitted_at: string;
}

const ALL = "__all__";

const AdminSurveyTrackingPanel = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [fCourse, setFCourse] = useState<string>(ALL);
  const [fCode, setFCode] = useState<string>(ALL);
  const [fBatch, setFBatch] = useState<string>(ALL);
  const [fTeacher, setFTeacher] = useState<string>(ALL);
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState<Row | null>(null);
  const [viewingResponses, setViewingResponses] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("survey_submissions")
        .select("id, submitted_at, student_name, roll_number, course_name, course_code, batch_name, teacher_name")
        .order("submitted_at", { ascending: false });
      setRows((data as any) || []);
      setLoading(false);
    })();
  }, []);

  const uniq = (key: keyof Row) =>
    Array.from(new Set(rows.map((r) => r[key]).filter(Boolean) as string[])).sort();

  const filtered = useMemo(() => rows.filter((r) =>
    (fCourse === ALL || r.course_name === fCourse) &&
    (fCode === ALL || r.course_code === fCode) &&
    (fBatch === ALL || r.batch_name === fBatch) &&
    (fTeacher === ALL || r.teacher_name === fTeacher) &&
    (!search.trim() || [r.student_name, r.roll_number].some((x) => x?.toLowerCase().includes(search.toLowerCase())))
  ), [rows, fCourse, fCode, fBatch, fTeacher, search]);

  const openView = async (r: Row) => {
    setViewing(r);
    setViewingResponses({});
    const { data } = await supabase.from("survey_responses").select("question_key, rating").eq("submission_id", r.id);
    const map: Record<string, number> = {};
    (data || []).forEach((d: any) => { map[d.question_key] = d.rating; });
    setViewingResponses(map);
  };

  if (loading) return <div className="p-6 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2"><ClipboardList className="h-5 w-5" /> Survey Tracking</h3>

      <AdminSurveysPanel />

      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
        <Input placeholder="Search student / roll no" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select value={fCourse} onValueChange={setFCourse}>
          <SelectTrigger><SelectValue placeholder="Course" /></SelectTrigger>
          <SelectContent><SelectItem value={ALL}>All Courses</SelectItem>{uniq("course_name").map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={fCode} onValueChange={setFCode}>
          <SelectTrigger><SelectValue placeholder="Code" /></SelectTrigger>
          <SelectContent><SelectItem value={ALL}>All Codes</SelectItem>{uniq("course_code").map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={fBatch} onValueChange={setFBatch}>
          <SelectTrigger><SelectValue placeholder="Batch" /></SelectTrigger>
          <SelectContent><SelectItem value={ALL}>All Batches</SelectItem>{uniq("batch_name").map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={fTeacher} onValueChange={setFTeacher}>
          <SelectTrigger><SelectValue placeholder="Teacher" /></SelectTrigger>
          <SelectContent><SelectItem value={ALL}>All Teachers</SelectItem>{uniq("teacher_name").map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student Name</TableHead>
              <TableHead>Roll Number</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Course Code</TableHead>
              <TableHead>Class / Batch</TableHead>
              <TableHead>Teacher</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No submissions yet.</TableCell></TableRow>
            ) : filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.student_name || "—"}</TableCell>
                <TableCell className="font-mono">{r.roll_number || "—"}</TableCell>
                <TableCell>{r.course_name || "—"}</TableCell>
                <TableCell className="font-mono">{r.course_code || "—"}</TableCell>
                <TableCell>{r.batch_name || "—"}</TableCell>
                <TableCell>{r.teacher_name || "—"}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="secondary" className="gap-1" onClick={() => openView(r)}>
                    <Eye className="h-4 w-4" /> View Answers
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Survey Answers</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {viewing?.student_name} ({viewing?.roll_number}) — {viewing?.course_name} · {viewing?.batch_name} · {viewing?.teacher_name}
            </p>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">{RATING_LEGEND}</p>
          <div className="space-y-2 mt-2">
            {SURVEY_QUESTIONS.map((q, i) => (
              <div key={q.key} className="flex items-start justify-between gap-3 border-b border-border py-2">
                <p className="text-sm">{String(i + 1).padStart(2, "0")}. {q.text}</p>
                <span className="text-sm font-bold text-primary">{viewingResponses[q.key] ?? "—"}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSurveyTrackingPanel;