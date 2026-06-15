import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { RefreshCw, Check, ShieldCheck, Eye, EyeOff } from "lucide-react";

function generateCaptcha() {
  const a = Math.floor(Math.random() * 20) + 1;
  const b = Math.floor(Math.random() * 20) + 1;
  return { question: `${a} + ${b} = ?`, answer: a + b };
}

const Login = () => {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "forgot" | "reset">("login");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotCnic, setForgotCnic] = useState("");
  const [adminFlow, setAdminFlow] = useState(false);
  const [otp, setOtp] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
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
      // If not an email, look up by registration number (roll_number)
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

      const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
        refreshCaptcha();
      } else {
        // Check if user must change password
        const { data: profile } = await supabase
          .from("profiles")
          .select("must_change_password")
          .eq("user_id", authData.user.id)
          .maybeSingle();

        if (profile?.must_change_password) {
          navigate("/reset-password?force=true");
        } else {
          navigate("/dashboard");
        }
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
      const { error } = await supabase.functions.invoke("request-password-reset-otp", {
        body: { email: forgotEmail, cnic: forgotCnic, adminFlow },
      });
      if (error) {
        toast.error("Failed to send reset code. Please try again.");
      } else {
        toast.success("If your details match our records, a 6-digit code has been sent to your email.");
        setMode("reset");
      }
    } catch {
      toast.error("Failed to send reset code. Please try again.");
    }

    setLoading(false);
    refreshCaptcha();
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error("Enter the 6-digit code from your email.");
      return;
    }
    if (newPwd.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (newPwd !== confirmPwd) {
      toast.error("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-password-reset-otp", {
        body: { email: forgotEmail, otp, newPassword: newPwd },
      });
      if (error || (data && data.error)) {
        toast.error((data && data.error) || "Could not reset password.");
      } else {
        toast.success("Password changed successfully. Please log in.");
        setMode("login");
        setOtp(""); setNewPwd(""); setConfirmPwd("");
        setIdentifier(forgotEmail);
      }
    } catch {
      toast.error("Could not reset password.");
    }
    setLoading(false);
  };

  // Inline captcha block to prevent re-mount on each keystroke
  const captchaBlock = (
    <div className="bg-muted border border-border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-primary" /> Verify you&apos;re human
        </Label>
        <button type="button" onClick={refreshCaptcha} aria-label="Refresh captcha" className="text-muted-foreground hover:text-foreground transition-colors">
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
      <Helmet>
        <title>Login — LMS NGCAD</title>
        <meta name="description" content="Sign in to the LMS NGCAD learning management system using your registered email or registration number to access courses, fees, and student records." />
        <link rel="canonical" href="https://lms.ngcad.org/login" />
        <meta property="og:title" content="Login — LMS NGCAD" />
        <meta property="og:description" content="Sign in to the LMS NGCAD learning management system to access your courses, fees, examinations, and student records." />
        <meta property="og:url" content="https://lms.ngcad.org/login" />
      </Helmet>
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <h1 className="sr-only">Login to LMS NGCAD</h1>
          {mode === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground text-center mb-4">Log in</h2>
              <div className="space-y-2">
                <Label htmlFor="login-identifier">Email or Registration Number</Label>
                <Input
                  id="login-identifier"
                  type="text"
                  placeholder="Enter email or registration number"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {captchaBlock}

              <div className="flex items-center justify-between">
                <Button type="submit" disabled={loading || !captchaVerified} className={!captchaVerified ? "opacity-50" : ""}>
                  {loading ? "Logging in..." : "Log in"}
                </Button>
                <button
                  type="button"
                  onClick={() => { setMode("forgot"); setAdminFlow(false); refreshCaptcha(); }}
                  className="text-sm text-primary hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => { setMode("forgot"); setAdminFlow(true); refreshCaptcha(); }}
                  className="text-xs text-muted-foreground hover:text-primary hover:underline"
                >
                  Admin password reset
                </button>
              </div>
            </form>
          )}

          {mode === "forgot" && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground text-center mb-4">
                {adminFlow ? "Admin Password Reset" : "Forgot Password"}
              </h2>
              <p className="text-sm text-muted-foreground text-center">
                {adminFlow
                  ? "Enter the registered admin email. We'll send a 6-digit verification code to that email."
                  : "Enter your registered email and CNIC. We'll send a 6-digit verification code to your email."}
              </p>
              <div className="space-y-2">
                <Label htmlFor="forgot-email">Email</Label>
                <Input id="forgot-email" type="email" placeholder="your@email.com"
                  value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} required />
              </div>
              {!adminFlow && (
                <div className="space-y-2">
                  <Label htmlFor="forgot-cnic">CNIC</Label>
                  <Input id="forgot-cnic" type="text" placeholder="35202-1234567-1"
                    value={forgotCnic} onChange={(e) => setForgotCnic(e.target.value)} required />
                </div>
              )}

              {captchaBlock}

              <div className="flex items-center justify-between">
                <Button type="submit" disabled={loading || !captchaVerified} className={!captchaVerified ? "opacity-50" : ""}>
                  {loading ? "Sending..." : "Send Code"}
                </Button>
                <button
                  type="button"
                  onClick={() => { setMode("login"); setAdminFlow(false); refreshCaptcha(); }}
                  className="text-sm text-primary hover:underline"
                >
                  Back to Login
                </button>
              </div>
            </form>
          )}

          {mode === "reset" && (
            <form onSubmit={handleResetSubmit} className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground text-center mb-4">Enter Code & New Password</h2>
              <p className="text-sm text-muted-foreground text-center">
                Enter the 6-digit code sent to <b>{forgotEmail}</b>, then set your new password.
              </p>
              <div className="space-y-2">
                <Label htmlFor="otp">6-digit Code</Label>
                <Input id="otp" type="text" inputMode="numeric" maxLength={6} placeholder="123456"
                  value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-pwd">New Password</Label>
                <div className="relative">
                  <Input id="new-pwd" type={showNewPwd ? "text" : "password"} value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)} className="pr-10" required />
                  <button type="button" onClick={() => setShowNewPwd((value) => !value)}
                    className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                    aria-label={showNewPwd ? "Hide new password" : "Show new password"}>
                    {showNewPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-pwd">Confirm New Password</Label>
                <div className="relative">
                  <Input id="confirm-pwd" type={showConfirmPwd ? "text" : "password"} value={confirmPwd}
                    onChange={(e) => setConfirmPwd(e.target.value)} className="pr-10" required />
                  <button type="button" onClick={() => setShowConfirmPwd((value) => !value)}
                    className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                    aria-label={showConfirmPwd ? "Hide confirm password" : "Show confirm password"}>
                    {showConfirmPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Button type="submit" disabled={loading}>
                  {loading ? "Resetting..." : "Reset Password"}
                </Button>
                <button type="button" onClick={() => setMode("forgot")}
                  className="text-sm text-primary hover:underline">
                  Resend code
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
