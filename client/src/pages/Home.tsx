import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GraduationCap, Users, DollarSign, ClipboardList, Loader2, Eye, EyeOff, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

export default function Home() {
  const { user, loading, refresh } = useAuth();
  const [, setLocation] = useLocation();

  // Login form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    if (!loading && user) {
      if (user.role === "admin") {
        setLocation("/admin");
      } else {
        setLocation("/promoter");
      }
    }
  }, [user, loading, setLocation]);

  const loginMutation = trpc.invite.login.useMutation({
    onSuccess: async (data) => {
      if (data.role === "admin") {
        setLoginError("This is an admin account. Please use Sign in as Admin.");
        return;
      }
      await refresh();
    },
    onError: (err) => {
      setLoginError(err.message);
    },
  });

  const adminLoginMutation = trpc.invite.login.useMutation({
    onSuccess: async (data) => {
      if (data.role !== "admin") {
        setLoginError("This account does not have admin access.");
        return;
      }
      await refresh();
    },
    onError: (err) => {
      setLoginError(err.message);
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    loginMutation.mutate({ email, password });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col">
      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-blue-500 flex items-center justify-center">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <span className="font-semibold text-white text-lg">Referral Manager</span>
        </div>
      </header>

      {/* Main content: two-column layout */}
      <main className="flex-1 flex flex-col lg:flex-row items-center justify-center px-6 py-10 max-w-6xl mx-auto w-full gap-12">
        {/* Left: Hero */}
        <div className="flex-1 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-sm font-medium mb-6">
            <DollarSign className="h-3.5 w-3.5" />
            $50 per enrolled student
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-5">
            Grow your tutoring business
            <br />
            <span className="text-blue-400">through referrals</span>
          </h1>

          <p className="text-lg text-slate-300 max-w-xl mb-8 leading-relaxed">
            A streamlined platform for managing referrals between promoters and your tutoring business.
            Track parents, students, enrollments, and payouts — all in one place.
          </p>

          {/* Feature list */}
          <div className="space-y-3">
            {[
              { icon: Users, text: "Promoters manage referred parents and students" },
              { icon: ClipboardList, text: "Admins confirm enrollments and trigger $50 credits" },
              { icon: DollarSign, text: "Instant email notification when a referral is enrolled" },
            ].map((f) => (
              <div key={f.text} className="flex items-center gap-3 text-slate-300">
                <div className="h-7 w-7 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <f.icon className="h-3.5 w-3.5 text-blue-400" />
                </div>
                <span className="text-sm">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Login card */}
        <div className="w-full max-w-sm">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-1">Sign in</h2>
            <p className="text-sm text-slate-400 mb-6">Access your referral dashboard</p>

            {/* Email/password login for promoters */}
            <form onSubmit={handleLogin} className="space-y-4 mb-5">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-slate-300 text-sm">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-slate-500 focus:border-blue-400"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-slate-300 text-sm">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    autoComplete="current-password"
                    required
                    className="bg-white/10 border-white/20 text-white placeholder:text-slate-500 focus:border-blue-400 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {loginError && (
                <Alert variant="destructive" className="bg-red-900/30 border-red-700/50 text-red-300">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{loginError}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  "Sign in as Promoter"
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative mb-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-transparent px-3 text-slate-500">or</span>
              </div>
            </div>


            <Button
              type="button"
              onClick={() => adminLoginMutation.mutate({ email, password })}
              variant="outline"
              className="w-full border-white/20 text-white bg-white/5 hover:bg-white/10 mt-2"
              disabled={adminLoginMutation.isPending}
            >
              {adminLoginMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign in as Admin"
              )}
            </Button>
            <p className="text-center text-xs text-slate-500 mt-4">
              New promoter? Check your email for an invitation link.
            </p>
          </div>
        </div>
      </main>

      <footer className="py-6 text-center text-slate-500 text-sm">
        Tutoring Referral Manager &mdash; Built for growing tutoring businesses
      </footer>
    </div>
  );
}
