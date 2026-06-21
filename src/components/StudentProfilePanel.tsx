import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, User, Mail, Phone, IdCard, MapPin, Users, Calendar, GraduationCap, FileText, ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const StudentProfilePanel = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"profile" | "documents">("profile");

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoading(true);
      const profileRes = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      setProfile(profileRes.data);
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

  const domicile = [profile.city, profile.province].filter(Boolean).join(", ");
  const genderLabel = profile.gender
    ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1)
    : "";
  const documents = (profile.documents && typeof profile.documents === "object")
    ? (profile.documents as Record<string, string>)
    : {};
  const docEntries = Object.entries(documents).filter(([, v]) => typeof v === "string" && v);

  if (view === "documents") {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setView("profile")} className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-5 w-5" /> My Documents
          </h2>
        </div>
        <div className="bg-card border border-border rounded-lg divide-y divide-border">
          {docEntries.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              No documents uploaded from your admission application.
            </div>
          ) : (
            docEntries.map(([key, url]) => (
              <div key={key} className="flex items-center gap-3 px-5 py-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground flex-1 capitalize">
                  {key.replace(/_/g, " ")}
                </span>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                >
                  View <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            ))
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          These documents were submitted through the Admissions Portal. Contact the office if any document needs to be updated.
        </p>
      </div>
    );
  }

  const fields = [
    { icon: <User className="h-4 w-4" />, label: "Full Name", value: profile.full_name },
    { icon: <User className="h-4 w-4" />, label: "Father Name", value: profile.father_name },
    { icon: <Mail className="h-4 w-4" />, label: "Email", value: user?.email },
    { icon: <Phone className="h-4 w-4" />, label: "Phone Number", value: profile.phone },
    { icon: <IdCard className="h-4 w-4" />, label: "CNIC Number", value: profile.cnic },
    { icon: <Calendar className="h-4 w-4" />, label: "Date of Birth", value: profile.dob },
    { icon: <Users className="h-4 w-4" />, label: "Gender", value: genderLabel },
    { icon: <MapPin className="h-4 w-4" />, label: "Domicile", value: domicile },
    { icon: <GraduationCap className="h-4 w-4" />, label: "Qualification", value: profile.qualification },
    { icon: <IdCard className="h-4 w-4" />, label: "Registration Number", value: profile.roll_number },
  ];

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
        <User className="h-5 w-5" /> Student Profile
      </h2>
      <div className="flex justify-center">
        {profile.photo_url ? (
          <img
            src={profile.photo_url}
            alt={profile.full_name || "Student photo"}
            className="h-32 w-32 rounded-full object-cover border-2 border-border shadow-sm"
          />
        ) : (
          <div className="h-32 w-32 rounded-full bg-muted border-2 border-border flex items-center justify-center">
            <User className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="bg-card border border-border rounded-lg divide-y divide-border">
        {fields.map((field, i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-3">
            <span className="text-muted-foreground">{field.icon}</span>
            <span className="text-sm font-medium text-muted-foreground w-48">{field.label}</span>
            <span className="text-sm text-foreground">{field.value || "—"}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-center pt-2">
        <Button
          onClick={() => setView("documents")}
          className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
        >
          <FileText className="h-4 w-4" /> Documents
        </Button>
      </div>
    </div>
  );
};

export default StudentProfilePanel;
