import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { trpc } from "@/lib/trpc";
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Mail,
  User,
  Link2,
  Copy,
  ExternalLink,
  Search,
  Calendar,
  Eye,
  Send,
  Loader2,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type PromoterForm = { name: string; email: string };
type FormErrors = Partial<Record<keyof PromoterForm, string>>;
const emptyForm: PromoterForm = { name: "", email: "" };

function validateForm(form: PromoterForm): FormErrors {
  const errs: FormErrors = {};
  if (!form.name.trim()) errs.name = "Name is required.";
  if (!form.email.trim()) {
    errs.email = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errs.email = "Enter a valid email address.";
  }
  return errs;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminPromoters() {
  const utils = trpc.useUtils();

  const { data: promoters = [], isLoading } = trpc.admin.listPromoters.useQuery();
  const { data: visitStats = [] } = trpc.referralLink.getAllVisitStats.useQuery();

  // ── Search ──
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return promoters.filter(
      (p) =>
        (p.name ?? "").toLowerCase().includes(q) ||
        (p.email ?? "").toLowerCase().includes(q)
    );
  }, [promoters, search]);

  // ── Create dialog state ──
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<PromoterForm>(emptyForm);
  const [createErrors, setCreateErrors] = useState<FormErrors>({});

  // ── Edit dialog state ──
  const [editTarget, setEditTarget] = useState<{ id: number } | null>(null);
  const [editForm, setEditForm] = useState<PromoterForm>(emptyForm);
  const [editErrors, setEditErrors] = useState<FormErrors>({});

  // ── Delete confirmation state ──
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const deleteTarget = promoters.find((p) => p.id === deleteId);

  // ── Mutations ──
  const createMutation = trpc.admin.createPromoter.useMutation({
    onSuccess: () => {
      toast.success("Promoter created successfully.");
      utils.admin.listPromoters.invalidate();
      setCreateOpen(false);
      setCreateForm(emptyForm);
      setCreateErrors({});
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.admin.updatePromoter.useMutation({
    onSuccess: () => {
      toast.success("Promoter updated.");
      utils.admin.listPromoters.invalidate();
      setEditTarget(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const resendInviteMutation = trpc.admin.resendInvite.useMutation({
    onSuccess: () => toast.success("Invitation email resent!"),
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.admin.deletePromoter.useMutation({
    onSuccess: () => {
      toast.success("Promoter deleted.");
      utils.admin.listPromoters.invalidate();
      setDeleteId(null);
    },
    onError: (e) => {
      toast.error(e.message);
      setDeleteId(null);
    },
  });

  // ── Handlers ──
  const handleCreate = () => {
    const errs = validateForm(createForm);
    if (Object.keys(errs).length > 0) { setCreateErrors(errs); return; }
    createMutation.mutate({ ...createForm, origin: window.location.origin });
  };

  const openEdit = (p: { id: number; name: string | null; email: string | null }) => {
    setEditTarget({ id: p.id });
    setEditForm({ name: p.name ?? "", email: p.email ?? "" });
    setEditErrors({});
  };

  const handleUpdate = () => {
    if (!editTarget) return;
    const errs = validateForm(editForm);
    if (Object.keys(errs).length > 0) { setEditErrors(errs); return; }
    updateMutation.mutate({ id: editTarget.id, ...editForm });
  };

  const visitMap = useMemo(
    () => new Map(visitStats.map((s) => [s.promoterId, s.total])),
    [visitStats]
  );

  const getReferralLink = (token: string | null) =>
    token ? `${window.location.origin}/refer/${token}` : null;

  const copyLink = (token: string | null) => {
    const link = getReferralLink(token);
    if (!link) { toast.info("This promoter has not generated a referral link yet."); return; }
    navigator.clipboard.writeText(link);
    toast.success("Referral link copied!");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Promoters</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Manage all promoters in the referral program.
            </p>
          </div>
          <Button
            className="gap-2 shrink-0"
            onClick={() => { setCreateForm(emptyForm); setCreateErrors({}); setCreateOpen(true); }}
          >
            <Plus className="h-4 w-4" />
            Add Promoter
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground mb-1">
              {search ? "No promoters match your search" : "No promoters yet"}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {search
                ? "Try a different name or email."
                : "Add your first promoter to get started."}
            </p>
            {!search && (
              <Button variant="outline" className="gap-2" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                Add Promoter
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((p) => {
              const visitCount = visitMap.get(p.id) ?? 0;
              const referralLink = getReferralLink(p.referralToken ?? null);
              return (
                <Card key={p.id} className="border shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      {/* Avatar + info */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-foreground">{p.name ?? "—"}</p>
                            <Badge variant="secondary" className="text-xs font-normal">Promoter</Badge>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                            {p.email && (
                              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <Mail className="h-3.5 w-3.5" />
                                {p.email}
                              </span>
                            )}
                            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Calendar className="h-3.5 w-3.5" />
                              Joined {new Date(p.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          {/* Referral link row */}
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Eye className="h-3 w-3" />
                              {visitCount} link visit{visitCount !== 1 ? "s" : ""}
                            </span>
                            {referralLink ? (
                              <>
                                <button
                                  onClick={() => copyLink(p.referralToken ?? null)}
                                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                                >
                                  <Copy className="h-3 w-3" />
                                  Copy link
                                </button>
                                <a
                                  href={referralLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  Preview
                                </a>
                              </>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground italic">
                                <Link2 className="h-3 w-3" />
                                No referral link yet
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Resend invite email"
                          disabled={resendInviteMutation.isPending}
                          onClick={() => resendInviteMutation.mutate({ promoterId: p.id, origin: window.location.origin })}
                        >
                          {resendInviteMutation.isPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Send className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Edit promoter"
                          onClick={() => openEdit(p)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          title="Delete promoter"
                          onClick={() => setDeleteId(p.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Create Dialog ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Promoter</DialogTitle>
            <DialogDescription>
              Create a promoter account. They can log in with this email to access their dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-1.5">
              <Label>Full Name <span className="text-destructive">*</span></Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="e.g. Sarah Johnson"
                  value={createForm.name}
                  onChange={(e) => {
                    setCreateForm({ ...createForm, name: e.target.value });
                    if (createErrors.name) setCreateErrors({ ...createErrors, name: undefined });
                  }}
                />
              </div>
              {createErrors.name && <p className="text-xs text-destructive">{createErrors.name}</p>}
            </div>
            <div className="grid gap-1.5">
              <Label>Email Address <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  type="email"
                  placeholder="sarah@example.com"
                  value={createForm.email}
                  onChange={(e) => {
                    setCreateForm({ ...createForm, email: e.target.value });
                    if (createErrors.email) setCreateErrors({ ...createErrors, email: undefined });
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                />
              </div>
              {createErrors.email && <p className="text-xs text-destructive">{createErrors.email}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending} className="gap-2">
              {createMutation.isPending ? (
                <>
                  <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Create Promoter
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ── */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Promoter</DialogTitle>
            <DialogDescription>Update the promoter's name or email address.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-1.5">
              <Label>Full Name <span className="text-destructive">*</span></Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Full name"
                  value={editForm.name}
                  onChange={(e) => {
                    setEditForm({ ...editForm, name: e.target.value });
                    if (editErrors.name) setEditErrors({ ...editErrors, name: undefined });
                  }}
                />
              </div>
              {editErrors.name && <p className="text-xs text-destructive">{editErrors.name}</p>}
            </div>
            <div className="grid gap-1.5">
              <Label>Email Address <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  type="email"
                  placeholder="email@example.com"
                  value={editForm.email}
                  onChange={(e) => {
                    setEditForm({ ...editForm, email: e.target.value });
                    if (editErrors.email) setEditErrors({ ...editErrors, email: undefined });
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleUpdate()}
                />
              </div>
              {editErrors.email && <p className="text-xs text-destructive">{editErrors.email}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending} className="gap-2">
              {updateMutation.isPending ? (
                <>
                  <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Saving…
                </>
              ) : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Promoter</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deleteTarget?.name ?? "this promoter"}</strong>? This action cannot be
              undone. Promoters with active referrals cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId !== null && deleteMutation.mutate({ id: deleteId })}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
