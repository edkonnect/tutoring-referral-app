import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
  Plus,
  Pencil,
  Trash2,
  Mail,
  Phone,
  Users,
  GraduationCap,
  Search,
  FileText,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function PromoterParents() {
  const utils = trpc.useUtils();
  const [, navigate] = useLocation();

  const { data: parents = [], isLoading } = trpc.parents.list.useQuery();
  const { data: allStudents = [] } = trpc.students.listByPromoter.useQuery();

  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const deleteTarget = parents.find((p) => p.id === deleteId);

  const studentCountMap = useMemo(() => {
    const map = new Map<number, number>();
    for (const s of allStudents) {
      map.set(s.parentId, (map.get(s.parentId) ?? 0) + 1);
    }
    return map;
  }, [allStudents]);

  const enrolledCountMap = useMemo(() => {
    const map = new Map<number, number>();
    for (const s of allStudents) {
      if (s.enrolled) map.set(s.parentId, (map.get(s.parentId) ?? 0) + 1);
    }
    return map;
  }, [allStudents]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return parents.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        (p.phone ?? "").toLowerCase().includes(q)
    );
  }, [parents, search]);

  const deleteMutation = trpc.parents.delete.useMutation({
    onSuccess: () => {
      utils.parents.list.invalidate();
      utils.promoter.getStats.invalidate();
      utils.students.listByPromoter.invalidate();
      toast.success("Parent removed successfully.");
      setDeleteId(null);
    },
    onError: (e) => {
      toast.error(e.message);
      setDeleteId(null);
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">My Parents</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Manage your referred parents and their students.
            </p>
          </div>
          <Button onClick={() => navigate("/promoter/parents/new")} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" />
            Add Parent
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name, email, or phone…"
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
              {search ? "No parents match your search" : "No parents yet"}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {search
                ? "Try a different name, email, or phone."
                : "Add your first referred parent to get started."}
            </p>
            {!search && (
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => navigate("/promoter/parents/new")}
              >
                <Plus className="h-4 w-4" />
                Add Parent
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((p) => {
              const studentCount = studentCountMap.get(p.id) ?? 0;
              const enrolledCount = enrolledCountMap.get(p.id) ?? 0;
              return (
                <Card key={p.id} className="border shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      {/* Info */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-foreground">{p.name}</p>
                            {enrolledCount > 0 && (
                              <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200">
                                {enrolledCount} enrolled
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Mail className="h-3.5 w-3.5" />
                              {p.email}
                            </span>
                            {p.phone && (
                              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <Phone className="h-3.5 w-3.5" />
                                {p.phone}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <GraduationCap className="h-3 w-3" />
                              {studentCount} student{studentCount !== 1 ? "s" : ""}
                            </span>
                            {p.notes && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <FileText className="h-3 w-3" />
                                <span className="truncate max-w-[200px]">{p.notes}</span>
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
                          title="Edit parent"
                          onClick={() => navigate(`/promoter/parents/${p.id}/edit`)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          title="Delete parent"
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

      {/* Delete Confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Parent</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <strong>{deleteTarget?.name ?? "this parent"}</strong> and all their associated
              students? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId !== null && deleteMutation.mutate({ id: deleteId })}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
