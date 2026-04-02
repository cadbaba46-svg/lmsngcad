import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, User, Mail, Phone, BookOpen, IdCard } from "lucide-react";

const StudentProfilePanel = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [enrollment, setEnrollment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoading(true);
      const [profileRes, enrollmentRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("enrollments").select("*, courses(name)").eq("user_id", user.id).maybeSingle(),
      ]);
      setProfile(profileRes.data);
      setEnrollment(enrollmentRes.data);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return <div className="p-6 text-center text-muted-foreground">Profile not found.</div>;
  }

  const fields = [
    { icon: <User className="h-4 w-4" />, label: "Full Name", value: profile.full_name },
    { icon: <User className="h-4 w-4" />, label: "Father Name", value: profile.father_name },
    { icon: <Mail className="h-4 w-4" />, label: "Email", value: user?.email },
    { icon: <Phone className="h-4 w-4" />, label: "Phone Number", value: profile.phone },
    { icon: <IdCard className="h-4 w-4" />, label: "CNIC Number", value: profile.cnic },
    { icon: <BookOpen className="h-4 w-4" />, label: "Course Selected", value: enrollment?.courses?.name || "None" },
    { icon: <IdCard className="h-4 w-4" />, label: "Registration Number", value: profile.roll_number },
    { icon: <User className="h-4 w-4" />, label: "Department", value: profile.department },
    { icon: <User className="h-4 w-4" />, label: "Semester", value: profile.semester },
  ];

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
        <User className="h-5 w-5" /> Student Profile
      </h2>
      <div className="bg-card border border-border rounded-lg divide-y divide-border">
        {fields.map((field, i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-3">
            <span className="text-muted-foreground">{field.icon}</span>
            <span className="text-sm font-medium text-muted-foreground w-48">{field.label}</span>
            <span className="text-sm text-foreground">{field.value || "—"}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StudentProfilePanel;
