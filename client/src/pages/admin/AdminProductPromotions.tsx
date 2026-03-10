import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Send, CheckCircle2, Clock, DollarSign, Search, Loader2, User, Package, Banknote } from "lucide-react";

export default function AdminProductPromotions() {
  const utils = trpc.useUtils();
  const { data: promotions = [], isLoading } = trpc.productPromotions.listAll.useQuery();
  const { data: enrollments = [] } = trpc.productPromotions.listEnrollments.useQuery();

  const [search, setSearch] = useState("");
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [markPaidId, setMarkPaidId] = useState<number | null>(null);

  const confirmMutation = trpc.productPromotions.confirmEnrollment.useMutation({
    onSuccess: () => {
      toast.success("Enrollment confirmed! $25 credit issued to promoter.");
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

  const filtered = promotions.filter((p) => {
    const q = search.toLowerCase();
    return (
      (p.product?.name ?? "").toLowerCase().includes(q) ||
      (p.parent?.name ?? "").toLowerCase().includes(q) ||
      (p.promoter?.name ?? "").toLowerCase().includes(q)
    );
  });

  const pendingEnrollments = enrollments.filter((e) => e.status === "pending");
  const totalCredits = enrollments.length * 25;
  const paidCredits = enrollments.filter((e) => e.status === "paid").length * 25;

  const confirmPromotion = promotions.find((p) => p.id === confirmId);
  const markPaidEnrollment = enrollments.find((e) => e.id === markPaidId);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Promotions</h1>
          <p className="text-gray-500 mt-1">Confirm parent enrollments to issue $25 credits to promoters.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Sent", value: promotions.length, icon: Send, color: "blue" },
            { label: "Enrollments", value: enrollments.length, icon: CheckCircle2, color: "green" },
            { label: "Pending Payout", value: `$${pendingEnrollments.length * 25}`, icon: Clock, color: "yellow" },
            { label: "Total Paid", value: `$${paidCredits}`, icon: Banknote, color: "purple" },
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
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Sent</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((promo) => (
                  <tr key={promo.id} className="hover:bg-gray-50 transition-colors">
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
                      <div className="flex items-center justify-end gap-2">
                        {!promo.enrollment && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1 text-green-700 border-green-200 hover:bg-green-50"
                            onClick={() => setConfirmId(promo.id)}
                          >
                            <CheckCircle2 className="w-3 h-3" /> Confirm Enrollment
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
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirm Enrollment Dialog */}
      <AlertDialog open={confirmId !== null} onOpenChange={(open) => !open && setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Product Enrollment?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmPromotion && (
                <>
                  Confirm that <strong>{confirmPromotion.parent?.name}</strong> has enrolled in{" "}
                  <strong>{confirmPromotion.product?.name}</strong>. This will issue a{" "}
                  <strong>$25 credit</strong> to <strong>{confirmPromotion.promoter?.name}</strong> and send them an email notification.
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
              Confirm & Issue $25 Credit
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
              This will mark the $25 product enrollment credit as paid. This action cannot be undone.
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
