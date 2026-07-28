import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, BookOpenCheck, Save } from "lucide-react";
import { toast } from "sonner";
import { courseContentKindLabel, parseCourseContent, type CourseContentItem } from "@/lib/courseContent";

interface EnrollmentRow {
  id: string;
  course_id: string;
  courses: {
    id: string;
    name: string;
    course_content: unknown;
  } | null;
}

interface SavedSelection {
  enrollment_id: string;
  content_key: string;
}

const ElectiveCourseSelectionPanel = () => {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [selected, setSelected] = useState<Record<string, Set<string>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: enrollmentRows }, { data: selectionRows }] = await Promise.all([
      supabase
        .from("enrollments")
        .select("id, course_id, courses(id, name, course_content)")
        .eq("user_id", user.id)
        .in("status", ["active", "completed"]),
      (supabase as any)
        .from("course_content_selections")
        .select("enrollment_id, content_key")
        .eq("user_id", user.id),
    ]);

    const rows = ((enrollmentRows || []) as unknown as EnrollmentRow[]).filter((row) => row.courses);
    const next: Record<string, Set<string>> = {};
    ((selectionRows || []) as SavedSelection[]).forEach((row) => {
      next[row.enrollment_id] = next[row.enrollment_id] || new Set<string>();
      next[row.enrollment_id].add(row.content_key);
    });
    setEnrollments(rows);
    setSelected(next);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const coursesWithElectives = useMemo(() => enrollments.map((enrollment) => {
    const config = parseCourseContent(enrollment.courses?.course_content);
    return {
      enrollment,
      compulsory: config.items.filter((item) => item.requirement === "compulsory"),
      electives: config.items.filter((item) => item.requirement === "elective"),
      required: Math.min(config.elective_required_count, config.items.filter((item) => item.requirement === "elective").length),
    };
  }), [enrollments]);

  const toggle = (enrollmentId: string, itemId: string) => {
    setSelected((prev) => {
      const current = new Set(prev[enrollmentId] || []);
      if (current.has(itemId)) current.delete(itemId);
      else current.add(itemId);
      return { ...prev, [enrollmentId]: current };
    });
  };

  const save = async (enrollment: EnrollmentRow, electives: CourseContentItem[], required: number) => {
    if (!user || !enrollment.courses) return;
    const chosen = Array.from(selected[enrollment.id] || []);
    if (chosen.length < required) {
      toast.error(`Select at least ${required} elective item${required === 1 ? "" : "s"}.`);
      return;
    }

    setSaving(enrollment.id);
    const { error: deleteError } = await (supabase as any)
      .from("course_content_selections")
      .delete()
      .eq("user_id", user.id)
      .eq("enrollment_id", enrollment.id);

    if (deleteError) {
      setSaving(null);
      toast.error(deleteError.message || "Could not update elective selection");
      return;
    }

    const rows = chosen.map((contentKey) => {
      const item = electives.find((option) => option.id === contentKey);
      return {
        user_id: user.id,
        enrollment_id: enrollment.id,
        course_id: enrollment.course_id,
        content_key: contentKey,
        content_title: item?.title || contentKey,
      };
    });

    const { error: insertError } = rows.length > 0
      ? await (supabase as any).from("course_content_selections").insert(rows)
      : { error: null };
    setSaving(null);

    if (insertError) {
      toast.error(insertError.message || "Could not save elective selection");
      return;
    }
    toast.success("Elective course selection saved.");
    load();
  };

  if (loading) {
    return <div className="p-6 flex items-center justify-center min-h-[300px]"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-6 space-y-5">
      <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
        <BookOpenCheck className="h-5 w-5" /> Elective Course Selection
      </h2>

      {coursesWithElectives.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground">
          No active course is available for elective selection.
        </div>
      ) : (
        coursesWithElectives.map(({ enrollment, compulsory, electives, required }) => {
          const chosen = selected[enrollment.id] || new Set<string>();
          return (
            <div key={enrollment.id} className="rounded-lg border border-border bg-card p-5 space-y-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="font-bold text-foreground">{enrollment.courses?.name}</h3>
                  <p className="text-sm text-muted-foreground">Required electives: {required}</p>
                </div>
                <Badge variant={chosen.size >= required ? "default" : "outline"}>{chosen.size}/{required} selected</Badge>
              </div>

              {compulsory.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">Compulsory content</p>
                  <div className="grid gap-2">
                    {compulsory.map((item) => (
                      <div key={item.id} className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{courseContentKindLabel(item.kind)}:</span> {item.title}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {electives.length === 0 ? (
                <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                  No elective syllabus, topics, content, or software has been added for this course.
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">Select elective content</p>
                  <div className="grid gap-2">
                    {electives.map((item) => (
                      <label key={item.id} className="flex items-start gap-3 rounded-md border border-border p-3 cursor-pointer hover:bg-muted/50">
                        <Checkbox checked={chosen.has(item.id)} onCheckedChange={() => toggle(enrollment.id, item.id)} />
                        <span className="text-sm">
                          <span className="font-medium text-foreground">{item.title}</span>
                          <span className="block text-xs text-muted-foreground">{courseContentKindLabel(item.kind)}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={() => save(enrollment, electives, required)}
                disabled={saving === enrollment.id || electives.length === 0}
                className="gap-2"
              >
                <Save className="h-4 w-4" /> {saving === enrollment.id ? "Saving…" : "Save selection"}
              </Button>
            </div>
          );
        })
      )}
    </div>
  );
};

export default ElectiveCourseSelectionPanel;