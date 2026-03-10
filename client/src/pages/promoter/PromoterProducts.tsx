import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Package, Send, DollarSign, Tag, Loader2, BookOpen } from "lucide-react";

export default function PromoterProducts() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const { data: products = [], isLoading: loadingProducts } = trpc.products.list.useQuery();
  const { data: parents = [], isLoading: loadingParents } = trpc.parents.list.useQuery();

  const [sendDialog, setSendDialog] = useState<{ open: boolean; productId: number | null }>({
    open: false,
    productId: null,
  });
  const [selectedParentId, setSelectedParentId] = useState<string>("");
  const [message, setMessage] = useState("");

  const sendMutation = trpc.productPromotions.send.useMutation({
    onSuccess: () => {
      toast.success("Promotion sent successfully! The parent will be notified.");
      setSendDialog({ open: false, productId: null });
      setSelectedParentId("");
      setMessage("");
      utils.productPromotions.myList.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const selectedProduct = products.find((p) => p.id === sendDialog.productId);

  function handleSend() {
    if (!sendDialog.productId || !selectedParentId) {
      toast.error("Please select a parent to send the promotion to.");
      return;
    }
    sendMutation.mutate({
      productId: sendDialog.productId,
      parentId: Number(selectedParentId),
      message: message.trim() || undefined,
    });
  }

  const CATEGORY_COLORS: Record<string, string> = {
    Math: "bg-blue-100 text-blue-700",
    Science: "bg-green-100 text-green-700",
    English: "bg-purple-100 text-purple-700",
    Coding: "bg-orange-100 text-orange-700",
    Music: "bg-pink-100 text-pink-700",
    Art: "bg-yellow-100 text-yellow-700",
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-500 mt-1">Browse available products and send promotions to your parents. Earn <span className="font-semibold text-green-600">$25</span> for each enrollment.</p>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <DollarSign className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-800">How it works</p>
            <p className="text-sm text-blue-700 mt-0.5">
              Select a product, choose a parent from your list, and send them the promotion details. When the admin confirms their enrollment, you earn a <strong>$25 credit</strong> automatically.
            </p>
          </div>
        </div>

        {/* Products Grid */}
        {loadingProducts ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">No products available yet</p>
            <p className="text-sm mt-1">Check back later — the admin will add products you can promote.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => (
              <Card key={product.id} className="hover:shadow-md transition-shadow border border-gray-200">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base font-semibold text-gray-900 leading-tight">
                        {product.name}
                      </CardTitle>
                      {product.category && (
                        <span
                          className={`inline-block mt-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${
                            CATEGORY_COLORS[product.category] ?? "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {product.category}
                        </span>
                      )}
                    </div>
                    {product.price && (
                      <div className="text-right shrink-0">
                        <span className="text-lg font-bold text-gray-900">${Number(product.price).toFixed(2)}</span>
                        <p className="text-xs text-gray-400">per session</p>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
                  {product.description && (
                    <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">{product.description}</p>
                  )}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5 text-green-600">
                      <DollarSign className="w-4 h-4" />
                      <span className="text-sm font-semibold">$25 credit on enrollment</span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSendDialog({ open: true, productId: product.id });
                        setSelectedParentId("");
                        setMessage("");
                      }}
                      disabled={parents.length === 0}
                      className="gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Promote
                    </Button>
                  </div>
                  {parents.length === 0 && (
                    <p className="text-xs text-amber-600">Add parents first to send promotions.</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Send Promotion Dialog */}
      <Dialog open={sendDialog.open} onOpenChange={(open) => setSendDialog({ open, productId: open ? sendDialog.productId : null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-600" />
              Send Promotion
            </DialogTitle>
          </DialogHeader>

          {selectedProduct && (
            <div className="space-y-4">
              {/* Product Summary */}
              <div className="bg-gray-50 rounded-lg p-3 border">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-gray-500" />
                  <span className="font-medium text-gray-900">{selectedProduct.name}</span>
                  {selectedProduct.price && (
                    <span className="text-sm text-gray-500 ml-auto">${Number(selectedProduct.price).toFixed(2)}</span>
                  )}
                </div>
                {selectedProduct.description && (
                  <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{selectedProduct.description}</p>
                )}
              </div>

              {/* Parent Selection */}
              <div className="space-y-1.5">
                <Label htmlFor="parent-select">Send to Parent <span className="text-red-500">*</span></Label>
                <Select value={selectedParentId} onValueChange={setSelectedParentId}>
                  <SelectTrigger id="parent-select">
                    <SelectValue placeholder="Select a parent..." />
                  </SelectTrigger>
                  <SelectContent>
                    {parents.map((parent) => (
                      <SelectItem key={parent.id} value={String(parent.id)}>
                        {parent.name} — {parent.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Optional Message */}
              <div className="space-y-1.5">
                <Label htmlFor="promo-message">Personal Message <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Textarea
                  id="promo-message"
                  placeholder="Add a personal note to accompany the promotion details..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
                <strong>Reminder:</strong> You'll earn <strong>$25</strong> when the admin confirms this parent's enrollment in {selectedProduct.name}.
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSendDialog({ open: false, productId: null })}>
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={!selectedParentId || sendMutation.isPending}
              className="gap-2"
            >
              {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send Promotion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
