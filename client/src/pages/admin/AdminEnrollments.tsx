import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { UserCheck, GraduationCap, CheckCircle, Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminEnrollments() {
  const utils = trpc.useUtils();
  const { data: students, isLoading } = trpc.students.listAll.useQuery();
  const { data: parents } = trpc.parents.listAll.useQuery();
  const { data: promoters } = trpc.admin.listPromoters.useQuery();

  const [confirmId, setConfirmId] = useState<number | null>(null);

  const enrollMutation = trpc.students.enroll.useMutation({
    onSuccess: (data) => {
      utils.students.listAll.invalidate();
      utils.admin.getStats.invalidate();
      utils.referrals.listAll.invalidate();
      const emailMsg = data.promoterEmail
        ? ` Email notification sent to ${data.promoterEmail}.`
        : "";
      toast.success(`Student enrolled! $50 referral credit issued.${emailMsg}`);
      setConfirmId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const pendingStudents = students?.filter((s) => !s.enrolled) ?? [];
  const enrolledStudents = students?.filter((s) => s.enrolled) ?? [];

  const getParentName = (parentId: number) =>
    parents?.find((p) => p.id === parentId)?.name ?? "Unknown";

  const getPromoterName = (parentId: number) => {
    const parent = parents?.find((p) => p.id === parentId);
    if (!parent) return "Unknown";
    return promoters?.find((pr) => pr.id === parent.promoterId)?.name ?? "Unknown";
  };

  const confirmStudent = students?.find((s) => s.id === confirmId);
  const confirmParent = confirmStudent ? parents?.find((p) => p.id === confirmStudent.parentId) : null;
  const confirmPromoter = confirmParent ? promoters?.find((pr) => pr.id === confirmParent.promoterId) : null;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground">Enrollment Confirmation</h1>
          <p className="text-muted-foreground mt-1">
            Confirm student enrollments to issue $50 referral credits to promoters
          </p>
        </div>

        {/* Pending enrollments */}
        <div className="mb-8">
          <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
            Pending Enrollment
            {pendingStudents.length > 0 && (
              <span className="ml-1 inline-flex items-center justify-center h-5 w-5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                {pendingStudents.length}
              </span>
            )}
          </h2>

          {isLoading ? (
            <div className="grid gap-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : !pendingStudents.length ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                <CheckCircle className="h-8 w-8 text-emerald-500 mb-2" />
                <p className="font-medium text-foreground">All caught up!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  No students are pending enrollment.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {pendingStudents.map((s) => (
                <Card key={s.id} className="border shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground">{s.name}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                          <span className="text-sm text-muted-foreground">
                            Parent: {getParentName(s.parentId)}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            Promoter: <span className="font-medium text-foreground">{getPromoterName(s.parentId)}</span>
                          </span>
                          {s.gradeLevel && (
                            <span className="text-sm text-muted-foreground">Grade: {s.gradeLevel}</span>
                          )}
                          {s.subjects && (
                            <span className="text-sm text-muted-foreground">Subjects: {s.subjects}</span>
                          )}
                        </div>
                      </div>
                      <Button
                        onClick={() => setConfirmId(s.id)}
                        className="gap-2 shrink-0"
                        size="sm"
                      >
                        <UserCheck className="h-4 w-4" />
                        Confirm Enrollment
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Enrolled students */}
        {enrolledStudents.length > 0 && (
          <div>
            <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              Enrolled Students ({enrolledStudents.length})
            </h2>
            <Card className="border shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Student</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Parent</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Promoter</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Grade</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Enrolled On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrolledStudents.map((s) => (
                      <tr key={s.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">{s.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{getParentName(s.parentId)}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            {getPromoterName(s.parentId)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{s.gradeLevel ?? "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {s.enrolledAt ? new Date(s.enrolledAt).toLocaleDateString() : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Confirm Enrollment Dialog */}
      <Dialog open={confirmId !== null} onOpenChange={() => setConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Enrollment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <GraduationCap className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-foreground">{confirmStudent?.name}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Parent: {confirmParent?.name}
                  </p>
                  {confirmStudent?.gradeLevel && (
                    <p className="text-sm text-muted-foreground">Grade: {confirmStudent.gradeLevel}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <p className="text-sm font-medium text-emerald-800 mb-1">This action will:</p>
              <ul className="text-sm text-emerald-700 space-y-1">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                  Mark {confirmStudent?.name} as enrolled
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                  Issue a $50 referral credit to <strong>{confirmPromoter?.name ?? "the promoter"}</strong>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  Send an email notification to the promoter
                </li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmId(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => confirmId && enrollMutation.mutate({ studentId: confirmId })}
              disabled={enrollMutation.isPending}
              className="gap-2"
            >
              <UserCheck className="h-4 w-4" />
              {enrollMutation.isPending ? "Confirming..." : "Confirm Enrollment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
