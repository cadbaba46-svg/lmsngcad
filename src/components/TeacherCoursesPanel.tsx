import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Users, BookOpen } from "lucide-react";

const TeacherCoursesPanel = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("teacher_assignments")
        .select("*, courses(*)")
        .eq("teacher_id", user.id);
      setAssignments(data || []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  if (loading) return <div className="p-6 flex items-center justify-center min-h-[300px]"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
        <BookOpen className="h-5 w-5" /> My Assigned Courses
      </h2>
      {assignments.length === 0 ? (
        <p className="text-muted-foreground">No courses assigned to you yet.</p>
      ) : (
        <div className="grid gap-4">
          {assignments.map((a) => (
            <div key={a.id} className="bg-card border border-border rounded-lg p-4">
              <h3 className="font-bold text-foreground">{a.courses?.name}</h3>
              <p className="text-sm text-muted-foreground">{a.courses?.description}</p>
              <p className="text-sm text-muted-foreground mt-1">Rs. {a.courses?.price?.toLocaleString()} · {a.courses?.total_weeks} weeks</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeacherCoursesPanel;
