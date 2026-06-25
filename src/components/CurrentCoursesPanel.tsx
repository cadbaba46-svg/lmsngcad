import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, BookOpen, Calendar, CheckCircle, XCircle, Lock, User, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import StudentTeacherChat from "@/components/StudentTeacherChat";

interface Enrollment {
  id: string;
  course_id: string;
  status: string;
  challan_paid: boolean;
  challan_generated_at: string | null;
  challan_paid_at: string | null;
  attendance: any[];
  course_roll_number?: string | null;
  courses: {
    id: string;
    name: string;
    price: number;
    description: string;
    total_weeks: number;
    course_content: string[];
  };
}

const statusBadge = (status: string, paid: boolean) => {
  if (!paid) return <Badge variant="destructive" className="gap-1"><Lock className="h-3 w-3" /> Blocked - Payment Required</Badge>;
  switch (status) {
    case "active": return <Badge className="bg-green-600 text-white gap-1"><CheckCircle className="h-3 w-3" /> Active</Badge>;
    case "completed": return <Badge variant="secondary" className="gap-1"><CheckCircle className="h-3 w-3" /> Completed</Badge>;
    case "blocked": return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Blocked</Badge>;
    default: return <Badge variant="outline" className="gap-1">Pending</Badge>;
  }
};

const CurrentCoursesPanel = () => {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [teachersByCourse, setTeachersByCourse] = useState<Record<string, { id: string; full_name: string | null }>>({});
  const [chatFor, setChatFor] = useState<{ courseId: string; teacherId: string; teacherName: string; courseName: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("enrollments")
        .select("*, courses(*)")
        .eq("user_id", user.id);
      const list = (data || []) as unknown as Enrollment[];
      setEnrollments(list);

      const courseIds = Array.from(new Set(list.map((e) => e.course_id)));
      if (courseIds.length > 0) {
        const { data: assigns } = await (supabase as any)
          .from("teacher_assignments")
          .select("course_id, teacher_id")
          .in("course_id", courseIds);
        const teacherIds = Array.from(new Set((assigns || []).map((a: any) => a.teacher_id)));
        let nameById: Record<string, string | null> = {};
        if (teacherIds.length > 0) {
          const { data: tProfiles } = await (supabase as any).rpc("get_public_teacher_profiles", {
            _teacher_ids: teacherIds,
          });
          if (Array.isArray(tProfiles)) {
            nameById = Object.fromEntries(tProfiles.map((p: any) => [p.user_id, p.full_name]));
          } else {
            // Fallback if RPC missing: try profiles direct (may be blocked by RLS)
            const { data: p2 } = await (supabase as any)
              .from("profiles")
              .select("user_id, full_name")
              .in("user_id", teacherIds);
            nameById = Object.fromEntries((p2 || []).map((p: any) => [p.user_id, p.full_name]));
          }
        }
        const map: Record<string, { id: string; full_name: string | null }> = {};
        (assigns || []).forEach((a: any) => {
          if (!map[a.course_id]) {
            map[a.course_id] = { id: a.teacher_id, full_name: nameById[a.teacher_id] ?? null };
          }
        });
        setTeachersByCourse(map);
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (enrollments.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground min-h-[300px] flex items-center justify-center">
        <p>You have not enrolled in any courses yet. Go to <strong>Offered Subjects</strong> to enroll.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
        <BookOpen className="h-5 w-5" /> My Courses
      </h2>

      <div className="grid gap-4">
        {enrollments.map((enrollment) => {
          const course = enrollment.courses;
          const attendanceArr = Array.isArray(enrollment.attendance) ? enrollment.attendance : [];
          const presentCount = attendanceArr.filter((a: any) => a?.status === "present").length;
          const markedCount = attendanceArr.length;
          const runningPercent = markedCount > 0 ? Math.round((presentCount / markedCount) * 100) : 0;
          const totalPercent = course.total_weeks > 0
            ? Math.round((presentCount / course.total_weeks) * 100)
            : 0;

          return (
            <div
              key={enrollment.id}
              className={`bg-card border rounded-lg p-5 space-y-4 ${
                !enrollment.challan_paid ? "border-destructive/50 opacity-75" : "border-border"
              }`}
            >
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-lg font-bold text-foreground">{course.name}</h3>
                  <p className="text-sm text-muted-foreground">{course.description}</p>
                  {enrollment.course_roll_number && (
                    <p className="text-xs mt-1">
                      <span className="text-muted-foreground">Roll Number: </span>
                      <span className="font-mono font-semibold text-foreground">{enrollment.course_roll_number}</span>
                    </p>
                  )}
                </div>
                {statusBadge(enrollment.status, enrollment.challan_paid)}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-4 w-4" /> Total Weeks
                  </p>
                  <p className="font-semibold text-foreground">{course.total_weeks} weeks</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Fee</p>
                  <p className="font-semibold text-foreground">
                    Rs. {course.price.toLocaleString()}
                    {enrollment.challan_paid ? (
                      <span className="text-green-600 text-xs ml-2">Paid</span>
                    ) : (
                      <span className="text-destructive text-xs ml-2">Unpaid</span>
                    )}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Attendance</p>
                  <div className="flex items-center gap-2">
                    <Progress value={totalPercent} className="flex-1 h-2" />
                    <span className="text-xs font-medium text-foreground">{presentCount}/{course.total_weeks}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Running: <span className="font-semibold text-foreground">{runningPercent}%</span> ({presentCount}/{markedCount}) · Total: <span className="font-semibold text-foreground">{totalPercent}%</span>
                  </p>
                </div>
              </div>

              {/* Course Content */}
              {enrollment.challan_paid && (
                <div className="border-t border-border pt-3">
                  <p className="text-sm font-semibold text-foreground mb-2">Course Content</p>
                  <ul className="space-y-1">
                    {(course.course_content || []).map((item, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <CheckCircle className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Instructor + Contact */}
              {enrollment.challan_paid && (() => {
                const teacher = teachersByCourse[course.id];
                return (
                  <div className="border-t border-border pt-3 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-primary" />
                      <span className="text-muted-foreground">Teacher:</span>
                      <span className="font-medium text-foreground">
                        {teacher?.full_name || (teacher ? "Assigned" : "Not yet assigned")}
                      </span>
                    </div>
                    {teacher && user && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="gap-1"
                        onClick={() => setChatFor({
                          courseId: course.id,
                          teacherId: teacher.id,
                          teacherName: teacher.full_name || "Instructor",
                          courseName: course.name,
                        })}
                      >
                        <MessageSquare className="h-4 w-4" /> Contact teacher
                      </Button>
                    )}
                  </div>
                );
              })()}

              {!enrollment.challan_paid && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-md p-3 text-sm text-destructive">
                  <strong>⚠️ Course Locked:</strong> Please pay your fee challan to access course content and DMC.
                </div>
              )}
            </div>
          );
        })}
      </div>

      {chatFor && user && (
        <StudentTeacherChat
          open={!!chatFor}
          onOpenChange={(v) => !v && setChatFor(null)}
          courseId={chatFor.courseId}
          studentId={user.id}
          teacherId={chatFor.teacherId}
          teacherName={chatFor.teacherName}
          courseName={chatFor.courseName}
        />
      )}
    </div>
  );
};

export default CurrentCoursesPanel;
