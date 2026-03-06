import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { GraduationCap, Users, DollarSign, ClipboardList, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Home() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && user) {
      if (user.role === "admin") {
        setLocation("/admin");
      } else {
        setLocation("/promoter");
      }
    }
  }, [user, loading, setLocation]);

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
        <Button
          onClick={() => { window.location.href = getLoginUrl(); }}
          variant="outline"
          className="border-white/20 text-white bg-white/10 hover:bg-white/20"
        >
          Sign in
        </Button>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center max-w-4xl mx-auto w-full">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-sm font-medium mb-8">
          <DollarSign className="h-3.5 w-3.5" />
          $50 per enrolled student
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-6">
          Grow your tutoring business
          <br />
          <span className="text-blue-400">through referrals</span>
        </h1>

        <p className="text-lg text-slate-300 max-w-2xl mb-10 leading-relaxed">
          A streamlined platform for managing referrals between promoters and your tutoring business.
          Track parents, students, enrollments, and payouts — all in one place.
        </p>

        <Button
          onClick={() => { window.location.href = getLoginUrl(); }}
          size="lg"
          className="bg-blue-500 hover:bg-blue-400 text-white px-8 py-3 text-base font-medium shadow-xl shadow-blue-500/25"
        >
          Get started
        </Button>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-20 w-full text-left">
          {[
            {
              icon: Users,
              title: "Manage Referrals",
              desc: "Promoters add parents and students, tracking every referral from first contact to enrollment.",
            },
            {
              icon: ClipboardList,
              title: "Admin Control",
              desc: "Admins confirm enrollments, trigger $50 referral credits, and manage the full payout process.",
            },
            {
              icon: DollarSign,
              title: "Instant Notifications",
              desc: "Promoters receive an email the moment their referred student is enrolled and credit is issued.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="bg-white/5 border border-white/10 rounded-xl p-5 backdrop-blur"
            >
              <div className="h-9 w-9 rounded-lg bg-blue-500/20 flex items-center justify-center mb-3">
                <f.icon className="h-4.5 w-4.5 text-blue-400" />
              </div>
              <h3 className="font-semibold text-white mb-1.5">{f.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="py-6 text-center text-slate-500 text-sm">
        Tutoring Referral Manager &mdash; Built for growing tutoring businesses
      </footer>
    </div>
  );
}
