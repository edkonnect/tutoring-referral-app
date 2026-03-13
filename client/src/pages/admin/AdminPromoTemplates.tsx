import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  FileText,
  Link2,
  LayoutTemplate,
  Info,
} from "lucide-react";

const TEMPLATE_VARS = [
  { key: "{{promoterName}}", desc: "Promoter's name" },
  { key: "{{parentName}}", desc: "Parent's name" },
  { key: "{{productName}}", desc: "Product name" },
  { key: "{{productPrice}}", desc: "Product price (e.g. $150.00)" },
  { key: "{{productDescription}}", desc: "Product description" },
  { key: "{{productCategory}}", desc: "Product category" },
  { key: "{{message}}", desc: "Promoter's personal message" },
];

type Template = {
  id: number;
  name: string;
  subject: string;
  htmlBody: string;
  textBody?: string | null;
  createdAt: Date;
};

type FormState = {
  name: string;
  subject: string;
  htmlBody: string;
  textBody: string;
};

const defaultForm: FormState = {
  name: "",
  subject: "{{promoterName}} shared a tutoring program with you: {{productName}}",
  htmlBody: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#1e40af,#3b82f6);padding:28px 32px;">
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">{{productName}}</h1>
      <p style="margin:6px 0 0;color:#bfdbfe;font-size:14px;">Recommended by {{promoterName}}</p>
    </div>
    <div style="padding:28px 32px;">
      <p>Hi <strong>{{parentName}}</strong>,</p>
      <p>{{promoterName}} thought you'd be interested in <strong>{{productName}}</strong>.</p>
      <p>{{productDescription}}</p>
      <p><strong>Price:</strong> {{productPrice}}</p>
      {{message}}
      <p style="color:#475569;font-size:14px;">Contact us to learn more or enroll.</p>
    </div>
    <div style="background:#f1f5f9;padding:16px 32px;text-align:center;">
      <p style="margin:0;color:#94a3b8;font-size:12px;">Referred by {{promoterName}}</p>
    </div>
  </div>
</body>
</html>`,
  textBody: `Hi {{parentName}},\n\n{{promoterName}} recommended {{productName}} to you.\n\n{{productDescription}}\n\nPrice: {{productPrice}}\n\n{{message}}\n\nContact us to learn more.`,
};

function interpolatePreview(str: string) {
  const vars: Record<string, string> = {
    promoterName: "Jane Smith",
    parentName: "Mr. Johnson",
    productName: "Advanced Math Tutoring",
    productPrice: "$150.00",
    productDescription: "Personalized one-on-one math tutoring for grades 6–12.",
    productCategory: "Mathematics",
    message: "I think this would be perfect for your son!",
  };
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

export default function AdminPromoTemplates() {
  const utils = trpc.useUtils();
  const { data: templates = [], isLoading } = trpc.promoTemplates.list.useQuery();
  const { data: products = [] } = trpc.products.list.useQuery();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<Template | null>(null);
  const [deleteTemplate, setDeleteTemplate] = useState<Template | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [associateOpen, setAssociateOpen] = useState(false);
  const [associateTemplateId, setAssociateTemplateId] = useState<number | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [form, setForm] = useState<FormState>(defaultForm);

  const createMutation = trpc.promoTemplates.create.useMutation({
    onSuccess: () => {
      utils.promoTemplates.list.invalidate();
      setCreateOpen(false);
      setForm(defaultForm);
      toast.success("Template created successfully");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.promoTemplates.update.useMutation({
    onSuccess: () => {
      utils.promoTemplates.list.invalidate();
      setEditTemplate(null);
      toast.success("Template updated");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.promoTemplates.delete.useMutation({
    onSuccess: () => {
      utils.promoTemplates.list.invalidate();
      setDeleteTemplate(null);
      toast.success("Template deleted");
    },
    onError: (e) => toast.error(e.message),
  });

  const associateMutation = trpc.promoTemplates.associate.useMutation({
    onSuccess: () => {
      utils.products.list.invalidate();
      setAssociateOpen(false);
      setSelectedProductId("");
      setAssociateTemplateId(null);
      toast.success("Template associated with product");
    },
    onError: (e) => toast.error(e.message),
  });

  const openCreate = () => {
    setForm(defaultForm);
    setCreateOpen(true);
  };

  const openEdit = (t: Template) => {
    setForm({ name: t.name, subject: t.subject, htmlBody: t.htmlBody, textBody: t.textBody ?? "" });
    setEditTemplate(t);
  };

  const openAssociate = (templateId: number) => {
    setAssociateTemplateId(templateId);
    setSelectedProductId("");
    setAssociateOpen(true);
  };

  const handleCreate = () => {
    if (!form.name || !form.subject || !form.htmlBody) {
      toast.error("Name, subject, and HTML body are required");
      return;
    }
    createMutation.mutate(form);
  };

  const handleUpdate = () => {
    if (!editTemplate) return;
    updateMutation.mutate({ id: editTemplate.id, ...form });
  };

  const handleAssociate = () => {
    if (!associateTemplateId || !selectedProductId) {
      toast.error("Please select a product");
      return;
    }
    associateMutation.mutate({ productId: parseInt(selectedProductId), templateId: associateTemplateId });
  };

  const TemplateForm = ({ onSubmit, loading }: { onSubmit: () => void; loading: boolean }) => (
    <div className="space-y-4">
      {/* Variable reference */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
        <div className="flex items-center gap-2 mb-2">
          <Info className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-800">Available Variables</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {TEMPLATE_VARS.map((v) => (
            <button
              key={v.key}
              type="button"
              title={v.desc}
              onClick={() => navigator.clipboard.writeText(v.key).then(() => toast.success(`Copied ${v.key}`))}
              className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-0.5 rounded font-mono cursor-pointer transition-colors"
            >
              {v.key}
            </button>
          ))}
        </div>
        <p className="text-xs text-blue-600 mt-1">Click a variable to copy it. These are replaced with real values when the email is sent.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-1">
          <Label>Template Name *</Label>
          <Input
            placeholder="e.g. Math Tutoring Promo"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>
        <div className="col-span-2 space-y-1">
          <Label>Email Subject *</Label>
          <Input
            placeholder="e.g. {{promoterName}} recommended {{productName}} for you"
            value={form.subject}
            onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
          />
        </div>
      </div>

      <Tabs defaultValue="html">
        <TabsList>
          <TabsTrigger value="html">HTML Body *</TabsTrigger>
          <TabsTrigger value="text">Plain Text (optional)</TabsTrigger>
          <TabsTrigger value="preview">Live Preview</TabsTrigger>
        </TabsList>
        <TabsContent value="html" className="space-y-1">
          <Textarea
            className="font-mono text-xs min-h-[260px]"
            placeholder="Enter HTML email body..."
            value={form.htmlBody}
            onChange={(e) => setForm((f) => ({ ...f, htmlBody: e.target.value }))}
          />
        </TabsContent>
        <TabsContent value="text" className="space-y-1">
          <Textarea
            className="font-mono text-xs min-h-[200px]"
            placeholder="Plain text fallback for non-HTML email clients..."
            value={form.textBody}
            onChange={(e) => setForm((f) => ({ ...f, textBody: e.target.value }))}
          />
        </TabsContent>
        <TabsContent value="preview">
          <div className="border rounded-lg overflow-hidden bg-white">
            <div className="bg-gray-100 px-4 py-2 border-b text-xs text-gray-500 font-medium">
              Preview (with sample data) — Subject: {interpolatePreview(form.subject)}
            </div>
            <iframe
              srcDoc={interpolatePreview(form.htmlBody)}
              className="w-full h-[300px]"
              sandbox="allow-same-origin"
              title="Email Preview"
            />
          </div>
        </TabsContent>
      </Tabs>

      <DialogFooter>
        <Button onClick={onSubmit} disabled={loading}>
          {loading ? "Saving..." : "Save Template"}
        </Button>
      </DialogFooter>
    </div>
  );

  // Map product id -> template name for display
  const productTemplateMap = Object.fromEntries(
    (products as Array<{ id: number; templateId?: number | null }>)
      .filter((p) => p.templateId)
      .map((p) => [p.templateId, templates.find((t) => t.id === p.templateId)?.name])
  );

  const productsUsingTemplate = (templateId: number) =>
    (products as Array<{ id: number; name: string; templateId?: number | null }>).filter(
      (p) => p.templateId === templateId
    );

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Promo Email Templates</h1>
            <p className="text-sm text-gray-500 mt-1">
              Create reusable HTML email templates and associate them with products. When a promoter sends a promotion, the product's template is used automatically.
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <LayoutTemplate className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{templates.length}</p>
                  <p className="text-xs text-gray-500">Total Templates</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <Link2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {(products as Array<{ templateId?: number | null }>).filter((p) => p.templateId).length}
                  </p>
                  <p className="text-xs text-gray-500">Products with Template</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100">
                  <FileText className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {(products as Array<{ templateId?: number | null }>).filter((p) => !p.templateId).length}
                  </p>
                  <p className="text-xs text-gray-500">Using Default Template</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Template list */}
        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Loading templates...</div>
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <LayoutTemplate className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No templates yet</p>
              <p className="text-sm text-gray-400 mt-1">Create your first promotional email template to get started.</p>
              <Button className="mt-4" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {templates.map((t) => {
              const usedBy = productsUsingTemplate(t.id);
              return (
                <Card key={t.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-base">{t.name}</CardTitle>
                          {usedBy.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {usedBy.length} product{usedBy.length > 1 ? "s" : ""}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1 truncate">
                          <span className="font-medium text-gray-600">Subject: </span>
                          {t.subject}
                        </p>
                        {usedBy.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {usedBy.map((p) => (
                              <Badge key={p.id} variant="outline" className="text-xs">
                                {p.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPreviewTemplate(t)}
                          title="Preview"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openAssociate(t.id)}
                          title="Associate with product"
                        >
                          <Link2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEdit(t)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setDeleteTemplate(t)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Promo Template</DialogTitle>
          </DialogHeader>
          <TemplateForm onSubmit={handleCreate} loading={createMutation.isPending} />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTemplate} onOpenChange={(o) => !o && setEditTemplate(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Template — {editTemplate?.name}</DialogTitle>
          </DialogHeader>
          <TemplateForm onSubmit={handleUpdate} loading={updateMutation.isPending} />
        </DialogContent>
      </Dialog>

      {/* Associate Dialog */}
      <Dialog open={associateOpen} onOpenChange={setAssociateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Associate Template with Product</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-600">
              Select a product to associate with this template. When a promoter sends a promotion for that product, this template will be used for the email.
            </p>
            <div className="space-y-1">
              <Label>Product</Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a product..." />
                </SelectTrigger>
                <SelectContent>
                  {(products as Array<{ id: number; name: string; templateId?: number | null }>).map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                      {p.templateId && p.templateId !== associateTemplateId
                        ? ` (using: ${productTemplateMap[p.templateId] ?? "another template"})`
                        : p.templateId === associateTemplateId
                        ? " (already using this template)"
                        : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssociateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssociate} disabled={associateMutation.isPending || !selectedProductId}>
              {associateMutation.isPending ? "Saving..." : "Associate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Sheet */}
      <Sheet open={!!previewTemplate} onOpenChange={(o) => !o && setPreviewTemplate(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Preview — {previewTemplate?.name}</SheetTitle>
          </SheetHeader>
          {previewTemplate && (
            <div className="mt-4 space-y-4">
              <div className="rounded-lg bg-gray-50 border p-3">
                <p className="text-xs text-gray-500 font-medium mb-1">Subject (with sample data)</p>
                <p className="text-sm font-medium">{interpolatePreview(previewTemplate.subject)}</p>
              </div>
              <Tabs defaultValue="html">
                <TabsList>
                  <TabsTrigger value="html">HTML Preview</TabsTrigger>
                  <TabsTrigger value="source">HTML Source</TabsTrigger>
                  {previewTemplate.textBody && <TabsTrigger value="text">Plain Text</TabsTrigger>}
                </TabsList>
                <TabsContent value="html">
                  <div className="border rounded-lg overflow-hidden">
                    <iframe
                      srcDoc={interpolatePreview(previewTemplate.htmlBody)}
                      className="w-full h-[500px]"
                      sandbox="allow-same-origin"
                      title="Email Preview"
                    />
                  </div>
                </TabsContent>
                <TabsContent value="source">
                  <pre className="text-xs bg-gray-50 border rounded-lg p-4 overflow-auto max-h-[500px] whitespace-pre-wrap">
                    {previewTemplate.htmlBody}
                  </pre>
                </TabsContent>
                {previewTemplate.textBody && (
                  <TabsContent value="text">
                    <pre className="text-xs bg-gray-50 border rounded-lg p-4 overflow-auto max-h-[500px] whitespace-pre-wrap">
                      {interpolatePreview(previewTemplate.textBody)}
                    </pre>
                  </TabsContent>
                )}
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTemplate} onOpenChange={(o) => !o && setDeleteTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTemplate?.name}</strong>? This will also remove its association from any products using it. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteTemplate && deleteMutation.mutate({ id: deleteTemplate.id })}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
