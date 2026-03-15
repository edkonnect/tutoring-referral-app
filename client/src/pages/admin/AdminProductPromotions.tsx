import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Send, CheckCircle2, Clock, DollarSign, Search, Loader2, User, Package,
  Banknote, GraduationCap, BookOpen, Target, ChevronRight, AlertCircle,
  Pencil, X, Save,
} from "lucide-react";

const GRADE_LEVELS = [
  "Pre-K", "Kindergarten", "Grade 1", "Grade 2", "Grade 3", "Grade 4",
  "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10",
  "Grade 11", "Grade 12", "College", "Adult Learner",
];

type Student = {
  id: number;
  name: string;
  lastName?: string | null;
  gradeLevel?: string | null;
  educationGoals?: string | null;
  subjects?: string | null;
  enrolled: boolean;
  createdAt: Date;
};

type Promotion = {
  id: number;
  productId: number;
  parentId: number;
  promoterId: number;
  sentAt: Date;
  message?: string | null;
  enrollmentToken?: string | null;
  product?: { id: number; name: string; price: string; category?: string | null } | null;
  parent?: { id: number; name: string; email?: string | null } | null;
  promoter?: { id: number; name: string; email?: string | null } | null;
  enrollment?: {
    id: number;
    status: string;
    creditAmount: string;
    enrolledAt: Date;
    paidAt?: Date | null;
  } | null;
  students?: Student[];
};

type StudentEditForm = {
  name: string;
  lastName: string;
  gradeLevel: string;
  educationGoals: string;
};

