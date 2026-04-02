import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { RefreshCw, Check, ShieldCheck } from "lucide-react";

function generateCaptcha() {
  const a = Math.floor(Math.random() * 20) + 1;
  const b = Math.floor(Math.random() * 20) + 1;
  return { question: `${a} + ${b} = ?`, answer: a + b };
}

const Login = () => {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [captcha, setCaptcha] = useState(generateCaptcha);
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaVerified, setCaptchaVerified] = useState(false);

  const refreshCaptcha = useCallback(() => {
    setCaptcha(generateCaptcha());
    setCaptchaInput("");
    setCaptchaVerified(false);
  }, []);

  const verifyCaptcha = () => {
    if (parseInt(captchaInput) === captcha.answer) {
      setCaptchaVerified(true);
      toast.success("CAPTCHA verified!");
    } else {
      toast.error("Incorrect answer. Try again.");
      refreshCaptcha();
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captchaVerified) {
      toast.error("Please verify the CAPTCHA first.");
      return;
    }
    setLoading(true);

    try {
      let email = identifier;
      if (!identifier.includes("@")) {
        const { data, error } = await supabase.functions.invoke("login-by-username", {
          body: { identifier, password },
        });
        if (error || data?.error) {
          toast.error(data?.error || "Invalid username or password");
          setLoading(false);
          refreshCaptcha();
          return;
        }
        email = data.email;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
        refreshCaptcha();
      } else {
        navigate("/dashboard");
      }
    } catch {
      toast.error("Login failed. Please try again.");
      refreshCaptcha();
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captchaVerified) {
      toast.error("Please verify the CAPTCHA first.");
      return;
    }
    setLoading(true);

    try {
      const { error } = await supabase.functions.invoke("reset-by-username", {
        body: {
          identifier,
          redirect_to: `${window.location.origin}/reset-password`,
        },
      });

      if (error) {
        toast.error("Failed to send reset link. Please try again.");
      } else {
        toast.success("If an account exists, a password reset link has been sent to the registered email.");
        setMode("login");
      }
    } catch {
      toast.error("Failed to send reset link. Please try again.");
    }

    setLoading(false);
    refreshCaptcha();
  };

  // Inline captcha block to prevent re-mount on each keystroke
  const captchaBlock = (
    <div className="bg-muted border border-border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-primary" /> Verify you&apos;re human
        </Label>
        <button type="button" onClick={refreshCaptcha} className="text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
      <p className="text-lg font-mono font-bold text-foreground tracking-wider">{captcha.question}</p>
      <div className="flex gap-2">
        <Input
          type="number"
          placeholder="Your answer"
          value={captchaInput}
          onChange={(e) => { setCaptchaInput(e.target.value); setCaptchaVerified(false); }}
          disabled={captchaVerified}
          required
        />
        <Button
          type="button"
          size="sm"
          onClick={verifyCaptcha}
          disabled={captchaVerified || !captchaInput}
          className={captchaVerified
            ? "bg-green-600 hover:bg-green-700 gap-1 text-white"
            : "bg-primary hover:bg-primary/90 gap-1 text-primary-foreground"
          }
        >
          <Check className="h-4 w-4" />
          {captchaVerified ? "Verified" : "Check"}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {mode === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground text-center mb-4">Log in</h2>
              <div className="space-y-2">
                <Label htmlFor="login-identifier">Email or Roll Number</Label>
                <Input
                  id="login-identifier"
                  type="text"
                  placeholder="Enter email or roll number"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <Input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>

              {captchaBlock}

              <div className="flex items-center justify-between">
                <Button type="submit" disabled={loading || !captchaVerified} className={!captchaVerified ? "opacity-50" : ""}>
                  {loading ? "Logging in..." : "Log in"}
                </Button>
                <button
                  type="button"
                  onClick={() => { setMode("forgot"); refreshCaptcha(); }}
                  className="text-sm text-primary hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
            </form>
          )}

          {mode === "forgot" && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground text-center mb-4">Reset Password</h2>
              <p className="text-sm text-muted-foreground text-center">
                Enter your email address or roll number and we'll send a reset link to the registered email.
              </p>
              <div className="space-y-2">
                <Label htmlFor="reset-identifier">Email or Roll Number</Label>
                <Input
                  id="reset-identifier"
                  type="text"
                  placeholder="Enter email or roll number"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
              </div>

              {captchaBlock}

              <div className="flex items-center justify-between">
                <Button type="submit" disabled={loading || !captchaVerified} className={!captchaVerified ? "opacity-50" : ""}>
                  {loading ? "Sending..." : "Send Reset Link"}
                </Button>
                <button
                  type="button"
                  onClick={() => { setMode("login"); refreshCaptcha(); }}
                  className="text-sm text-primary hover:underline"
                >
                  Back to Login
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Login;
