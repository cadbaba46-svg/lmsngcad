import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { CheckCircle, Loader2, User } from "lucide-react";

interface Enrollment {
  id: string;
  course_id: string;
  batch_id: string | null;
  status: string;
  courses: { id: string; name: string; description: string; price: number };
}

interface Batch {
  id: string;
  name: string;
  section: string | null;
  teacher_id: string | null;
  course_id: string;
  teacherName?: string;
}

const OfferedSubjectsPanel = () => {
  const { user } = useAuth();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data: enr } = await supabase
      .from("enrollments")
      .select("id, course_id, batch_id, status, courses(id, name, description, price)")
      .eq("user_id", user.id)
      .maybeSingle();
    setEnrollment((enr as any) || null);

    if (enr?.course_id) {
      const { data: bs } = await (supabase as any)
        .from("batches")
        .select("id, name, section, teacher_id, course_id")
        .eq("course_id", enr.course_id)
        .eq("is_active", true)
        .order("section", { ascending: true });
      const list = (bs || []) as Batch[];
      const teacherIds = Array.from(new Set(list.map((b) => b.teacher_id).filter(Boolean))) as string[];
      let nameById: Record<string, string> = {};
      if (teacherIds.length) {
        const { data: profs } = await (supabase as any).rpc("get_public_teacher_profiles", { _teacher_ids: teacherIds });
        nameById = Object.fromEntries((profs || []).map((p: any) => [p.user_id, p.full_name || "Instructor"]));
      }
      setBatches(list.map((b) => ({ ...b, teacherName: b.teacher_id ? nameById[b.teacher_id] : undefined })));
    } else {
      setBatches([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const chooseBatch = async (batchId: string) => {
    if (!enrollment) return;
    setSaving(batchId);
    const { error } = await supabase.from("enrollments").update({ batch_id: batchId }).eq("id", enrollment.id);
    setSaving(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Registered with your chosen teacher.");
    load();
  };

  if (loading) return <div className="p-6 flex items-center justify-center min-h-[300px]"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  if (!enrollment) {
    return (
      <div className="p-6 text-center text-muted-foreground min-h-[300px] flex items-center justify-center">
        <p>You have no enrolled course yet. Enrollments are created from the Admissions Portal after fee payment.</p>
      </div>
    );
  }

  const course = enrollment.courses;
  const chosenBatch = batches.find((b) => b.id === enrollment.batch_id);

  return (
    <div className="p-6 space-y-6">
      <div className="bg-card border border-border rounded-lg p-5 space-y-2">
        <h2 className="text-xl font-bold text-foreground">Your Enrolled Course</h2>
        <p className="text-lg font-semibold text-foreground">{course.name}</p>
        <p className="text-sm text-muted-foreground">{course.description}</p>
      </div>

      {chosenBatch ? (
        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-5 space-y-2">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-semibold">
            <CheckCircle className="h-5 w-5" /> You are registered
          </div>
          <p className="text-sm text-foreground">
            Teacher: <span className="font-semibold">{chosenBatch.teacherName || "Assigned"}</span>
            {chosenBatch.section && <> · Section {chosenBatch.section}</>} · {chosenBatch.name}
          </p>
          <p className="text-xs text-muted-foreground">Once registered, your choice is locked. Contact admin to change.</p>
        </div>
      ) : (
        <>
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-sm text-foreground">
            Choose your instructor below to unlock your course, DMC, and other features.
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {batches.length === 0 ? (
              <p className="text-muted-foreground col-span-full text-center py-8">
                No active teachers/sections available yet. Please contact admin.
              </p>
            ) : batches.map((b) => (
              <div key={b.id} className="bg-card border border-border rounded-lg p-5 flex flex-col space-y-3">
                <div className="flex items-center gap-2 text-foreground">
                  <User className="h-5 w-5 text-primary" />
                  <span className="font-bold">{b.teacherName || "Instructor"}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {b.name}{b.section ? ` · Section ${b.section}` : ""}
                </p>
                <Button
                  size="sm"
                  onClick={() => chooseBatch(b.id)}
                  disabled={saving === b.id}
                >
                  {saving === b.id ? "Registering…" : "Register with this teacher"}
                </Button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default OfferedSubjectsPanel;