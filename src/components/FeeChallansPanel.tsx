import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Search } from "lucide-react";

const FeeChallansPanel = () => {
  const { user } = useAuth();
  const [cnic, setCnic] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchCnic = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select("cnic")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.cnic) setCnic(data.cnic);
      setLoading(false);
    };
    fetchCnic();
  }, [user]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const fmsUrl = cnic
    ? `https://fms.ngcad.org?search=cnic&cnic=${encodeURIComponent(cnic)}`
    : "https://fms.ngcad.org";

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
        <Search className="h-5 w-5" /> Fee Challans
      </h2>
      <p className="text-sm text-muted-foreground">
        Your CNIC: <span className="font-mono font-medium text-foreground">{cnic || "Not set"}</span>
      </p>
      <div className="border border-border rounded-lg overflow-hidden bg-card" style={{ height: "70vh" }}>
        <iframe
          src={fmsUrl}
          className="w-full h-full border-0"
          title="FMS Fee Challans"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
        />
      </div>
    </div>
  );
};

export default FeeChallansPanel;
