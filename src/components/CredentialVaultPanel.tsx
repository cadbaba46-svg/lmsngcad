import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Shield, Lock, KeyRound, Copy, Search, ShieldCheck, RotateCcw } from "lucide-react";
import QRCode from "qrcode";

type Stage = "loading" | "setup" | "locked" | "unlocked";

interface UserRow {
  user_id: string;
  full_name: string | null;
  email: string | null;
  roll_number: string | null;
  generated_password: string | null;
}

const CredentialVaultPanel = () => {
  const { user } = useAuth();
  const [stage, setStage] = useState<Stage>("loading");
  const [secret, setSecret] = useState<string>("");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [rows, setRows] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const callVault = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("vault-manage", { body });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const beginSetup = async () => {
    const data = await callVault({ action: "setup_init" });
    setSecret(data.secret);
    const url = await QRCode.toDataURL(data.otpauth_url);
    setQrDataUrl(url);
    setStage("setup");
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const status = await callVault({ action: "status" });
        if (status.verified) {
          setStage("locked");
        } else {
          await beginSetup();
        }
      } catch (e: any) {
        toast.error(e.message || "Failed to load vault");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const completeSetup = async () => {
    setVerifying(true);
    try {
      await callVault({ action: "setup_verify", otp });
      toast.success("Two-factor authentication enabled.");
      setOtp("");
      setSecret("");
      setQrDataUrl("");
      setStage("locked");
    } catch (e: any) {
      toast.error(e.message || "Invalid code. Try again.");
    } finally {
      setVerifying(false);
    }
  };

  const unlock = async () => {
    setVerifying(true);
    try {
      const data = await callVault({ action: "unlock", password, otp });
      setRows((data.rows || []) as UserRow[]);
      setPassword("");
      setOtp("");
      setStage("unlocked");
      toast.success("Vault unlocked.");
    } catch (e: any) {
      toast.error(e.message || "Unlock failed");
    } finally {
      setVerifying(false);
    }
  };

  const lock = () => {
    setRows([]);
    setRevealed({});
    setStage("locked");
  };

  const resetTotp = async () => {
    if (!confirm("Reset 2FA? You'll need to scan a new QR code.")) return;
    try {
      const data = await callVault({ action: "reset" });
      setSecret(data.secret);
      const url = await QRCode.toDataURL(data.otpauth_url);
      setQrDataUrl(url);
      setStage("setup");
    } catch (e: any) {
      toast.error(e.message || "Reset failed");
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied");
  };

  const filtered = rows.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (r.full_name || "").toLowerCase().includes(q) ||
      (r.email || "").toLowerCase().includes(q) ||
      (r.roll_number || "").toLowerCase().includes(q)
    );
  });

  if (stage === "loading") {
    return <div className="p-6 text-muted-foreground">Loading vault…</div>;
  }

  if (stage === "setup") {
    return (
      <div className="p-6 max-w-xl mx-auto space-y-5">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Set up Two-Factor Authentication</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          The Credential Vault is protected by your login password and a TOTP code. Scan the QR with Google
          Authenticator, Authy, or any TOTP app, then enter the 6-digit code below.
        </p>
        <div className="bg-card border border-border rounded-lg p-5 space-y-4">
          {qrDataUrl && <img src={qrDataUrl} alt="TOTP QR" className="mx-auto h-56 w-56" />}
          <div className="text-xs text-center text-muted-foreground">
            Or enter this secret manually:
            <div className="font-mono mt-1 text-foreground break-all">{secret}</div>
          </div>
          <div className="space-y-2">
            <Label>6-digit code from your authenticator app</Label>
            <Input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" inputMode="numeric" maxLength={6} />
          </div>
          <Button onClick={completeSetup} disabled={verifying || otp.length < 6} className="w-full">
            {verifying ? "Verifying…" : "Verify & Enable"}
          </Button>
        </div>
      </div>
    );
  }

  if (stage === "locked") {
    return (
      <div className="p-6 max-w-md mx-auto space-y-5">
        <div className="flex items-center gap-2">
          <Lock className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Credential Vault</h2>
        </div>
        <p className="text-sm text-muted-foreground">Enter your admin password and 2FA code to unlock.</p>
        <div className="bg-card border border-border rounded-lg p-5 space-y-4">
          <div className="space-y-2">
            <Label>Admin Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </div>
          <div className="space-y-2">
            <Label>2FA Code</Label>
            <Input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" inputMode="numeric" maxLength={6} />
          </div>
          <Button onClick={unlock} disabled={verifying || !password || otp.length < 6} className="w-full gap-2">
            <ShieldCheck className="h-4 w-4" /> {verifying ? "Verifying…" : "Unlock Vault"}
          </Button>
          <button type="button" onClick={resetTotp} className="w-full text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1">
            <RotateCcw className="h-3 w-3" /> Reset 2FA
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <KeyRound className="h-6 w-6 text-primary" /> Credential Vault
        </h2>
        <Button variant="outline" size="sm" onClick={lock} className="gap-2">
          <Lock className="h-4 w-4" /> Lock
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, roll #" className="pl-9" />
      </div>

      <div className="bg-card border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left">
              <th className="p-3 font-semibold">Name</th>
              <th className="p-3 font-semibold">Email</th>
              <th className="p-3 font-semibold">Roll #</th>
              <th className="p-3 font-semibold">Password</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const shown = revealed[r.user_id];
              const pw = r.generated_password || "—";
              return (
                <tr key={r.user_id} className="border-t border-border">
                  <td className="p-3">{r.full_name || "—"}</td>
                  <td className="p-3 font-mono text-xs">{r.email || "—"}</td>
                  <td className="p-3">{r.roll_number || "—"}</td>
                  <td className="p-3 font-mono">
                    {pw === "—" ? "—" : shown ? pw : "••••••••"}
                  </td>
                  <td className="p-3 text-right space-x-2 whitespace-nowrap">
                    {pw !== "—" && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => setRevealed((p) => ({ ...p, [r.user_id]: !shown }))}>
                          {shown ? "Hide" : "Show"}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => copy(pw)} className="gap-1">
                          <Copy className="h-3 w-3" /> Copy
                        </Button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No users found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Sensitive data. Lock the vault when you're done.
      </p>
    </div>
  );
};

export default CredentialVaultPanel;