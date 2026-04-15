import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  AlertCircle,
  Mail,
  Lock,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

// Password strength helpers
function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (pw.length === 0) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: "Weak", color: "bg-red-500" };
  if (score <= 2) return { score, label: "Fair", color: "bg-amber-500" };
  if (score <= 3) return { score, label: "Good", color: "bg-yellow-500" };
  if (score <= 4) return { score, label: "Strong", color: "bg-green-500" };
  return { score, label: "Very Strong", color: "bg-emerald-600" };
}

export default function AccountSetup() {
  const { token } = useParams<{ token: string }>();
  const [, navigate] = useLocation();

  const [email, setEmail] = useState("");
  const [emailPrefilled, setEmailPrefilled] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState(false);
  const [welcomeName, setWelcomeName] = useState("");

  const strength = getPasswordStrength(password);

  // Resolve invite token
  const { data: inviteInfo, isLoading: resolving, error: resolveError } = trpc.invite.resolve.useQuery(
    { token: token ?? "" },
    { enabled: !!token, retry: false }
  );

  // Pre-fill email once invite info loads
  useEffect(() => {
    if (inviteInfo?.email && !emailPrefilled) {
      setEmail(inviteInfo.email);
      setEmailPrefilled(true);
    }
  }, [inviteInfo, emailPrefilled]);

  const setupMutation = trpc.invite.setupAccount.useMutation({
    onSuccess: (data) => {
      setWelcomeName(data.name);
      setSuccess(true);
      setTimeout(() => navigate("/promoter"), 3000);
    },
    onError: (err) => {
      setFormError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!email.trim()) { setFormError("Please enter your email address."); return; }
    if (password.length < 8) { setFormError("Password must be at least 8 characters."); return; }
    if (password !== confirmPassword) { setFormError("Passwords do not match."); return; }
    setupMutation.mutate({ token: token ?? "", email, password });
  };

  // ── Invalid token ──────────────────────────────────────────────────────────
  if (!token) {
    return (
      <PageShell>
        <StatusCard icon={<AlertCircle className="w-12 h-12 text-red-500" />} title="Invalid Link">
          <p className="text-slate-500 text-sm">This setup link is missing a token. Please check your invitation email or ask your administrator to resend it.</p>
        </StatusCard>
      </PageShell>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (resolving) {
    return (
      <PageShell>
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Validating your invitation link…</p>
        </div>
      </PageShell>
    );
  }

  // ── Error resolving token ──────────────────────────────────────────────────
  if (resolveError) {
    return (
      <PageShell>
        <StatusCard icon={<AlertCircle className="w-12 h-12 text-red-500" />} title="Link Unavailable">
          <p className="text-slate-500 text-sm mb-3">{resolveError.message}</p>
          <p className="text-xs text-slate-400">Please contact your administrator to resend the invitation.</p>
        </StatusCard>
      </PageShell>
    );
  }

  // ── Success ────────────────────────────────────────────────────────────────
  if (success) {
    return (
      <PageShell>
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-2">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Account Created!</h2>
          <p className="text-slate-600">
            Welcome, <strong>{welcomeName}</strong>! Your promoter account is ready.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
            You can now log in with your email and password to access your dashboard and start earning referral credits.
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            Redirecting to your dashboard…
          </div>
        </div>
      </PageShell>
    );
  }

  // ── Setup form ─────────────────────────────────────────────────────────────
  return (
    <PageShell>
      {/* Logo + greeting */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-700 to-blue-500 rounded-2xl mb-4 shadow-lg">
          <GraduationCap className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Create Your Account</h1>
        {inviteInfo?.name && (
          <p className="text-slate-500 mt-1 text-sm">
            Welcome, <strong className="text-slate-700">{inviteInfo.name}</strong>! Set your login credentials below.
          </p>
        )}
      </div>

      {/* Steps banner */}
      <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-6 text-xs text-blue-700 font-medium">
        <span className="flex items-center gap-1.5"><span className="w-5 h-5 bg-blue-600 text-white rounded-full inline-flex items-center justify-center text-[10px] font-bold">1</span> Set credentials</span>
        <ArrowRight className="w-3 h-3 text-blue-400" />
        <span className="flex items-center gap-1.5 text-blue-400"><span className="w-5 h-5 bg-blue-200 text-blue-600 rounded-full inline-flex items-center justify-center text-[10px] font-bold">2</span> Access dashboard</span>
        <ArrowRight className="w-3 h-3 text-blue-400" />
        <span className="flex items-center gap-1.5 text-blue-400"><span className="w-5 h-5 bg-blue-200 text-blue-600 rounded-full inline-flex items-center justify-center text-[10px] font-bold">3</span> Start earning</span>
      </div>

      {/* Form card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-medium text-slate-700">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                className="pl-9"
              />
            </div>
            <p className="text-xs text-slate-400">This will be your login username.</p>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm font-medium text-slate-700">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                required
                className="pl-9 pr-10"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" tabIndex={-1}>
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {/* Strength meter */}
            {password.length > 0 && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= strength.score ? strength.color : "bg-slate-200"}`} />
                  ))}
                </div>
                <p className={`text-xs font-medium ${strength.score <= 1 ? "text-red-500" : strength.score <= 2 ? "text-amber-500" : strength.score <= 3 ? "text-yellow-600" : "text-green-600"}`}>
                  {strength.label} password
                </p>
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">Confirm Password</Label>
            <div className="relative">
              <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="confirmPassword"
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                autoComplete="new-password"
                required
                className="pl-9 pr-10"
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" tabIndex={-1}>
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirmPassword.length > 0 && password !== confirmPassword && (
              <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Passwords do not match</p>
            )}
            {confirmPassword.length > 0 && password === confirmPassword && password.length >= 8 && (
              <p className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Passwords match</p>
            )}
          </div>

          {/* Error */}
          {formError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2.5"
            disabled={setupMutation.isPending}
          >
            {setupMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating Account…</>
            ) : (
              <><CheckCircle2 className="w-4 h-4 mr-2" />Create My Account</>
            )}
          </Button>
        </form>
      </div>

      <p className="text-center text-xs text-slate-400 mt-4">
        Already have an account?{" "}
        <a href="/" className="text-blue-600 hover:underline font-medium">Sign in here</a>
      </p>
    </PageShell>
  );
}

// ── Shared layout helpers ──────────────────────────────────────────────────────
function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}

function StatusCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center space-y-3">
      <div className="flex justify-center mb-2">{icon}</div>
      <h2 className="text-xl font-bold text-slate-800">{title}</h2>
      {children}
    </div>
  );
}