function StudentCard({
  student,
  index,
  total,
  onSaved,
}: {
  student: Student;
  index: number;
  total: number;
  onSaved: () => void;
}) {
  const utils = trpc.useUtils();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<StudentEditForm>({
    name: student.name ?? "",
    lastName: student.lastName ?? "",
    gradeLevel: student.gradeLevel ?? "",
    educationGoals: student.educationGoals ?? "",
  });

  const updateMutation = trpc.students.update.useMutation({
    onSuccess: () => {
      toast.success("Student information updated.");
      setEditing(false);
      utils.productPromotions.listAll.invalidate();
      onSaved();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error("First name is required.");
      return;
    }
    updateMutation.mutate({
      id: student.id,
      name: form.name.trim(),
      lastName: form.lastName.trim() || undefined,
      gradeLevel: form.gradeLevel || undefined,
      educationGoals: form.educationGoals.trim() || undefined,
    });
  };

  const handleCancel = () => {
    setForm({
      name: student.name ?? "",
      lastName: student.lastName ?? "",
      gradeLevel: student.gradeLevel ?? "",
      educationGoals: student.educationGoals ?? "",
    });
    setEditing(false);
  };

  return (
    <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 space-y-3">
      {total > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide">Student {index + 1}</p>
          {!editing && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-xs text-indigo-600 hover:bg-indigo-100 gap-1"
              onClick={() => setEditing(true)}
            >
              <Pencil className="w-3 h-3" /> Edit
            </Button>
          )}
        </div>
      )}

      {total === 1 && !editing && (
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-xs text-indigo-600 hover:bg-indigo-100 gap-1"
            onClick={() => setEditing(true)}
          >
            <Pencil className="w-3 h-3" /> Edit
          </Button>
        </div>
      )}

      {editing ? (
        /* ── Edit Mode ── */
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-gray-600">First Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="First name"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-600">Last Name</Label>
              <Input
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                placeholder="Last name"
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-gray-600">Grade Level</Label>
            <Select
              value={form.gradeLevel || "__none__"}
              onValueChange={(v) => setForm((f) => ({ ...f, gradeLevel: v === "__none__" ? "" : v }))}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Select grade level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Not specified —</SelectItem>
                {GRADE_LEVELS.map((g) => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-gray-600">Education Goals</Label>
            <Textarea
              value={form.educationGoals}
              onChange={(e) => setForm((f) => ({ ...f, educationGoals: e.target.value }))}
              placeholder="Describe the student's education goals..."
              className="text-sm min-h-[80px] resize-none"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              className="h-7 text-xs gap-1 bg-indigo-600 hover:bg-indigo-700"
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Save className="w-3 h-3" />
              )}
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs gap-1 text-gray-500"
              onClick={handleCancel}
              disabled={updateMutation.isPending}
            >
              <X className="w-3 h-3" /> Cancel
            </Button>
          </div>
        </div>
      ) : (
        /* ── View Mode ── */
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-400 shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Full Name</p>
              <p className="font-semibold text-gray-900">
                {student.name}{student.lastName ? ` ${student.lastName}` : ""}
              </p>
            </div>
          </div>
          {student.gradeLevel ? (
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-400 shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Grade Level</p>
                <p className="text-sm text-gray-800">{student.gradeLevel}</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400 flex items-center gap-1 pl-6">
              <span className="italic">No grade level set</span>
            </p>
          )}
          {student.educationGoals ? (
            <div className="flex items-start gap-2">
              <Target className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">Education Goals</p>
                <p className="text-sm text-gray-800 leading-relaxed">{student.educationGoals}</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400 flex items-center gap-1 pl-6">
              <span className="italic">No education goals set</span>
            </p>
          )}
          <div className="flex items-center gap-1.5 pt-1">
            {student.enrolled ? (
              <Badge className="bg-green-100 text-green-700 border-0 text-xs gap-1">
                <CheckCircle2 className="w-3 h-3" /> Enrolled
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs gap-1">
                <Clock className="w-3 h-3" /> Not yet enrolled
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminProductPromotions() {
  const utils = trpc.useUtils();
  const { data: promotions = [], isLoading } = trpc.productPromotions.listAll.useQuery();
  const { data: enrollments = [] } = trpc.productPromotions.listEnrollments.useQuery();

  const [search, setSearch] = useState("");
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [markPaidId, setMarkPaidId] = useState<number | null>(null);
  const [selectedPromo, setSelectedPromo] = useState<Promotion | null>(null);

  const confirmMutation = trpc.productPromotions.confirmEnrollment.useMutation({
    onSuccess: () => {
      toast.success("Enrollment confirmed! Credit issued to promoter.");
      setConfirmId(null);
      utils.productPromotions.listAll.invalidate();
      utils.productPromotions.listEnrollments.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const markPaidMutation = trpc.productPromotions.markPaid.useMutation({
    onSuccess: () => {
      toast.success("Credit marked as paid.");
      setMarkPaidId(null);
      utils.productPromotions.listEnrollments.invalidate();
      utils.productPromotions.listAll.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const filtered = (promotions as Promotion[]).filter((p) => {
    const q = search.toLowerCase();
    return (
      (p.product?.name ?? "").toLowerCase().includes(q) ||
      (p.parent?.name ?? "").toLowerCase().includes(q) ||
      (p.promoter?.name ?? "").toLowerCase().includes(q)
    );
  });

  const pendingEnrollments = enrollments.filter((e) => e.status === "pending");
  const paidCredits = enrollments
    .filter((e) => e.status === "paid")
    .reduce((sum, e) => sum + parseFloat(e.creditAmount ?? "0"), 0);

  const confirmPromotion = (promotions as Promotion[]).find((p) => p.id === confirmId);
  const markPaidEnrollment = enrollments.find((e) => e.id === markPaidId);

  // Keep selected promo in sync with fresh data after student edits
  const liveSelectedPromo = selectedPromo
    ? ((promotions as Promotion[]).find((p) => p.id === selectedPromo.id) ?? selectedPromo)
    : null;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Promotions</h1>
          <p className="text-gray-500 mt-1">Confirm parent enrollments to issue referral credits to promoters.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Sent", value: promotions.length, icon: Send, color: "blue" },
            { label: "Enrollments", value: enrollments.length, icon: CheckCircle2, color: "green" },
            { label: "Pending Payout", value: `$${(pendingEnrollments.reduce((s, e) => s + parseFloat(e.creditAmount ?? "0"), 0)).toFixed(2)}`, icon: Clock, color: "yellow" },
            { label: "Total Paid", value: `$${paidCredits.toFixed(2)}`, icon: Banknote, color: "purple" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className={`bg-${color}-50 border border-${color}-100 rounded-lg p-4 flex items-center justify-between`}>
              <div>
                <p className={`text-xs font-medium text-${color}-600 uppercase tracking-wide`}>{label}</p>
                <p className={`text-2xl font-bold text-${color}-900 mt-0.5`}>{value}</p>
              </div>
              <Icon className={`w-6 h-6 text-${color}-400`} />
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by product, parent, or promoter..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Promotions Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Send className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">{search ? "No promotions match your search" : "No promotions sent yet"}</p>
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Product</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Parent</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Promoter</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Student Info</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Sent</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((promo) => {
                  const hasStudents = promo.students && promo.students.length > 0;
                  const firstStudent = promo.students?.[0];
                  return (
                    <tr
                      key={promo.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setSelectedPromo(promo)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-gray-400 shrink-0" />
                          <span className="font-medium text-gray-900">{promo.product?.name ?? `#${promo.productId}`}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400 shrink-0" />
                          <span className="text-gray-700">{promo.parent?.name ?? `#${promo.parentId}`}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{promo.promoter?.name ?? `#${promo.promoterId}`}</td>
                      <td className="px-4 py-3">
                        {hasStudents && firstStudent ? (
                          <div className="flex items-center gap-1.5">
                            <GraduationCap className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span className="text-gray-700 text-xs">
                              {firstStudent.name}{firstStudent.lastName ? ` ${firstStudent.lastName}` : ""}
                              {firstStudent.gradeLevel && (
                                <span className="text-gray-400 ml-1">· {firstStudent.gradeLevel}</span>
                              )}
                            </span>
                            {(promo.students?.length ?? 0) > 1 && (
                              <Badge variant="secondary" className="text-xs px-1 py-0 h-4">
                                +{(promo.students?.length ?? 1) - 1}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Not collected
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{new Date(promo.sentAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        {!promo.enrollment ? (
                          <Badge variant="secondary" className="gap-1 text-xs"><Clock className="w-3 h-3" />Awaiting</Badge>
                        ) : promo.enrollment.status === "paid" ? (
                          <Badge className="bg-green-100 text-green-700 border-0 gap-1 text-xs"><CheckCircle2 className="w-3 h-3" />Paid</Badge>
                        ) : (
                          <Badge className="bg-yellow-100 text-yellow-700 border-0 gap-1 text-xs"><DollarSign className="w-3 h-3" />Credit Pending</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          {!promo.enrollment && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1 text-green-700 border-green-200 hover:bg-green-50"
                              onClick={() => setConfirmId(promo.id)}
                            >
                              <CheckCircle2 className="w-3 h-3" /> Confirm
                            </Button>
                          )}
                          {promo.enrollment?.status === "pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1 text-purple-700 border-purple-200 hover:bg-purple-50"
                              onClick={() => setMarkPaidId(promo.enrollment!.id)}
                            >
                              <Banknote className="w-3 h-3" /> Mark Paid
                            </Button>
                          )}
                          <ChevronRight className="w-4 h-4 text-gray-300" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
              {filtered.length} promotion{filtered.length !== 1 ? "s" : ""}
            </div>
          </div>
        )}
      </div>

      {/* Detail Slide-over */}
      <Sheet open={liveSelectedPromo !== null} onOpenChange={(open) => !open && setSelectedPromo(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {liveSelectedPromo && (
            <>
              <SheetHeader className="pb-4">
                <SheetTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600" />
                  Promotion Detail
                </SheetTitle>
              </SheetHeader>

              {/* Status Banner */}
              <div className={`rounded-lg p-3 mb-5 flex items-center gap-2 text-sm font-medium ${
                !liveSelectedPromo.enrollment
                  ? "bg-gray-100 text-gray-700"
                  : liveSelectedPromo.enrollment.status === "paid"
                  ? "bg-green-50 text-green-700"
                  : "bg-yellow-50 text-yellow-700"
              }`}>
                {!liveSelectedPromo.enrollment ? (
                  <><Clock className="w-4 h-4" /> Awaiting Enrollment</>
                ) : liveSelectedPromo.enrollment.status === "paid" ? (
                  <><CheckCircle2 className="w-4 h-4" /> Enrollment Confirmed &amp; Credit Paid</>
                ) : (
                  <><DollarSign className="w-4 h-4" /> Enrolled — Credit Pending Payout</>
                )}
              </div>

              {/* Product Info */}
              <section className="mb-5">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Product</h3>
                <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                  <p className="font-semibold text-gray-900">{liveSelectedPromo.product?.name ?? `#${liveSelectedPromo.productId}`}</p>
                  {liveSelectedPromo.product?.category && (
                    <p className="text-xs text-gray-500">{liveSelectedPromo.product.category}</p>
                  )}
                  {liveSelectedPromo.product?.price && (
                    <p className="text-sm text-gray-700">${liveSelectedPromo.product.price}</p>
                  )}
                </div>
              </section>

              <Separator className="my-4" />

              {/* Parent Info */}
              <section className="mb-5">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Parent</h3>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{liveSelectedPromo.parent?.name ?? `#${liveSelectedPromo.parentId}`}</p>
                    {liveSelectedPromo.parent?.email && (
                      <p className="text-sm text-gray-500">{liveSelectedPromo.parent.email}</p>
                    )}
                  </div>
                </div>
              </section>

              <Separator className="my-4" />

              {/* Student Information */}
              <section className="mb-5">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5" />
                  Student Information
                </h3>
                {liveSelectedPromo.students && liveSelectedPromo.students.length > 0 ? (
                  <div className="space-y-3">
                    {liveSelectedPromo.students.map((student, idx) => (
                      <StudentCard
                        key={student.id}
                        student={student}
                        index={idx}
                        total={liveSelectedPromo.students!.length}
                        onSaved={() => {
                          // The liveSelectedPromo will auto-refresh from the query cache
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-dashed border-gray-200 rounded-lg p-4 text-center">
                    <AlertCircle className="w-6 h-6 text-gray-300 mx-auto mb-1.5" />
                    <p className="text-sm text-gray-500">No student information collected yet.</p>
                    <p className="text-xs text-gray-400 mt-0.5">Student info is submitted when the parent completes the enrollment form.</p>
                  </div>
                )}
              </section>

              <Separator className="my-4" />

              {/* Promoter Info */}
              <section className="mb-5">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Promoter</h3>
                <p className="text-sm text-gray-800">{liveSelectedPromo.promoter?.name ?? `#${liveSelectedPromo.promoterId}`}</p>
                {liveSelectedPromo.promoter?.email && (
                  <p className="text-xs text-gray-500">{liveSelectedPromo.promoter.email}</p>
                )}
              </section>

              {/* Message */}
              {liveSelectedPromo.message && (
                <>
                  <Separator className="my-4" />
                  <section className="mb-5">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Promoter Message</h3>
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 italic">"{liveSelectedPromo.message}"</p>
                  </section>
                </>
              )}

              {/* Enrollment Credit */}
              {liveSelectedPromo.enrollment && (
                <>
                  <Separator className="my-4" />
                  <section className="mb-5">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Referral Credit</h3>
                    <div className="bg-green-50 border border-green-100 rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-green-600">Credit Amount</p>
                        <p className="text-xl font-bold text-green-700">${liveSelectedPromo.enrollment.creditAmount}</p>
                      </div>
                      <Badge className={`${liveSelectedPromo.enrollment.status === "paid" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"} border-0`}>
                        {liveSelectedPromo.enrollment.status === "paid" ? "Paid" : "Pending"}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">
                      Enrolled: {new Date(liveSelectedPromo.enrollment.enrolledAt).toLocaleDateString()}
                      {liveSelectedPromo.enrollment.paidAt && ` · Paid: ${new Date(liveSelectedPromo.enrollment.paidAt).toLocaleDateString()}`}
                    </p>
                  </section>
                </>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-2">
                {!liveSelectedPromo.enrollment && (
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700 gap-2"
                    onClick={() => {
                      setConfirmId(liveSelectedPromo.id);
                      setSelectedPromo(null);
                    }}
                  >
                    <CheckCircle2 className="w-4 h-4" /> Confirm Enrollment &amp; Issue Credit
                  </Button>
                )}
                {liveSelectedPromo.enrollment?.status === "pending" && (
                  <Button
                    className="w-full bg-purple-600 hover:bg-purple-700 gap-2"
                    onClick={() => {
                      setMarkPaidId(liveSelectedPromo.enrollment!.id);
                      setSelectedPromo(null);
                    }}
                  >
                    <Banknote className="w-4 h-4" /> Mark Credit as Paid
                  </Button>
                )}
              </div>

              <p className="text-xs text-gray-400 text-center mt-4">
                Sent on {new Date(liveSelectedPromo.sentAt).toLocaleString()}
              </p>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Confirm Enrollment Dialog */}
      <AlertDialog open={confirmId !== null} onOpenChange={(open) => !open && setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Product Enrollment?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmPromotion && (
                <>
                  Confirm that <strong>{confirmPromotion.parent?.name}</strong> has enrolled in{" "}
                  <strong>{confirmPromotion.product?.name}</strong>. This will issue a referral credit to{" "}
                  <strong>{confirmPromotion.promoter?.name}</strong> and send them an email notification.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-green-600 hover:bg-green-700"
              onClick={() => confirmId !== null && confirmMutation.mutate({ promotionId: confirmId })}
            >
              {confirmMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirm &amp; Issue Credit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mark Paid Dialog */}
      <AlertDialog open={markPaidId !== null} onOpenChange={(open) => !open && setMarkPaidId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Credit as Paid?</AlertDialogTitle>
            <AlertDialogDescription>
              {markPaidEnrollment && (
                <>This will mark the <strong>${markPaidEnrollment.creditAmount}</strong> product enrollment credit as paid. This action cannot be undone.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-purple-600 hover:bg-purple-700"
              onClick={() => markPaidId !== null && markPaidMutation.mutate({ enrollmentId: markPaidId })}
            >
              Mark as Paid
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
