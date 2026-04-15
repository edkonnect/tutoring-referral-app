import { useAuth } from "@/_core/hooks/useAuth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
  Mail,
  MapPin,
  Phone,
  UserPlus,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

type SignupForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
};

const emptySignupForm: SignupForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  city: "",
  state: "",
};

type View = "signin" | "signup";

export default function Home() {
  const { user, loading, refresh } = useAuth();
  const [, setLocation] = useLocation();

  const [view, setView] = useState<View>("signin");
  const [signupForm, setSignupForm] = useState<SignupForm>(emptySignupForm);
  const [signupError, setSignupError] = useState("");
  const [signupSuccessEmail, setSignupSuccessEmail] = useState("");

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
    onSuccess: async () => {
      await refresh();
    },
    onError: (err) => {
      setLoginError(err.message);
    },
  });

  const registerMutation = trpc.invite.register.useMutation({
    onSuccess: (data) => {
      setSignupSuccessEmail(data.email);
      setSignupError("");
      setSignupForm(emptySignupForm);
    },
    onError: (err) => {
      setSignupError(err.message);
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    loginMutation.mutate({ email, password });
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError("");
    setSignupSuccessEmail("");
    registerMutation.mutate({
      ...signupForm,
      origin: window.location.origin,
    });
  };

  const updateSignupField =
    (field: keyof SignupForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSignupForm((current) => ({ ...current, [field]: e.target.value }));
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
      <header className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-blue-500 flex items-center justify-center">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <span className="font-semibold text-white text-lg">Referral Manager</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row items-center justify-center px-6 py-10 max-w-6xl mx-auto w-full gap-12">
        {/* Left: Hero */}
        <div className="flex-1 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-sm font-medium mb-6">
            <DollarSign className="h-3.5 w-3.5" />
            $50 per enrolled student
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-5">
            Turn your network
            <br />
            <span className="text-blue-400">into referral income</span>
          </h1>

          <p className="text-lg text-slate-300 max-w-xl mb-8 leading-relaxed">
            Join the tutoring referral program, share families who need support, and track every referral,
            enrollment, and payout from one dashboard.
          </p>

          <div className="space-y-3">
            {[
              { icon: UserPlus, text: "Sign up in under a minute and finish setup from your email" },
              { icon: Users, text: "Refer parents and manage every family you bring in" },
              { icon: ClipboardList, text: "Watch enrollments and payouts update from your dashboard" },
            ].map((feature) => (
              <div key={feature.text} className="flex items-center gap-3 text-slate-300">
                <div className="h-7 w-7 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <feature.icon className="h-3.5 w-3.5 text-blue-400" />
                </div>
                <span className="text-sm">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Card */}
        <div className="w-full max-w-sm">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur shadow-2xl">

            {/* Sign in view */}
            {view === "signin" && (
              <>
                <h2 className="text-xl font-bold text-white mb-1">Sign in</h2>
                <p className="text-sm text-slate-400 mb-6">Access your referral dashboard</p>

                <form onSubmit={handleLogin} className="space-y-4">
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
                        Signing in...
                      </>
                    ) : (
                      "Sign in"
                    )}
                  </Button>
                </form>

                <div className="mt-5 space-y-2 text-center text-sm">
                  <p className="text-slate-400">
                    New user?{" "}
                    <button
                      type="button"
                      onClick={() => { setView("signup"); setLoginError(""); }}
                      className="text-blue-400 hover:text-blue-300 font-medium"
                    >
                      Create an account
                    </button>
                  </p>
                </div>
              </>
            )}

            {/* Sign up view */}
            {view === "signup" && (
              <>
                {signupSuccessEmail ? (
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">Check your inbox</h3>
                        <p className="text-sm text-emerald-100/90 mt-1">
                          We sent your password setup link to <strong>{signupSuccessEmail}</strong>.
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 text-sm text-slate-200">
                      <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 flex items-center gap-2">
                        <Mail className="h-4 w-4 text-blue-300" />
                        Open the email
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-blue-300" />
                        Create your password
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-white/20 text-white bg-white/5 hover:bg-white/10"
                      onClick={() => { setView("signin"); setSignupSuccessEmail(""); }}
                    >
                      Already set your password? Sign in
                    </Button>
                  </div>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold text-white mb-1">Become a promoter</h2>
                    <p className="text-sm text-slate-400 mb-6">
                      Enter your details and we'll email you a link to create your password.
                    </p>

                    <form onSubmit={handleSignup} className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="firstName" className="text-slate-300 text-sm">First name</Label>
                          <Input
                            id="firstName"
                            value={signupForm.firstName}
                            onChange={updateSignupField("firstName")}
                            placeholder="Jane"
                            autoComplete="given-name"
                            required
                            className="bg-white/10 border-white/20 text-white placeholder:text-slate-500 focus:border-blue-400"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="lastName" className="text-slate-300 text-sm">Last name</Label>
                          <Input
                            id="lastName"
                            value={signupForm.lastName}
                            onChange={updateSignupField("lastName")}
                            placeholder="Doe"
                            autoComplete="family-name"
                            required
                            className="bg-white/10 border-white/20 text-white placeholder:text-slate-500 focus:border-blue-400"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="signupEmail" className="text-slate-300 text-sm">Email</Label>
                        <Input
                          id="signupEmail"
                          type="email"
                          value={signupForm.email}
                          onChange={updateSignupField("email")}
                          placeholder="you@example.com"
                          autoComplete="email"
                          required
                          className="bg-white/10 border-white/20 text-white placeholder:text-slate-500 focus:border-blue-400"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="phone" className="text-slate-300 text-sm">Phone number</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                          <Input
                            id="phone"
                            type="tel"
                            value={signupForm.phone}
                            onChange={updateSignupField("phone")}
                            placeholder="(555) 555-5555"
                            autoComplete="tel"
                            required
                            className="bg-white/10 border-white/20 text-white placeholder:text-slate-500 focus:border-blue-400 pl-9"
                          />
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_140px]">
                        <div className="space-y-1.5">
                          <Label htmlFor="city" className="text-slate-300 text-sm">City</Label>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                            <Input
                              id="city"
                              value={signupForm.city}
                              onChange={updateSignupField("city")}
                              placeholder="Atlanta"
                              autoComplete="address-level2"
                              required
                              className="bg-white/10 border-white/20 text-white placeholder:text-slate-500 focus:border-blue-400 pl-9"
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="state" className="text-slate-300 text-sm">State</Label>
                          <Input
                            id="state"
                            value={signupForm.state}
                            onChange={updateSignupField("state")}
                            placeholder="GA"
                            autoComplete="address-level1"
                            required
                            className="bg-white/10 border-white/20 text-white placeholder:text-slate-500 focus:border-blue-400"
                          />
                        </div>
                      </div>

                      {signupError && (
                        <Alert variant="destructive" className="bg-red-900/30 border-red-700/50 text-red-300">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{signupError}</AlertDescription>
                        </Alert>
                      )}

                      <Button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium"
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Sending setup email...
                          </>
                        ) : (
                          "Sign up"
                        )}
                      </Button>
                    </form>

                    <p className="mt-5 text-center text-sm text-slate-400">
                      Already have an account?{" "}
                      <button
                        type="button"
                        onClick={() => { setView("signin"); setSignupError(""); }}
                        className="text-blue-400 hover:text-blue-300 font-medium"
                      >
                        Sign in
                      </button>
                    </p>
                  </>
                )}
              </>
            )}

          </div>
        </div>
      </main>

      <footer className="py-6 text-center text-slate-500 text-sm">
        Tutoring Referral Manager - Built for growing tutoring businesses
      </footer>
    </div>
  );
}
