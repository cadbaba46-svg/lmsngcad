import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Users } from "lucide-react";

const TeacherStudentsPanel = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setLoading(true);
      const { data: assignments } = await (supabase as any)
        .from("teacher_assignments")
        .select("course_id, courses(name)")
        .eq("teacher_id", user.id);

      if (!assignments || assignments.length === 0) {
        setStudents([]);
        setLoading(false);
        return;
      }

      const courseIds = assignments.map((a: any) => a.course_id);

      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("*")
        .in("course_id", courseIds);

      if (!enrollments || enrollments.length === 0) {
        setStudents([]);
        setLoading(false);
        return;
      }

      // Get profiles for enrolled users
      const userIds = enrollments.map((e) => e.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, roll_number, department, semester")
        .in("user_id", userIds);

      const profileMap = Object.fromEntries((profiles || []).map((p) => [p.user_id, p]));
      const courseMap = Object.fromEntries(assignments.map((a: any) => [a.course_id, a.courses?.name]));

      setStudents(
        enrollments.map((e) => ({
          ...e,
          course_name: courseMap[e.course_id],
          student_name: profileMap[e.user_id]?.full_name,
          roll_number: profileMap[e.user_id]?.roll_number,
          department: profileMap[e.user_id]?.department,
        }))
      );
      setLoading(false);
    };
    fetch();
  }, [user]);

  if (loading) return <div className="p-6 flex items-center justify-center min-h-[300px]"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
        <Users className="h-5 w-5" /> My Students
      </h2>
      {students.length === 0 ? (
        <p className="text-muted-foreground">No students enrolled in your courses yet.</p>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted">
                <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Roll Number</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Course</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Department</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Payment</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-t border-border hover:bg-muted/50">
                  <td className="p-3 text-foreground">{s.student_name || "—"}</td>
                  <td className="p-3 text-muted-foreground">{s.roll_number || "—"}</td>
                  <td className="p-3 text-muted-foreground">{s.course_name || "—"}</td>
                  <td className="p-3 text-muted-foreground">{s.department || "—"}</td>
                  <td className="p-3">
                    {s.challan_paid ? (
                      <span className="text-green-600 font-medium">Paid</span>
                    ) : (
                      <span className="text-destructive font-medium">Unpaid</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TeacherStudentsPanel;
