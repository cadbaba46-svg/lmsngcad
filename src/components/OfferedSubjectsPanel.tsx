import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { CheckCircle, Loader2, BookOpen } from "lucide-react";

interface Course {
  id: string;
  name: string;
  description: string | null;
  price: number;
  total_weeks: number;
  course_content: string[] | null;
}

const OfferedSubjectsPanel = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: cs }, { data: enr }] = await Promise.all([
      supabase.from("courses").select("id, name, description, price, total_weeks, course_content").eq("is_active", true).order("name"),
      supabase.from("enrollments").select("course_id").eq("user_id", user.id),
    ]);
    setCourses((cs as any) || []);
    setEnrolledIds(new Set(((enr as any) || []).map((e: any) => e.course_id)));
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const enroll = async (courseId: string) => {
    if (!user) return;
    setEnrolling(courseId);
    const { error } = await supabase.from("enrollments").insert({ user_id: user.id, course_id: courseId, status: "pending" });
    setEnrolling(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Enrolled! A fee challan has been generated.");
    load();
  };

  if (loading) return <div className="p-6 flex items-center justify-center min-h-[300px]"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="p-6 space-y-4">
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-sm text-foreground">
        <p><strong>Semester Regulations 19(b):</strong> The student may add or drop subjects within the first three weeks.</p>
        <p className="mt-2 text-muted-foreground">Upon clicking 'Enroll now', the system will automatically generate your fee challan. Your course will be activated once payment is confirmed.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {courses.map((c) => {
          const enrolled = enrolledIds.has(c.id);
          return (
            <div key={c.id} className="bg-card border border-border rounded-lg p-5 space-y-3">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold text-foreground">{c.name}</h3>
              </div>
              <p className="text-xl font-bold text-foreground">Rs. {c.price.toLocaleString()}</p>
              {c.description && <p className="text-sm text-muted-foreground">{c.description}</p>}
              {enrolled ? (
                <Button size="sm" disabled className="gap-1"><CheckCircle className="h-4 w-4" /> Enrolled</Button>
              ) : (
                <Button size="sm" onClick={() => enroll(c.id)} disabled={enrolling === c.id}>
                  {enrolling === c.id ? "Enrolling…" : "Enroll now"}
                </Button>
              )}
              {c.course_content && c.course_content.length > 0 && (
                <ul className="pt-2 border-t border-border space-y-1">
                  {c.course_content.slice(0, 5).map((item, i) => (
                    <li key={i} className="text-xs text-muted-foreground">• {item}</li>
                  ))}
                </ul>
              )}
              <p className="text-xs italic text-muted-foreground">Quick setup, satisfaction guaranteed or your money back.</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OfferedSubjectsPanel;