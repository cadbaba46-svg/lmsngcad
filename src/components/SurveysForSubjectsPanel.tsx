import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClipboardList, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { SURVEY_QUESTIONS, RATING_LEGEND } from "@/lib/surveyQuestions";

interface Row {
  enrollment_id: string;
  course_id: string;
  course_name: string;
  status: string;
  survey_id: string | null;
  submitted: boolean;
}

const SurveysForSubjectsPanel = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Row | null>(null);
  const [thanks, setThanks] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data: enrolls } = await supabase
      .from("enrollments")
      .select("id, course_id, status, courses(name)")
      .eq("user_id", user.id);

    const courseIds = (enrolls || []).map((e: any) => e.course_id);
    let surveys: any[] = [];
    let submitted: any[] = [];
    if (courseIds.length) {
      const { data: s } = await supabase
        .from("surveys")
        .select("id, course_id, is_active")
        .in("course_id", courseIds)
        .eq("is_active", true);
      surveys = s || [];
      const surveyIds = surveys.map((x) => x.id);
      if (surveyIds.length) {
        const { data: subs } = await supabase
          .from("survey_submissions")
          .select("survey_id")
          .eq("student_id", user.id)
          .in("survey_id", surveyIds);
        submitted = subs || [];
      }
    }

    const mapped: Row[] = (enrolls || []).map((e: any) => {
      const survey = surveys.find((s) => s.course_id === e.course_id);
      return {
        enrollment_id: e.id,
        course_id: e.course_id,
        course_name: e.courses?.name || "Unknown course",
        status: e.status,
        survey_id: survey?.id ?? null,
        submitted: !!(survey && submitted.find((sub) => sub.survey_id === survey.id)),
      };
    });
    setRows(mapped);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <ClipboardList className="h-5 w-5" /> Surveys For Subjects
      </h2>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">
            No enrolled courses available for evaluation.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Survey Submission Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.enrollment_id}>
                  <TableCell className="font-medium">{r.course_name}</TableCell>
                  <TableCell className="capitalize text-muted-foreground">{r.status}</TableCell>
                  <TableCell className="text-right">
                    {!r.survey_id ? (
                      <Badge variant="outline">No active survey</Badge>
                    ) : r.submitted ? (
                      <Badge className="bg-primary hover:bg-primary text-primary-foreground">
                        Survey Filled
                      </Badge>
                    ) : (
                      <Button size="sm" variant="secondary" onClick={() => setOpen(r)}>
                        Fill Survey
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <SurveyDialog
        row={open}
        onClose={() => setOpen(null)}
        onSubmitted={() => {
          setOpen(null);
          setThanks(true);
          load();
        }}
      />

      <Dialog open={thanks} onOpenChange={setThanks}>
        <DialogContent>
          <div className="text-center py-6">
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" />
            <h3 className="text-2xl font-bold">Thank you!</h3>
            <Button
              variant="link"
              className="mt-3 text-primary"
              onClick={() => setThanks(false)}
            >
              Go Back To Surveys
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const SurveyDialog = ({
  row,
  onClose,
  onSubmitted,
}: {
  row: Row | null;
  onClose: () => void;
  onSubmitted: () => void;
}) => {
  const { user } = useAuth();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setAnswers({});
  }, [row?.survey_id]);

  const submit = async () => {
    if (!row || !row.survey_id || !user) return;
    const missing = SURVEY_QUESTIONS.find((q) => !answers[q.key]);
    if (missing) {
      toast.error("Please answer all questions before submitting.");
      return;
    }
    setSubmitting(true);
    const { data: sub, error } = await supabase
      .from("survey_submissions")
      .insert({ survey_id: row.survey_id, course_id: row.course_id, student_id: user.id })
      .select("id")
      .single();
    if (error || !sub) {
      toast.error(error?.message || "Failed to submit");
      setSubmitting(false);
      return;
    }
    const responses = SURVEY_QUESTIONS.map((q) => ({
      submission_id: sub.id,
      question_key: q.key,
      rating: answers[q.key],
    }));
    const { error: rErr } = await supabase.from("survey_responses").insert(responses);
    setSubmitting(false);
    if (rErr) {
      toast.error(rErr.message);
      return;
    }
    onSubmitted();
  };

  return (
    <Dialog open={!!row} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Course and Faculty Evaluation Survey</DialogTitle>
          <p className="text-sm text-muted-foreground">{row?.course_name}</p>
        </DialogHeader>
        <p className="text-sm font-medium">{RATING_LEGEND}</p>

        <div className="space-y-6 mt-2">
          {SURVEY_QUESTIONS.map((q, idx) => (
            <div key={q.key} className="border-b border-border pb-4">
              <p className="font-medium mb-2">
                {String(idx + 1).padStart(2, "0")}. {q.text}{" "}
                <span className="text-destructive">*</span>
              </p>
              <div className="flex flex-wrap gap-4">
                {[5, 4, 3, 2, 1].map((v) => (
                  <label key={v} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name={q.key}
                      value={v}
                      checked={answers[q.key] === v}
                      onChange={() => setAnswers((p) => ({ ...p, [q.key]: v }))}
                      className="h-4 w-4"
                    />
                    {v}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit survey"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SurveysForSubjectsPanel;