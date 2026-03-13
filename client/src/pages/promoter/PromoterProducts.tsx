import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Package, Send, DollarSign, Loader2, Search, Users, CheckSquare, Square } from "lucide-react";

export default function PromoterProducts() {
  const utils = trpc.useUtils();

  const { data: products = [], isLoading: loadingProducts } = trpc.products.list.useQuery();
  const { data: parents = [], isLoading: loadingParents } = trpc.parents.list.useQuery();

  const [sendDialog, setSendDialog] = useState<{ open: boolean; productId: number | null }>({
    open: false,
    productId: null,
  });
  const [selectedParentIds, setSelectedParentIds] = useState<Set<number>>(new Set());
  const [message, setMessage] = useState("");
  const [parentSearch, setParentSearch] = useState("");

  const sendMutation = trpc.productPromotions.send.useMutation({
    onSuccess: (data) => {
      const { sent, failed } = data;
      if (failed === 0) {
        toast.success(`Promotion sent to ${sent} parent${sent !== 1 ? "s" : ""}! They will be notified by email.`);
      } else if (sent > 0) {
        toast.warning(`Sent to ${sent} parent${sent !== 1 ? "s" : ""}, but ${failed} failed. Check your parent list.`);
      } else {
        toast.error("Failed to send promotion. Please try again.");
      }
      setSendDialog({ open: false, productId: null });
      setSelectedParentIds(new Set());
      setMessage("");
      setParentSearch("");
      utils.productPromotions.myList.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const selectedProduct = products.find((p) => p.id === sendDialog.productId);

  const filteredParents = useMemo(() => {
    const q = parentSearch.toLowerCase().trim();
    if (!q) return parents;
    return parents.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.email && p.email.toLowerCase().includes(q))
    );
  }, [parents, parentSearch]);

  const allFilteredSelected =
    filteredParents.length > 0 && filteredParents.every((p) => selectedParentIds.has(p.id));

  function toggleParent(id: number) {
    setSelectedParentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllFiltered() {
    setSelectedParentIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredParents.forEach((p) => next.delete(p.id));
      } else {
        filteredParents.forEach((p) => next.add(p.id));
      }
      return next;
    });
  }

  function handleSend() {
    if (!sendDialog.productId || selectedParentIds.size === 0) {
      toast.error("Please select at least one parent.");
      return;
    }
    sendMutation.mutate({
      productId: sendDialog.productId,
      parentIds: Array.from(selectedParentIds),
      message: message.trim() || undefined,
      origin: window.location.origin,
    });
  }

  function openDialog(productId: number) {
    setSendDialog({ open: true, productId });
    setSelectedParentIds(new Set());
    setMessage("");
    setParentSearch("");
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
          <p className="text-gray-500 mt-1">
            Browse available products and send promotions to your parents. Earn{" "}
            <span className="font-semibold text-green-600">$25</span> for each enrollment.
          </p>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <DollarSign className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-800">How it works</p>
            <p className="text-sm text-blue-700 mt-0.5">
              Select a product, choose one or more parents from your list, and send them the promotion. When the admin confirms their enrollment, you earn a{" "}
              <strong>$25 credit</strong> per parent automatically.
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
                      onClick={() => openDialog(product.id)}
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
      <Dialog
        open={sendDialog.open}
        onOpenChange={(open) => {
          if (!open) setSendDialog({ open: false, productId: null });
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-600" />
              Send Promotion
            </DialogTitle>
          </DialogHeader>

          {selectedProduct && (
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
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

              {/* Parent Multi-Select */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-gray-400" />
                    Select Parents
                    <span className="text-red-500">*</span>
                  </Label>
                  {selectedParentIds.size > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {selectedParentIds.size} selected
                    </Badge>
                  )}
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <Input
                    placeholder="Search by name or email…"
                    value={parentSearch}
                    onChange={(e) => setParentSearch(e.target.value)}
                    className="pl-8 h-8 text-sm"
                  />
                </div>

                {/* Select All toggle */}
                {filteredParents.length > 1 && (
                  <button
                    type="button"
                    onClick={toggleAllFiltered}
                    className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    {allFilteredSelected ? (
                      <CheckSquare className="w-3.5 h-3.5" />
                    ) : (
                      <Square className="w-3.5 h-3.5" />
                    )}
                    {allFilteredSelected ? "Deselect all" : `Select all ${filteredParents.length}`}
                  </button>
                )}

                {/* Parent list */}
                <ScrollArea className="h-44 rounded-md border bg-white">
                  {loadingParents ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    </div>
                  ) : filteredParents.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                      {parentSearch ? "No parents match your search." : "No parents available."}
                    </div>
                  ) : (
                    <div className="p-1">
                      {filteredParents.map((parent) => {
                        const checked = selectedParentIds.has(parent.id);
                        return (
                          <label
                            key={parent.id}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer transition-colors ${
                              checked
                                ? "bg-blue-50 hover:bg-blue-100"
                                : "hover:bg-gray-50"
                            }`}
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => toggleParent(parent.id)}
                              className="shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{parent.name}</p>
                              {parent.email && (
                                <p className="text-xs text-gray-400 truncate">{parent.email}</p>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </div>

              {/* Optional Message */}
              <div className="space-y-1.5">
                <Label htmlFor="promo-message">
                  Personal Message{" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </Label>
                <Textarea
                  id="promo-message"
                  placeholder="Add a personal note to accompany the promotion details…"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
                <strong>Reminder:</strong> You'll earn <strong>$25</strong> for each parent who enrolls in{" "}
                {selectedProduct.name}.
              </div>
            </div>
          )}

          <DialogFooter className="pt-2 border-t mt-2">
            <Button
              variant="outline"
              onClick={() => setSendDialog({ open: false, productId: null })}
              disabled={sendMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={selectedParentIds.size === 0 || sendMutation.isPending}
              className="gap-2"
            >
              {sendMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {selectedParentIds.size > 1
                ? `Send to ${selectedParentIds.size} Parents`
                : "Send Promotion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
