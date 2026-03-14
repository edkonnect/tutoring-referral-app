import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, Package, DollarSign, Tag, Loader2, Search,
  CheckCircle, XCircle, BarChart2, Eye, ChevronRight, LayoutTemplate,
} from "lucide-react";

type ProductForm = {
  name: string;
  description: string;
  price: string;
  category: string;
  active: boolean;
  templateId: number | null;
  referralFeeOverride: string;
};

const EMPTY_FORM: ProductForm = { name: "", description: "", price: "", category: "", active: true, templateId: null, referralFeeOverride: "" };

type Product = {
  id: number;
  name: string;
  description: string | null;
  price: string | null;
  category: string | null;
  active: boolean;
  templateId: number | null;
  referralFeeOverride: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export default function AdminProducts() {
  const utils = trpc.useUtils();
  const { data: products = [], isLoading } = trpc.products.listAll.useQuery();
  const { data: templates = [] } = trpc.promoTemplates.list.useQuery();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [createDialog, setCreateDialog] = useState(false);
  const [editProduct, setEditProduct] = useState<{ id: number } & ProductForm | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);

  const createMutation = trpc.products.create.useMutation({
    onSuccess: () => {
      toast.success("Product created successfully.");
      setCreateDialog(false);
      setForm(EMPTY_FORM);
      utils.products.listAll.invalidate();
      utils.products.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.products.update.useMutation({
    onSuccess: () => {
      toast.success("Product updated.");
      setEditProduct(null);
      utils.products.listAll.invalidate();
      utils.products.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const toggleActiveMutation = trpc.products.update.useMutation({
    onSuccess: (_data, variables) => {
      toast.success(`Product ${variables.active ? "activated" : "deactivated"}.`);
      utils.products.listAll.invalidate();
      utils.products.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.products.delete.useMutation({
    onSuccess: () => {
      toast.success("Product deleted.");
      setDeleteId(null);
      utils.products.listAll.invalidate();
      utils.products.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  // Derive unique categories
  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category).filter(Boolean) as string[]);
    return Array.from(cats).sort();
  }, [products]);

  // Stats
  const activeCount = products.filter((p) => p.active).length;
  const inactiveCount = products.length - activeCount;

  // Filtered list
  const filtered = products.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.category ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (p.description ?? "").toLowerCase().includes(search.toLowerCase());
    const matchCategory = categoryFilter === "all" || p.category === categoryFilter;
    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && p.active) ||
      (statusFilter === "inactive" && !p.active);
    return matchSearch && matchCategory && matchStatus;
  });

  function openEdit(p: Product) {
    setEditProduct({
      id: p.id,
      name: p.name,
      description: p.description ?? "",
      price: p.price ?? "",
      category: p.category ?? "",
      active: p.active,
      templateId: p.templateId ?? null,
      referralFeeOverride: p.referralFeeOverride ?? "",
    });
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Products</h1>
            <p className="text-gray-500 mt-1">Manage the products that promoters can send to parents.</p>
          </div>
          <Button onClick={() => { setForm(EMPTY_FORM); setCreateDialog(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> Add Product
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{products.length}</p>
                <p className="text-xs text-gray-500">Total Products</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
                <p className="text-xs text-gray-500">Active</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-gray-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{inactiveCount}</p>
                <p className="text-xs text-gray-500">Inactive</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Status filter */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
            {(["all", "active", "inactive"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 capitalize transition-colors ${
                  statusFilter === s
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Category filter */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setCategoryFilter("all")}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  categoryFilter === "all"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                All Categories
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    categoryFilter === cat
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Products Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">
              {search || categoryFilter !== "all" || statusFilter !== "all"
                ? "No products match your filters"
                : "No products yet"}
            </p>
            {!search && categoryFilter === "all" && statusFilter === "all" && (
              <p className="text-sm mt-1">Click "Add Product" to create your first product.</p>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Product</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Price</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Active</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{product.name}</p>
                        {product.description && (
                          <p className="text-xs text-gray-400 mt-0.5 line-clamp-1 max-w-xs">{product.description}</p>
                        )}
                        {product.templateId && (
                          <span className="inline-flex items-center gap-1 text-xs text-blue-600 mt-0.5">
                            <LayoutTemplate className="w-3 h-3" />
                            {templates.find((t) => t.id === product.templateId)?.name ?? "Custom template"}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {product.category ? (
                        <Badge variant="secondary" className="text-xs">{product.category}</Badge>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {product.price
                        ? <span className="flex items-center gap-1"><DollarSign className="w-3 h-3 text-green-600" />{Number(product.price).toFixed(2)}</span>
                        : <span className="text-gray-300">—</span>}
                      {product.referralFeeOverride != null && (
                        <span className="flex items-center gap-0.5 text-xs text-amber-600 mt-0.5">
                          <DollarSign className="w-2.5 h-2.5" />{Number(product.referralFeeOverride).toFixed(2)} fee
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {product.active ? (
                        <Badge className="bg-green-100 text-green-700 border-0 text-xs gap-1">
                          <CheckCircle className="w-3 h-3" /> Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <XCircle className="w-3 h-3" /> Inactive
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Switch
                        checked={product.active}
                        onCheckedChange={(checked) =>
                          toggleActiveMutation.mutate({ id: product.id, active: checked })
                        }
                        disabled={toggleActiveMutation.isPending}
                        aria-label={`Toggle ${product.name} active status`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewProduct(product)}
                          className="h-8 w-8 p-0 text-gray-400 hover:text-blue-600"
                          title="View details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(product)}
                          className="h-8 w-8 p-0 text-gray-400 hover:text-blue-600"
                          title="Edit product"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(product.id)}
                          className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                          title="Delete product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
              Showing {filtered.length} of {products.length} product{products.length !== 1 ? "s" : ""}
            </div>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" /> Add Product
            </DialogTitle>
          </DialogHeader>
          <ProductFormFields form={form} onChange={setForm} templates={templates} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)}>Cancel</Button>
            <Button
              onClick={() =>
                createMutation.mutate({
                  name: form.name,
                  description: form.description || undefined,
                  price: form.price || undefined,
                  category: form.category || undefined,
                  referralFeeOverride: form.referralFeeOverride || null,
                })
              }
              disabled={!form.name.trim() || createMutation.isPending}
              className="gap-2"
            >
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editProduct} onOpenChange={(open) => !open && setEditProduct(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-blue-600" /> Edit Product
            </DialogTitle>
          </DialogHeader>
          {editProduct && (
            <>
              <ProductFormFields
                form={editProduct}
                onChange={(f) => setEditProduct({ ...editProduct, ...f })}
                showActive
                templates={templates}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditProduct(null)}>Cancel</Button>
                <Button
                  onClick={() =>
                    updateMutation.mutate({
                      id: editProduct.id,
                      name: editProduct.name,
                      description: editProduct.description || undefined,
                      price: editProduct.price || undefined,
                      category: editProduct.category || undefined,
                      active: editProduct.active,
                      templateId: editProduct.templateId ?? null,
                      referralFeeOverride: editProduct.referralFeeOverride || null,
                    })
                  }
                  disabled={!editProduct.name.trim() || updateMutation.isPending}
                  className="gap-2"
                >
                  {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the product. Any promotions already sent for this product will remain in the system for record-keeping purposes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteId !== null && deleteMutation.mutate({ id: deleteId })}
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Detail Sheet */}
      <Sheet open={!!viewProduct} onOpenChange={(open) => !open && setViewProduct(null)}>
        <SheetContent className="sm:max-w-md">
          {viewProduct && (
            <>
              <SheetHeader className="pb-4">
                <SheetTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600" />
                  {viewProduct.name}
                </SheetTitle>
              </SheetHeader>
              <div className="space-y-5">
                {/* Status badge */}
                <div className="flex items-center gap-2">
                  {viewProduct.active ? (
                    <Badge className="bg-green-100 text-green-700 border-0 gap-1">
                      <CheckCircle className="w-3 h-3" /> Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <XCircle className="w-3 h-3" /> Inactive
                    </Badge>
                  )}
                  {viewProduct.category && (
                    <Badge variant="outline" className="gap-1">
                      <Tag className="w-3 h-3" /> {viewProduct.category}
                    </Badge>
                  )}
                </div>

                <Separator />

                {/* Price */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Price</p>
                    <p className="font-semibold text-gray-900">
                      {viewProduct.price ? `$${Number(viewProduct.price).toFixed(2)}` : "Not set"}
                    </p>
                  </div>
                </div>

                {/* Description */}
                {viewProduct.description && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Description</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{viewProduct.description}</p>
                  </div>
                )}

                {/* Referral Fee Override */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Referral Fee</p>
                    <p className="font-semibold text-gray-900 text-sm">
                      {viewProduct.referralFeeOverride != null
                        ? <span className="text-amber-700">${Number(viewProduct.referralFeeOverride).toFixed(2)} <span className="text-xs font-normal text-gray-400">(custom)</span></span>
                        : <span className="text-gray-400">Uses global default</span>}
                    </p>
                  </div>
                </div>

                {/* Template */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                    <LayoutTemplate className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Promo Template</p>
                    <p className="font-semibold text-gray-900 text-sm">
                      {viewProduct.templateId
                        ? (templates.find((t) => t.id === viewProduct.templateId)?.name ?? "Custom template")
                        : "Default template"}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Metadata */}
                <div className="space-y-2 text-sm text-gray-500">
                  <div className="flex justify-between">
                    <span>Created</span>
                    <span className="text-gray-700">{new Date(viewProduct.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last updated</span>
                    <span className="text-gray-700">{new Date(viewProduct.updatedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Product ID</span>
                    <span className="text-gray-700 font-mono">#{viewProduct.id}</span>
                  </div>
                </div>

                <Separator />

                {/* Quick actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={() => { openEdit(viewProduct); setViewProduct(null); }}
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => { setDeleteId(viewProduct.id); setViewProduct(null); }}
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  );
}

function ProductFormFields({
  form,
  onChange,
  showActive = false,
  templates = [],
}: {
  form: ProductForm;
  onChange: (f: ProductForm) => void;
  showActive?: boolean;
  templates?: Array<{ id: number; name: string }>;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="product-name">
          Product Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="product-name"
          placeholder="e.g. Advanced Math Tutoring"
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="product-desc">Description</Label>
        <Textarea
          id="product-desc"
          placeholder="Describe what this product includes..."
          value={form.description}
          onChange={(e) => onChange({ ...form, description: e.target.value })}
          rows={3}
          className="resize-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="product-price">Price ($)</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input
              id="product-price"
              placeholder="0.00"
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(e) => onChange({ ...form, price: e.target.value })}
              className="pl-8"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="product-category">Category</Label>
          <div className="relative">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input
              id="product-category"
              placeholder="e.g. Math, Science"
              value={form.category}
              onChange={(e) => onChange({ ...form, category: e.target.value })}
              className="pl-8"
            />
          </div>
        </div>
      </div>
      {/* Referral Fee Override */}
      <div className="space-y-1.5">
        <Label htmlFor="product-fee-override" className="flex items-center gap-1.5">
          <DollarSign className="w-3.5 h-3.5 text-amber-500" />
          Custom Referral Fee (optional)
        </Label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <Input
            id="product-fee-override"
            placeholder="Leave blank to use global default"
            type="number"
            min="0"
            step="0.01"
            value={form.referralFeeOverride}
            onChange={(e) => onChange({ ...form, referralFeeOverride: e.target.value })}
            className="pl-8"
          />
        </div>
        <p className="text-xs text-gray-400">Overrides the global referral fee for this product only. Leave blank to use the default.</p>
      </div>

      {/* Template selector */}
      <div className="space-y-1.5">
        <Label htmlFor="product-template" className="flex items-center gap-1.5">
          <LayoutTemplate className="w-3.5 h-3.5 text-blue-500" />
          Promo Email Template
        </Label>
        <Select
          value={form.templateId ? String(form.templateId) : "none"}
          onValueChange={(v) => onChange({ ...form, templateId: v === "none" ? null : parseInt(v) })}
        >
          <SelectTrigger id="product-template">
            <SelectValue placeholder="Use default template" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Use default template</SelectItem>
            {templates.map((t) => (
              <SelectItem key={t.id} value={String(t.id)}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-400">When a promoter sends this product, this template is used for the email.</p>
      </div>
      {showActive && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
          <Switch
            id="product-active"
            checked={form.active}
            onCheckedChange={(checked) => onChange({ ...form, active: checked })}
          />
          <div>
            <Label htmlFor="product-active" className="cursor-pointer">Active</Label>
            <p className="text-xs text-gray-500">Visible to promoters when active</p>
          </div>
        </div>
      )}
    </div>
  );
}
