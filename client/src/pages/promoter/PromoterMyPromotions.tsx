import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Send, Package, User, CheckCircle2, Clock, DollarSign, Banknote, Search, X, Ticket } from "lucide-react";

export default function PromoterMyPromotions() {
  const { data: promotions = [], isLoading } = trpc.productPromotions.myList.useQuery();
  const { data: earningsData } = trpc.productPromotions.myEarnings.useQuery();
  const [generatedPromos, setGeneratedPromos] = useState<Map<number, string>>(new Map());
  const [loadingPromoId, setLoadingPromoId] = useState<number | null>(null);
  const generatePromoMutation = trpc.promoCodes.generate.useMutation({
    onSuccess: (data, variables) => {
      setGeneratedPromos(prev => new Map(prev).set(variables.promoId, data.code));
      setLoadingPromoId(null);
      toast.success("Promo code sent to parent email!");
    },
    onError: (err) => toast.error(err.message),
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const summary = earningsData?.summary ?? { total: 0, pending: 0, paid: 0, count: 0 };

  const filteredPromotions = useMemo(() => {
    const q = appliedQuery.toLowerCase().trim();
    if (!q) return promotions;
    return promotions.filter(
      (promo) =>
        (promo.parent?.name ?? "").toLowerCase().includes(q) ||
        (promo.product?.name ?? "").toLowerCase().includes(q)
    );
  }, [promotions, appliedQuery]);

  function handleSearch() { setAppliedQuery(searchQuery); }
  function handleClear() { setSearchQuery(""); setAppliedQuery(""); }

  function statusBadge(enrollment: { status: string } | null | undefined) {
    if (!enrollment) return <Badge variant="secondary" className="bg-gray-100 text-gray-600 gap-1"><Clock className="w-3 h-3" />Pending Enrollment</Badge>;
    if (enrollment.status === "paid") return <Badge className="bg-green-100 text-green-700 gap-1 border-0"><CheckCircle2 className="w-3 h-3" />Paid</Badge>;
    return <Badge className="bg-yellow-100 text-yellow-700 gap-1 border-0"><DollarSign className="w-3 h-3" />Credit Pending</Badge>;
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Promotions</h1>
          <p className="text-gray-500 mt-1">Track all product promotions you've sent and your $25 credits.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border border-gray-200">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Sent</p>
                  <p className="text-2xl font-bold text-gray-900 mt-0.5">{promotions.length}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                  <Send className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-gray-200">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Credits Earned</p>
                  <p className="text-2xl font-bold text-gray-900 mt-0.5">${summary.total}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-gray-200">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Paid Out</p>
                  <p className="text-2xl font-bold text-gray-900 mt-0.5">${summary.paid}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center">
                  <Banknote className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by parent name or product name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-9"
            />
          </div>
          <Button onClick={handleSearch} className="gap-2">
            <Search className="w-4 h-4" />
            Search
          </Button>
          {appliedQuery && (
            <Button variant="outline" onClick={handleClear} className="gap-2">
              <X className="w-4 h-4" />
              Clear
            </Button>
          )}
        </div>

        {appliedQuery && (
          <p className="text-sm text-gray-500">
            Showing {filteredPromotions.length} result{filteredPromotions.length !== 1 ? "s" : ""} for "{appliedQuery}"
          </p>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : filteredPromotions.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Send className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">
              {appliedQuery ? "No promotions match your search" : "No promotions sent yet"}
            </p>
            <p className="text-sm mt-1">
              {appliedQuery ? "Try a different parent or product name." : "Go to the Products page to send your first promotion."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPromotions.map((promo) => (
              <Card key={promo.id} className="border border-gray-200 hover:shadow-sm transition-shadow">
                <CardContent className="py-4 px-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                        <Package className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">
                          {promo.product?.name ?? `Product #${promo.productId}`}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 text-sm text-gray-500">
                          <User className="w-3.5 h-3.5" />
                          <span className="truncate">{promo.parent?.name ?? `Parent #${promo.parentId}`}</span>
                          <span className="text-gray-300">·</span>
                          <span>{new Date(promo.sentAt).toLocaleDateString()}</span>
                        </div>
                        {promo.message && (
                          <p className="text-xs text-gray-400 mt-1.5 italic line-clamp-1">"{promo.message}"</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {statusBadge(promo.enrollment)}
                      {promo.enrollment && (
                        <span className="text-sm font-semibold text-green-600">
                          +${Number(promo.enrollment.creditAmount).toFixed(2)}
                        </span>
                      )}
                      {promo.enrollment?.status === "pending" && !generatedPromos.has(promo.id) && !(promo as any).promoSent && (
                        <Button
                          size="sm"
                          className="bg-indigo-600 hover:bg-indigo-700 gap-1 text-xs"
                          disabled={generatePromoMutation.isPending}
                          onClick={() => { setLoadingPromoId(promo.id); generatePromoMutation.mutate({
                            promoId: promo.id,
                            parentId: promo.parentId,
                            studentId: (promo.students && promo.students.length > 0) ? promo.students[0].id : 0,
                            promoterId: promo.promoterId,
                            productName: promo.product?.name ?? "Course",
                            parentEmail: promo.parent?.email ?? "",
                            parentName: promo.parent?.name ?? "Parent",
                          })}}
                        >
                          {loadingPromoId === promo.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Ticket className="w-3 h-3" />}
                          Send Promo Code
                        </Button>
                      )}
                      {(generatedPromos.has(promo.id) || (promo as any).promoSent) && (
                        <div className="text-right">
                          <p className="text-xs text-gray-400">Promo Sent ✅</p>
                          <p className="text-xs font-bold text-indigo-600 tracking-widest">
                            {generatedPromos.get(promo.id) ?? (promo as any).promoCode ?? "—"}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
