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
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Package, Send, DollarSign, Loader2, Search, Users, CheckSquare, Square, BookOpen, X } from "lucide-react";

export default function PromoterProducts() {
  const utils = trpc.useUtils();
  const { data: products = [], isLoading: loadingProducts } = trpc.products.list.useQuery();
  const { data: parents = [], isLoading: loadingParents } = trpc.parents.list.useQuery();

  const [pageSearch, setPageSearch] = useState("");
  const [appliedPageSearch, setAppliedPageSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<number>>(new Set());
  const [selectedParentIds, setSelectedParentIds] = useState<Set<number>>(new Set());
  const [message, setMessage] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [parentSearch, setParentSearch] = useState("");

  const sendMutation = trpc.productPromotions.send.useMutation({
    onSuccess: (data) => {
      const { sent, failed } = data;
      const productCount = selectedProductIds.size;
      const parentCount = selectedParentIds.size;
      if (failed === 0) {
        toast.success(`Sent ${sent} promotion${sent !== 1 ? "s" : ""} (${productCount} product${productCount !== 1 ? "s" : ""} x ${parentCount} parent${parentCount !== 1 ? "s" : ""})!`);
      } else if (sent > 0) {
        toast.warning(`Sent ${sent}, but ${failed} failed. Check your selections.`);
      } else {
        toast.error("Failed to send promotions. Please try again.");
      }
      closeDialog();
      utils.productPromotions.myList.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  function openDialog(preSelectProductId?: number) {
    setSelectedProductIds(preSelectProductId ? new Set([preSelectProductId]) : new Set());
    setSelectedParentIds(new Set());
    setMessage("");
    setProductSearch("");
    setParentSearch("");
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setSelectedProductIds(new Set());
    setSelectedParentIds(new Set());
    setMessage("");
    setProductSearch("");
    setParentSearch("");
  }

  const pageFilteredProducts = useMemo(() => {
    const q = appliedPageSearch.toLowerCase().trim();
    if (!q) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.category && p.category.toLowerCase().includes(q))
    );
  }, [products, appliedPageSearch]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.toLowerCase().trim();
    if (!q) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.category && p.category.toLowerCase().includes(q))
    );
  }, [products, productSearch]);

  const filteredParents = useMemo(() => {
    const q = parentSearch.toLowerCase().trim();
    if (!q) return parents;
    return parents.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.email && p.email.toLowerCase().includes(q))
    );
  }, [parents, parentSearch]);

  const allProductsSelected = filteredProducts.length > 0 && filteredProducts.every((p) => selectedProductIds.has(p.id));
  const allParentsSelected = filteredParents.length > 0 && filteredParents.every((p) => selectedParentIds.has(p.id));

  function toggleProduct(id: number) {
    setSelectedProductIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }
  function toggleParent(id: number) {
    setSelectedParentIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }
  function toggleAllProducts() {
    setSelectedProductIds((prev) => { const next = new Set(prev); if (allProductsSelected) filteredProducts.forEach((p) => next.delete(p.id)); else filteredProducts.forEach((p) => next.add(p.id)); return next; });
  }
  function toggleAllParents() {
    setSelectedParentIds((prev) => { const next = new Set(prev); if (allParentsSelected) filteredParents.forEach((p) => next.delete(p.id)); else filteredParents.forEach((p) => next.add(p.id)); return next; });
  }
  function handleSend() {
    if (selectedProductIds.size === 0) { toast.error("Please select at least one product."); return; }
    if (selectedParentIds.size === 0) { toast.error("Please select at least one parent."); return; }
    sendMutation.mutate({ productIds: Array.from(selectedProductIds), parentIds: Array.from(selectedParentIds), message: message.trim() || undefined, origin: window.location.origin });
  }

  const totalPromotions = selectedProductIds.size * selectedParentIds.size;
  const CATEGORY_COLORS: Record<string, string> = {
    Math: "bg-blue-100 text-blue-700", Science: "bg-green-100 text-green-700",
    English: "bg-purple-100 text-purple-700", Coding: "bg-orange-100 text-orange-700",
    Music: "bg-pink-100 text-pink-700", Art: "bg-yellow-100 text-yellow-700",
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Products</h1>
            <p className="text-gray-500 mt-1">Browse available products and send promotions to your parents.</p>
          </div>
          <Button onClick={() => openDialog()} disabled={products.length === 0 || parents.length === 0} className="gap-2 shrink-0">
            <Send className="w-4 h-4" />
            Send Promotions
          </Button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <DollarSign className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-800">How it works</p>
            <p className="text-sm text-blue-700 mt-0.5">
              Click <strong>Send Promotions</strong> to select one or more products and one or more parents. Each parent receives a personalised email with a registration link. When the admin confirms their enrollment, you earn a referral credit automatically.
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by product name or subject..."
              value={pageSearch}
              onChange={(e) => setPageSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setAppliedPageSearch(pageSearch)}
              className="pl-9"
            />
          </div>
          <Button onClick={() => setAppliedPageSearch(pageSearch)} className="gap-2">
            <Search className="w-4 h-4" />
            Search
          </Button>
          {appliedPageSearch && (
            <Button variant="outline" onClick={() => { setPageSearch(""); setAppliedPageSearch(""); }} className="gap-2">
              <X className="w-4 h-4" />
              Clear
            </Button>
          )}
        </div>

        {appliedPageSearch && (
          <p className="text-sm text-gray-500">
            Showing {pageFilteredProducts.length} result{pageFilteredProducts.length !== 1 ? "s" : ""} for "{appliedPageSearch}"
          </p>
        )}

        {loadingProducts ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : pageFilteredProducts.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">
              {appliedPageSearch ? "No products match your search" : "No products available yet"}
            </p>
            <p className="text-sm mt-1">
              {appliedPageSearch ? "Try a different product name or subject." : "Check back later — the admin will add products you can promote."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pageFilteredProducts.map((product) => (
              <Card key={product.id} className="hover:shadow-md transition-shadow border border-gray-200">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base font-semibold text-gray-900 leading-tight">{product.name}</CardTitle>
                      {product.category && (
                        <span className={`inline-block mt-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[product.category] ?? "bg-gray-100 text-gray-600"}`}>
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
                      <span className="text-sm font-semibold">
                        {product.referralFeeOverride ? `$${Number(product.referralFeeOverride).toFixed(2)} credit` : "Credit on enrollment"}
                      </span>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => openDialog(product.id)} disabled={parents.length === 0} className="gap-1.5">
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

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-600" />
              Send Promotions
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-5 pr-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5 text-sm font-medium">
                    <BookOpen className="w-3.5 h-3.5 text-gray-400" />
                    Products <span className="text-red-500">*</span>
                  </Label>
                  {selectedProductIds.size > 0 && <Badge variant="secondary" className="text-xs">{selectedProductIds.size} selected</Badge>}
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <Input placeholder="Search products..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} className="pl-8 h-8 text-sm" />
                </div>
                {filteredProducts.length > 1 && (
                  <button type="button" onClick={toggleAllProducts} className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800 font-medium">
                    {allProductsSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                    {allProductsSelected ? "Deselect all" : "Select all"}
                  </button>
                )}
                <ScrollArea className="h-52 rounded-md border bg-white">
                  {loadingProducts ? <div className="flex items-center justify-center h-full"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
                  : filteredProducts.length === 0 ? <div className="flex items-center justify-center h-full text-gray-400 text-sm p-4 text-center">{productSearch ? "No products match." : "No products available."}</div>
                  : <div className="p-1">{filteredProducts.map((product) => {
                    const checked = selectedProductIds.has(product.id);
                    return (
                      <label key={product.id} className={`flex items-start gap-3 px-3 py-2.5 rounded-md cursor-pointer transition-colors ${checked ? "bg-blue-50 hover:bg-blue-100" : "hover:bg-gray-50"}`}>
                        <Checkbox checked={checked} onCheckedChange={() => toggleProduct(product.id)} className="shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate leading-tight">{product.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {product.category && <span className="text-xs text-gray-400">{product.category}</span>}
                            {product.price && <span className="text-xs text-gray-500 font-medium">${Number(product.price).toFixed(2)}</span>}
                          </div>
                        </div>
                      </label>
                    );
                  })}</div>}
                </ScrollArea>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5 text-sm font-medium">
                    <Users className="w-3.5 h-3.5 text-gray-400" />
                    Parents <span className="text-red-500">*</span>
                  </Label>
                  {selectedParentIds.size > 0 && <Badge variant="secondary" className="text-xs">{selectedParentIds.size} selected</Badge>}
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <Input placeholder="Search parents..." value={parentSearch} onChange={(e) => setParentSearch(e.target.value)} className="pl-8 h-8 text-sm" />
                </div>
                {filteredParents.length > 1 && (
                  <button type="button" onClick={toggleAllParents} className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800 font-medium">
                    {allParentsSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                    {allParentsSelected ? "Deselect all" : "Select all"}
                  </button>
                )}
                <ScrollArea className="h-52 rounded-md border bg-white">
                  {loadingParents ? <div className="flex items-center justify-center h-full"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
                  : filteredParents.length === 0 ? <div className="flex items-center justify-center h-full text-gray-400 text-sm p-4 text-center">{parentSearch ? "No parents match." : "No parents available."}</div>
                  : <div className="p-1">{filteredParents.map((parent) => {
                    const checked = selectedParentIds.has(parent.id);
                    return (
                      <label key={parent.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer transition-colors ${checked ? "bg-blue-50 hover:bg-blue-100" : "hover:bg-gray-50"}`}>
                        <Checkbox checked={checked} onCheckedChange={() => toggleParent(parent.id)} className="shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{parent.name}</p>
                          {parent.email && <p className="text-xs text-gray-400 truncate">{parent.email}</p>}
                        </div>
                      </label>
                    );
                  })}</div>}
                </ScrollArea>
              </div>
            </div>

            {totalPromotions > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700 flex items-center gap-2">
                <Send className="w-4 h-4 shrink-0" />
                <span>This will send <strong>{totalPromotions} email{totalPromotions !== 1 ? "s" : ""}</strong> — <strong>{selectedProductIds.size} product{selectedProductIds.size !== 1 ? "s" : ""}</strong> to <strong>{selectedParentIds.size} parent{selectedParentIds.size !== 1 ? "s" : ""}</strong>.</span>
              </div>
            )}
            <Separator />
            <div className="space-y-1.5">
              <Label htmlFor="promo-message">Personal Message <span className="text-gray-400 font-normal">(optional)</span></Label>
              <Textarea id="promo-message" placeholder="Add a personal note to accompany the promotion details..." value={message} onChange={(e) => setMessage(e.target.value)} rows={3} className="resize-none" />
            </div>
          </div>
          <DialogFooter className="pt-2 border-t mt-2">
            <Button variant="outline" onClick={closeDialog} disabled={sendMutation.isPending}>Cancel</Button>
            <Button onClick={handleSend} disabled={selectedProductIds.size === 0 || selectedParentIds.size === 0 || sendMutation.isPending} className="gap-2">
              {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {totalPromotions > 0 ? `Send ${totalPromotions} Promotion${totalPromotions !== 1 ? "s" : ""}` : "Send Promotions"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
