import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ShieldCheck, Smartphone } from "lucide-react";
import QRCode from "qrcode";

type Stage = "loading" | "setup" | "verify" | "ok";

const SESSION_PREFIX = "lms_totp_ok_";
const sessionKey = (uid: string, loginAt?: string | null) => `${SESSION_PREFIX}${uid}_${loginAt || "current"}`;
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12h, matches backend

const clearOldLocalSessions = (uid: string, keepKey?: string) => {
  try {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith(`${SESSION_PREFIX}${uid}_`) && key !== keepKey) {
        localStorage.removeItem(key);
      }
    });
  } catch {}
};

const hasLocalSession = (uid: string, loginAt?: string | null) => {
  try {
    const key = sessionKey(uid, loginAt);
    clearOldLocalSessions(uid, key);
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    const ts = parseInt(raw, 10);
    if (!Number.isFinite(ts)) return false;
    if (Date.now() - ts > SESSION_TTL_MS) {
      localStorage.removeItem(key);
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

const LMSAuthenticatorGate = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [stage, setStage] = useState<Stage>(() =>
    user && hasLocalSession(user.id, user.last_sign_in_at) ? "ok" : "loading"
  );
  const [secret, setSecret] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);

  const call = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("lms-totp-manage", { body });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const beginSetup = async () => {
    const data = await call({ action: "setup_init" });
    setSecret(data.secret);
    setQrDataUrl(await QRCode.toDataURL(data.otpauth_url));
    setStage("setup");
  };

  useEffect(() => {
    if (!user) return;
    // Already verified for this exact login — don't re-prompt on tab switches / remounts.
    if (hasLocalSession(user.id, user.last_sign_in_at)) {
      setStage("ok");
      return;
    }
    (async () => {
      try {
        const status = await call({ action: "status" });
        if (!status.has_secret || !status.verified) {
          await beginSetup();
        } else {
          setStage("verify");
        }
      } catch (e: any) {
        toast.error(e.message || "Authenticator check failed");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const verify = async (action: "setup_verify" | "verify_session") => {
    setBusy(true);
    try {
      await call({ action, otp });
      setOtp("");
      setSecret("");
      setQrDataUrl("");
      if (user) {
        const key = sessionKey(user.id, user.last_sign_in_at);
        clearOldLocalSessions(user.id, key);
        try { localStorage.setItem(key, String(Date.now())); } catch {}
      }
      setStage("ok");
      toast.success("Authenticator verified.");
    } catch (e: any) {
      toast.error(e.message || "Invalid code");
    } finally {
      setBusy(false);
    }
  };

  if (stage === "ok") return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[60] bg-background/95 backdrop-blur flex items-center justify-center p-4 overflow-auto">
      <div className="w-full max-w-md bg-card border border-border rounded-lg p-6 space-y-5 shadow-xl">
        {stage === "loading" && (
          <p className="text-center text-muted-foreground">Checking authenticator…</p>
        )}

        {stage === "setup" && (
          <>
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold text-foreground">Bind Authenticator</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              For your account's security, you must bind a TOTP authenticator (Google Authenticator,
              Authy, etc.) before using the LMS. Scan the QR or enter the secret manually.
            </p>
            {qrDataUrl && <img src={qrDataUrl} alt="LMS TOTP QR" className="mx-auto h-48 w-48" />}
            <div className="text-xs text-center text-muted-foreground">
              Secret: <span className="font-mono text-foreground break-all">{secret}</span>
            </div>
            <div className="space-y-2">
              <Label>6-digit code</Label>
              <Input value={otp} onChange={(e) => setOtp(e.target.value)} inputMode="numeric" maxLength={6} placeholder="123456" />
            </div>
            <Button onClick={() => verify("setup_verify")} disabled={busy || otp.length < 6} className="w-full gap-2">
              <ShieldCheck className="h-4 w-4" /> {busy ? "Verifying…" : "Verify & Enable"}
            </Button>
          </>
        )}

        {stage === "verify" && (
          <>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold text-foreground">Two-Factor Verification</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Enter the 6-digit code from your authenticator app to continue.
            </p>
            <div className="space-y-2">
              <Label>Authenticator code</Label>
              <Input value={otp} onChange={(e) => setOtp(e.target.value)} inputMode="numeric" maxLength={6} placeholder="123456" autoFocus />
            </div>
            <Button onClick={() => verify("verify_session")} disabled={busy || otp.length < 6} className="w-full">
              {busy ? "Verifying…" : "Verify"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default LMSAuthenticatorGate;