import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { GraduationCap, CheckCircle, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { useState } from "react";
import { useParams } from "wouter";

type FormState = {
  name: string;
  email: string;
  phone: string;
  notes: string;
};

const emptyForm: FormState = { name: "", email: "", phone: "", notes: "" };

export default function ReferralRegister() {
  const params = useParams<{ token: string }>();
  const token = params.token ?? "";

  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitted, setSubmitted] = useState(false);
  const [promoterNameOnSuccess, setPromoterNameOnSuccess] = useState("");
  const [errors, setErrors] = useState<Partial<FormState>>({});

  // Resolve the token to get promoter info
  const { data: promoterInfo, isLoading: resolving, error: resolveError } =
    trpc.referralLink.resolveToken.useQuery(
      { token },
      { enabled: !!token, retry: false }
    );

  const registerMutation = trpc.referralLink.registerParent.useMutation({
    onSuccess: (data) => {
      setPromoterNameOnSuccess(data.promoterName);
      setSubmitted(true);
    },
  });

  const validate = (): boolean => {
    const newErrors: Partial<FormState> = {};
    if (!form.name.trim()) newErrors.name = "Full name is required";
    if (!form.email.trim()) newErrors.email = "Email address is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      newErrors.email = "Please enter a valid email address";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    registerMutation.mutate({ token, ...form });
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (resolving) {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading referral link…</p>
        </div>
      </PageShell>
    );
  }

  // ── Invalid token ──────────────────────────────────────────────────────────
  if (resolveError || !promoterInfo) {
    return (
      <PageShell>
        <Card className="max-w-md mx-auto border shadow-md">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-4">
            <div className="h-14 w-14 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="h-7 w-7 text-red-500" />
            </div>
            <div>
              <p className="font-semibold text-lg text-foreground">Invalid Referral Link</p>
              <p className="text-sm text-muted-foreground mt-1">
                This referral link is not valid or has expired. Please ask your promoter for a new link.
              </p>
            </div>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  // ── Success state ──────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <PageShell>
        <Card className="max-w-md mx-auto border shadow-md">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-4">
            <div className="h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="h-7 w-7 text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-xl text-foreground">You're registered!</p>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                Thank you for signing up. <strong>{promoterNameOnSuccess}</strong> referred you and will be notified once your child is enrolled in our tutoring program.
              </p>
            </div>
            <div className="mt-2 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 text-left w-full">
              <p className="font-medium mb-1">What happens next?</p>
              <ul className="space-y-1 text-blue-700">
                <li className="flex items-start gap-2">
                  <ArrowRight className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  Our team will reach out to discuss tutoring options for your child.
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  Once enrolled, your promoter earns a $50 referral credit.
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  // ── Registration form ──────────────────────────────────────────────────────
  return (
    <PageShell>
      <div className="max-w-lg mx-auto">
        {/* Referral badge */}
        <div className="mb-6 flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
            <GraduationCap className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-blue-900">
              You were referred by <span className="text-blue-700">{promoterInfo.promoterName}</span>
            </p>
            <p className="text-xs text-blue-600 mt-0.5">
              Fill in your details below to register your interest in our tutoring program.
            </p>
          </div>
        </div>

        <Card className="border shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Parent Registration</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Register your details and we'll be in touch about enrolling your child.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-1.5">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  placeholder="Jane Smith"
                  value={form.name}
                  onChange={(e) => {
                    setForm({ ...form, name: e.target.value });
                    if (errors.name) setErrors({ ...errors, name: undefined });
                  }}
                  className={errors.name ? "border-destructive" : ""}
                />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name}</p>
                )}
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="jane@example.com"
                  value={form.email}
                  onChange={(e) => {
                    setForm({ ...form, email: e.target.value });
                    if (errors.email) setErrors({ ...errors, email: undefined });
                  }}
                  className={errors.email ? "border-destructive" : ""}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email}</p>
                )}
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  placeholder="+1 (555) 000-0000"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="e.g. My child is in Grade 5 and needs help with Math…"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                />
              </div>

              {registerMutation.error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {registerMutation.error.message}
                </div>
              )}

              <Button
                type="submit"
                className="w-full gap-2"
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  <>
                    Submit Registration
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Your information will be shared with our tutoring team only.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <GraduationCap className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-foreground">Tutoring Referral Program</span>
        </div>
      </header>
      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-10">{children}</main>
    </div>
  );
}
