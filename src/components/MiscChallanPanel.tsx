import { FileText, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const MiscChallanPanel = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [cnic, setCnic] = useState<string>("");
  const [name, setName] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("cnic, full_name")
        .eq("user_id", user.id)
        .maybeSingle();
      setCnic((data as any)?.cnic ?? "");
      setName((data as any)?.full_name ?? "");
      setLoading(false);
    })();
  }, [user]);

  const params = new URLSearchParams({ mode: "create" });
  if (cnic) params.set("cnic", cnic);
  if (name) params.set("name", name);
  const src = `https://fms.ngcad.org/?${params.toString()}`;

  return (
    <div className="p-6 space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <FileText className="h-5 w-5" /> Create Bill Online
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Generate a miscellaneous challan through the NGCAD Fee Management System.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-10 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <iframe
            key={src}
            src={src}
            title="FMS Create Bill Online"
            className="w-full"
            style={{ height: "1100px", border: "0" }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        )}
      </div>
    </div>
  );
};

export default MiscChallanPanel;
