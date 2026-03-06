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
import { DollarSign, CheckCircle, Clock, CreditCard } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminPayouts() {
  const utils = trpc.useUtils();
  const { data: referrals, isLoading } = trpc.referrals.listAll.useQuery();
  const { data: parents } = trpc.parents.listAll.useQuery();
  const { data: students } = trpc.students.listAll.useQuery();
  const { data: promoters } = trpc.admin.listPromoters.useQuery();

  const [payId, setPayId] = useState<number | null>(null);

  const markPaidMutation = trpc.referrals.markPaid.useMutation({
    onSuccess: () => {
      utils.referrals.listAll.invalidate();
      utils.admin.getStats.invalidate();
      toast.success("Referral fee marked as paid");
      setPayId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const getStudentName = (studentId: number) =>
    students?.find((s) => s.id === studentId)?.name ?? "Unknown";

  const getParentName = (parentId: number) =>
    parents?.find((p) => p.id === parentId)?.name ?? "Unknown";

  const getPromoterName = (promoterId: number) =>
    promoters?.find((p) => p.id === promoterId)?.name ?? "Unknown";

  const pending = referrals?.filter((r) => r.status === "pending") ?? [];
  const paid = referrals?.filter((r) => r.status === "paid") ?? [];
  const pendingTotal = pending.length * 50;
  const paidTotal = paid.length * 50;

  const payReferral = referrals?.find((r) => r.id === payId);

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground">Payout Management</h1>
          <p className="text-muted-foreground mt-1">
            Review and process referral fee payouts to promoters
          </p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card className="border shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Pending Payouts</p>
                  <p className="text-2xl font-semibold text-foreground">${pendingTotal}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{pending.length} referral{pending.length !== 1 ? "s" : ""}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Paid Out</p>
                  <p className="text-2xl font-semibold text-foreground">${paidTotal}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{paid.length} referral{paid.length !== 1 ? "s" : ""}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Credits Issued</p>
                  <p className="text-2xl font-semibold text-foreground">${(referrals?.length ?? 0) * 50}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{referrals?.length ?? 0} total referral{referrals?.length !== 1 ? "s" : ""}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending payouts */}
        <div className="mb-8">
          <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
            Pending Payouts
            {pending.length > 0 && (
              <span className="ml-1 inline-flex items-center justify-center h-5 w-5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                {pending.length}
              </span>
            )}
          </h2>

          {isLoading ? (
            <div className="grid gap-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : !pending.length ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                <CheckCircle className="h-8 w-8 text-emerald-500 mb-2" />
                <p className="font-medium text-foreground">No pending payouts</p>
                <p className="text-sm text-muted-foreground mt-1">All referral fees have been paid.</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Promoter</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Student</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Parent</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Enrolled On</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Amount</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pending.map((r) => (
                      <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">
                          {getPromoterName(r.promoterId)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{getStudentName(r.studentId)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{getParentName(r.parentId)}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(r.enrolledAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">
                          ${Number(r.creditAmount).toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 h-7 text-xs"
                            onClick={() => setPayId(r.id)}
                          >
                            <CreditCard className="h-3.5 w-3.5" />
                            Mark Paid
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>

        {/* Paid history */}
        {paid.length > 0 && (
          <div>
            <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              Paid History ({paid.length})
            </h2>
            <Card className="border shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Promoter</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Student</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Parent</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Enrolled On</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Amount</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Paid On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paid.map((r) => (
                      <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">
                          {getPromoterName(r.promoterId)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{getStudentName(r.studentId)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{getParentName(r.parentId)}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(r.enrolledAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">
                          ${Number(r.creditAmount).toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                            <CheckCircle className="h-3 w-3" />
                            {r.paidAt ? new Date(r.paidAt).toLocaleDateString() : "—"}
                          </span>
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

      {/* Mark Paid Confirm Dialog */}
      <Dialog open={payId !== null} onOpenChange={() => setPayId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Referral as Paid</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Confirm that you have paid the $50 referral fee for:
            </p>
            {payReferral && (
              <div className="p-4 bg-muted/40 rounded-lg space-y-1.5 text-sm">
                <p><span className="text-muted-foreground">Promoter:</span> <strong>{getPromoterName(payReferral.promoterId)}</strong></p>
                <p><span className="text-muted-foreground">Student:</span> {getStudentName(payReferral.studentId)}</p>
                <p><span className="text-muted-foreground">Amount:</span> <strong className="text-emerald-600">${Number(payReferral.creditAmount).toFixed(2)}</strong></p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayId(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => payId && markPaidMutation.mutate({ referralId: payId })}
              disabled={markPaidMutation.isPending}
              className="gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              {markPaidMutation.isPending ? "Processing..." : "Confirm Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
