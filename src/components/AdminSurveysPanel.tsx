import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { SURVEY_QUESTIONS } from "@/lib/surveyQuestions";

interface CourseRow {
  id: string;
  name: string;
  survey_id: string | null;
  is_active: boolean;
  submission_count: number;
  avg_score: number | null;
}

const AdminSurveysPanel = () => {
  const [rows, setRows] = useState<CourseRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: courses } = await supabase
      .from("courses")
      .select("id, name")
      .order("name");
    const { data: surveys } = await supabase
      .from("surveys")
      .select("id, course_id, is_active");
    const { data: subs } = await supabase
      .from("survey_submissions")
      .select("id, course_id");
    const submissionIds = (subs || []).map((s) => s.id);
    let responses: any[] = [];
    if (submissionIds.length) {
      const { data: r } = await supabase
        .from("survey_responses")
        .select("submission_id, rating")
        .in("submission_id", submissionIds);
      responses = r || [];
    }

    const mapped: CourseRow[] = (courses || []).map((c: any) => {
      const survey = (surveys || []).find((s: any) => s.course_id === c.id);
      const courseSubs = (subs || []).filter((s: any) => s.course_id === c.id);
      const subIds = courseSubs.map((s: any) => s.id);
      const courseResponses = responses.filter((r) => subIds.includes(r.submission_id));
      const avg = courseResponses.length
        ? courseResponses.reduce((a, b) => a + b.rating, 0) / courseResponses.length
        : null;
      return {
        id: c.id,
        name: c.name,
        survey_id: survey?.id ?? null,
        is_active: !!survey?.is_active,
        submission_count: courseSubs.length,
        avg_score: avg,
      };
    });
    setRows(mapped);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const toggle = async (row: CourseRow, value: boolean) => {
    if (row.survey_id) {
      const { error } = await supabase
        .from("surveys")
        .update({ is_active: value })
        .eq("id", row.survey_id);
      if (error) return toast.error(error.message);
    } else if (value) {
      const { error } = await supabase
        .from("surveys")
        .insert({ course_id: row.id, is_active: true });
      if (error) return toast.error(error.message);
    }
    toast.success(value ? "Survey activated" : "Survey deactivated");
    load();
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold flex items-center gap-2">
        <ClipboardList className="h-5 w-5" /> Course & Faculty Surveys
      </h3>
      <p className="text-sm text-muted-foreground">
        Activate evaluation surveys per course and review aggregated ratings ({SURVEY_QUESTIONS.length} questions, 1–5 scale).
      </p>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course</TableHead>
                <TableHead>Survey Active</TableHead>
                <TableHead className="text-right">Submissions</TableHead>
                <TableHead className="text-right">Average Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>
                    <Switch checked={r.is_active} onCheckedChange={(v) => toggle(r, v)} />
                  </TableCell>
                  <TableCell className="text-right">{r.submission_count}</TableCell>
                  <TableCell className="text-right">
                    {r.avg_score === null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <Badge
                        className={
                          r.avg_score >= 4
                            ? "bg-green-600 hover:bg-green-600 text-white"
                            : r.avg_score >= 3
                            ? "bg-yellow-500 hover:bg-yellow-500 text-white"
                            : "bg-red-600 hover:bg-red-600 text-white"
                        }
                      >
                        {r.avg_score.toFixed(2)} / 5
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};

export default AdminSurveysPanel;