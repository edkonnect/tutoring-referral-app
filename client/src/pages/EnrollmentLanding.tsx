import { useState } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap,
  CheckCircle2,
  Loader2,
  AlertCircle,
  DollarSign,
  Tag,
  User,
  Mail,
} from "lucide-react";

export default function EnrollmentLanding() {
  const [, params] = useRoute("/enroll/:token");
  const token = params?.token ?? "";

  const { data, isLoading, error } = trpc.productPromotions.resolveEnrollmentToken.useQuery(
    { token },
    { enabled: !!token, retry: false }
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string }>({});

  // Pre-fill from resolved data once loaded
  const [prefilled, setPrefilled] = useState(false);
  if (data && !prefilled) {
    if (data.parent?.name) setName(data.parent.name);
    if (data.parent?.email) setEmail(data.parent.email);
    setPrefilled(true);
  }

  const enrollMutation = trpc.productPromotions.selfEnroll.useMutation({
    onSuccess: () => setSubmitted(true),
  });

  function validate() {
    const errors: { name?: string; email?: string } = {};
    if (!name.trim()) errors.name = "Your name is required.";
    if (!email.trim()) errors.email = "Your email address is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Please enter a valid email address.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    enrollMutation.mutate({ token, parentName: name.trim(), parentEmail: email.trim() });
  }

  // ─── Loading state ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto" />
          <p className="text-gray-500 text-sm">Loading your enrollment details…</p>
        </div>
      </div>
    );
  }

  // ─── Invalid / expired token ──────────────────────────────────────────────
  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-lg">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <AlertCircle className="w-7 h-7 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Link Not Found</h2>
            <p className="text-gray-500 text-sm leading-relaxed">
              This enrollment link is invalid or has expired. Please contact the person who referred you for a new link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { product, promoterName, alreadyEnrolled } = data;
  const priceDisplay = product?.price ? `$${parseFloat(product.price).toFixed(2)}` : null;

  // ─── Already enrolled ─────────────────────────────────────────────────────
  if (alreadyEnrolled || submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-lg">
          <CardContent className="pt-8 pb-8 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">You're Enrolled!</h2>
              <p className="text-gray-500 text-sm mt-1">
                {alreadyEnrolled && !submitted
                  ? "You have already enrolled in this program."
                  : "Your enrollment has been confirmed successfully."}
              </p>
            </div>
            {product && (
              <div className="bg-blue-50 rounded-xl p-4 text-left space-y-1">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Enrolled Program</p>
                <p className="font-bold text-gray-900">{product.name}</p>
                {priceDisplay && <p className="text-blue-700 font-semibold">{priceDisplay}</p>}
              </div>
            )}
            <p className="text-gray-400 text-xs">
              Our team will be in touch shortly with next steps. Welcome aboard!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Enrollment form ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto shadow-lg">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Enroll in a Tutoring Program</h1>
          {promoterName && (
            <p className="text-gray-500 text-sm">
              <span className="font-medium text-blue-600">{promoterName}</span> has invited you to join
            </p>
          )}
        </div>

        {/* Product card */}
        {product && (
          <Card className="shadow-md border-0 bg-white">
            <CardHeader className="pb-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-xl">
              <CardTitle className="text-white text-lg">{product.name}</CardTitle>
              {product.category && (
                <Badge className="w-fit bg-white/20 text-white border-0 text-xs">
                  <Tag className="w-3 h-3 mr-1" />{product.category}
                </Badge>
              )}
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {product.description && (
                <p className="text-gray-600 text-sm leading-relaxed">{product.description}</p>
              )}
              {priceDisplay && (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Program Price</p>
                    <p className="font-bold text-gray-900">{priceDisplay}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Enrollment form */}
        <Card className="shadow-md border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-gray-800">Confirm Your Details</CardTitle>
            <p className="text-xs text-gray-400">Please verify your name and email to complete enrollment.</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="enroll-name" className="flex items-center gap-1.5 text-sm">
                  <User className="w-3.5 h-3.5 text-gray-400" /> Full Name
                </Label>
                <Input
                  id="enroll-name"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setFieldErrors((p) => ({ ...p, name: undefined })); }}
                  placeholder="Your full name"
                  className={fieldErrors.name ? "border-red-400 focus-visible:ring-red-300" : ""}
                />
                {fieldErrors.name && <p className="text-xs text-red-500">{fieldErrors.name}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="enroll-email" className="flex items-center gap-1.5 text-sm">
                  <Mail className="w-3.5 h-3.5 text-gray-400" /> Email Address
                </Label>
                <Input
                  id="enroll-email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setFieldErrors((p) => ({ ...p, email: undefined })); }}
                  placeholder="your@email.com"
                  className={fieldErrors.email ? "border-red-400 focus-visible:ring-red-300" : ""}
                />
                {fieldErrors.email && <p className="text-xs text-red-500">{fieldErrors.email}</p>}
              </div>

              {enrollMutation.error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg border border-red-100">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-600">{enrollMutation.error.message}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-5 text-base gap-2"
                disabled={enrollMutation.isPending}
              >
                {enrollMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Enrolling…</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4" /> Confirm Enrollment</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-400">
          By enrolling, you agree to be contacted by our tutoring team. Your information is kept private and secure.
        </p>
      </div>
    </div>
  );
}
