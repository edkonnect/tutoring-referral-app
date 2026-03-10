import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Package, DollarSign, Tag, Loader2, Search } from "lucide-react";

type ProductForm = {
  name: string;
  description: string;
  price: string;
  category: string;
  active: boolean;
};

const EMPTY_FORM: ProductForm = { name: "", description: "", price: "", category: "", active: true };

export default function AdminProducts() {
  const utils = trpc.useUtils();
  const { data: products = [], isLoading } = trpc.products.listAll.useQuery();

  const [search, setSearch] = useState("");
  const [createDialog, setCreateDialog] = useState(false);
  const [editProduct, setEditProduct] = useState<{ id: number } & ProductForm | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
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

  const deleteMutation = trpc.products.delete.useMutation({
    onSuccess: () => {
      toast.success("Product deleted.");
      setDeleteId(null);
      utils.products.listAll.invalidate();
      utils.products.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.category ?? "").toLowerCase().includes(search.toLowerCase())
  );

  function openEdit(p: (typeof products)[0]) {
    setEditProduct({
      id: p.id,
      name: p.name,
      description: p.description ?? "",
      price: p.price ?? "",
      category: p.category ?? "",
      active: p.active,
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

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by name or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Products Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">{search ? "No products match your search" : "No products yet"}</p>
            {!search && <p className="text-sm mt-1">Click "Add Product" to create your first product.</p>}
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
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{product.name}</p>
                        {product.description && (
                          <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{product.description}</p>
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
                      {product.price ? `$${Number(product.price).toFixed(2)}` : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {product.active ? (
                        <Badge className="bg-green-100 text-green-700 border-0 text-xs">Active</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Inactive</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(product)} className="h-8 w-8 p-0">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(product.id)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
          <ProductFormFields form={form} onChange={setForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate({ name: form.name, description: form.description || undefined, price: form.price || undefined, category: form.category || undefined })}
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
              <ProductFormFields form={editProduct} onChange={(f) => setEditProduct({ ...editProduct, ...f })} showActive />
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
              This will permanently delete the product. Any promotions already sent for this product will remain in the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteId !== null && deleteMutation.mutate({ id: deleteId })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

function ProductFormFields({
  form,
  onChange,
  showActive = false,
}: {
  form: ProductForm;
  onChange: (f: ProductForm) => void;
  showActive?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="product-name">Product Name <span className="text-red-500">*</span></Label>
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
          <Input
            id="product-price"
            placeholder="e.g. 120.00"
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            onChange={(e) => onChange({ ...form, price: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="product-category">Category</Label>
          <Input
            id="product-category"
            placeholder="e.g. Math, Science"
            value={form.category}
            onChange={(e) => onChange({ ...form, category: e.target.value })}
          />
        </div>
      </div>
      {showActive && (
        <div className="flex items-center gap-3">
          <Switch
            id="product-active"
            checked={form.active}
            onCheckedChange={(checked) => onChange({ ...form, active: checked })}
          />
          <Label htmlFor="product-active">Active (visible to promoters)</Label>
        </div>
      )}
    </div>
  );
}
