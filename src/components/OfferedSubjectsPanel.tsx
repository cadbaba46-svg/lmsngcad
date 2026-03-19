import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { CheckCircle, Loader2 } from "lucide-react";

interface Course {
  id: string;
  name: string;
  price: number;
  description: string;
  total_weeks: number;
  course_content: string[];
}

const OfferedSubjectsPanel = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [coursesRes, enrollmentsRes] = await Promise.all([
        supabase.from("courses").select("*").eq("is_active", true),
        user ? supabase.from("enrollments").select("course_id").eq("user_id", user.id) : Promise.resolve({ data: [] }),
      ]);

      if (coursesRes.data) setCourses(coursesRes.data as Course[]);
      if (enrollmentsRes.data) {
        setEnrolledIds(new Set((enrollmentsRes.data as any[]).map((e: any) => e.course_id)));
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const handleEnroll = async (courseId: string) => {
    if (!user) return;
    setEnrolling(courseId);

    const { error } = await supabase.from("enrollments").insert({
      user_id: user.id,
      course_id: courseId,
      status: "pending",
      challan_generated_at: new Date().toISOString(),
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Enrolled! Your fee challan has been generated. Please pay to activate the course.");
      setEnrolledIds((prev) => new Set(prev).add(courseId));
    }
    setEnrolling(null);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <p className="text-sm text-primary font-medium leading-relaxed">
        Semester Regulations 19(b): The student may add or drop subjects within first three weeks of fall and spring semesters and within first week of summer semester.
      </p>

      <p className="text-sm text-primary font-medium leading-relaxed">
        Note: Upon clicking 'Enroll now', the system will automatically generate your fee challan. Your course will be activated once payment is confirmed.
      </p>

      {/* Course Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course) => {
          const isEnrolled = enrolledIds.has(course.id);
          return (
            <div key={course.id} className="bg-card border border-border rounded-lg p-5 flex flex-col space-y-3">
              <h3 className="text-lg font-bold text-foreground">{course.name}</h3>
              <p className="text-2xl font-bold text-foreground">Rs. {course.price.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground flex-1">{course.description}</p>

              <div className="flex gap-2">
                {isEnrolled ? (
                  <Button variant="outline" disabled className="gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" /> Enrolled
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    disabled={enrolling === course.id}
                    onClick={() => handleEnroll(course.id)}
                  >
                    {enrolling === course.id ? "Enrolling..." : "Enroll now"}
                  </Button>
                )}
              </div>

              <div className="space-y-1 pt-2 border-t border-border">
                {(course.course_content || []).map((item, i) => (
                  <p key={i} className="text-xs text-muted-foreground">{item}</p>
                ))}
              </div>

              <p className="text-xs text-muted-foreground italic border-t border-border pt-2">
                Quick setup, satisfaction guaranteed or your money back.
              </p>
            </div>
          );
        })}
      </div>

      {courses.length === 0 && (
        <p className="text-center text-muted-foreground py-8">No courses available at this time.</p>
      )}
    </div>
  );
};

export default OfferedSubjectsPanel;
