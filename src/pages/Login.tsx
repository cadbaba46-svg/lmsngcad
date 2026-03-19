import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { RefreshCw } from "lucide-react";

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

  const refreshCaptcha = useCallback(() => {
    setCaptcha(generateCaptcha());
    setCaptchaInput("");
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (parseInt(captchaInput) !== captcha.answer) {
      toast.error("Incorrect CAPTCHA answer. Please try again.");
      refreshCaptcha();
      return;
    }

    setLoading(true);

    try {
      let email = identifier;

      // If not an email, resolve via edge function
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
    if (parseInt(captchaInput) !== captcha.answer) {
      toast.error("Incorrect CAPTCHA answer. Please try again.");
      refreshCaptcha();
      return;
    }
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("reset-by-username", {
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

              {/* CAPTCHA */}
              <div className="bg-muted border border-border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Security Check</Label>
                  <button type="button" onClick={refreshCaptcha} className="text-muted-foreground hover:text-foreground transition-colors">
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-lg font-mono font-bold text-foreground tracking-wider">{captcha.question}</p>
                <Input
                  type="number"
                  placeholder="Your answer"
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value)}
                  required
                />
              </div>

              <div className="flex items-center justify-between">
                <Button type="submit" disabled={loading}>
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

              {/* CAPTCHA */}
              <div className="bg-muted border border-border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Security Check</Label>
                  <button type="button" onClick={refreshCaptcha} className="text-muted-foreground hover:text-foreground transition-colors">
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-lg font-mono font-bold text-foreground tracking-wider">{captcha.question}</p>
                <Input
                  type="number"
                  placeholder="Your answer"
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value)}
                  required
                />
              </div>

              <div className="flex items-center justify-between">
                <Button type="submit" disabled={loading}>
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
