import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Snowflake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const CourseFreezePanel = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [enrollment, setEnrollment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

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

  const handleGenerateChallan = async () => {
    if (!profile || !enrollment) {
      toast.error("No enrollment found to freeze.");
      return;
    }
    setGenerating(true);
    try {
      // Open FMS create-bill with pre-filled data for course freeze Rs 2000
      const cnic = (profile as any)?.cnic || "";
      const name = profile?.full_name || "";
      const fmsUrl = `https://fms.ngcad.org?option=create-bill&type=course-freeze&amount=2000&cnic=${encodeURIComponent(cnic)}&name=${encodeURIComponent(name)}&course=${encodeURIComponent(enrollment?.courses?.name || "")}`;
      window.open(fmsUrl, "_blank");
      toast.success("Course freeze challan of Rs 2,000 is being generated on FMS.");
    } catch (err: any) {
      toast.error("Failed to generate challan.");
    }
    setGenerating(false);
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
      <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
        <Snowflake className="h-5 w-5" /> Course Freeze
      </h2>

      {!enrollment ? (
        <p className="text-muted-foreground">You are not enrolled in any course.</p>
      ) : (
        <div className="bg-card border border-border rounded-lg p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Student Name:</span>{" "}
              <span className="font-medium text-foreground">{profile?.full_name || "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Registration No:</span>{" "}
              <span className="font-medium text-foreground">{profile?.roll_number || "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Course:</span>{" "}
              <span className="font-medium text-foreground">{enrollment?.courses?.name || "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">CNIC:</span>{" "}
              <span className="font-medium text-foreground">{(profile as any)?.cnic || "—"}</span>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-sm text-muted-foreground mb-3">
              Course freeze fee: <span className="font-bold text-foreground">Rs 2,000</span>
            </p>
            <Button onClick={handleGenerateChallan} disabled={generating} className="gap-2">
              <Snowflake className="h-4 w-4" />
              {generating ? "Generating..." : "Generate Course Freeze Challan (Rs 2,000)"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseFreezePanel;
