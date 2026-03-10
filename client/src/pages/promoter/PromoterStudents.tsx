import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  Plus,
  Pencil,
  Trash2,
  GraduationCap,
  CheckCircle,
  Clock,
  Search,
  User,
  BookOpen,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

const GRADE_LEVELS = [
  "Pre-K", "Kindergarten", "Grade 1", "Grade 2", "Grade 3", "Grade 4",
  "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10",
  "Grade 11", "Grade 12", "College", "Adult",
];

const SUBJECTS = [
  "Math", "English", "Science", "History", "Reading", "Writing", "SAT/ACT Prep", "Other",
];

type StudentForm = {
  parentId: string;
  name: string;
  age: string;
  gradeLevel: string;
  subjects: string[];
};

const emptyForm: StudentForm = { parentId: "", name: "", age: "", gradeLevel: "", subjects: [] };

export default function PromoterStudents() {
  const utils = trpc.useUtils();

  const { data: parents = [] } = trpc.parents.list.useQuery();
  const { data: students = [], isLoading } = trpc.students.listByPromoter.useQuery();

  const [search, setSearch] = useState("");
  const [filterParent, setFilterParent] = useState<string>("all");

  // ── Dialog state ──
  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<StudentForm>(emptyForm);
  const [formErrors, setFormErrors] = useState<{ name?: string; parentId?: string }>({});

  // ── Delete state ──
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const deleteTarget = students.find((s) => s.id === deleteId);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return students.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(q) ||
        (s.gradeLevel ?? "").toLowerCase().includes(q) ||
        (s.subjects ?? "").toLowerCase().includes(q);
      const matchesParent = filterParent === "all" || String(s.parentId) === filterParent;
      return matchesSearch && matchesParent;
    });
  }, [students, search, filterParent]);

  // ── Mutations ──
  const createMutation = trpc.students.create.useMutation({
    onSuccess: () => {
      utils.students.listByPromoter.invalidate();
      utils.promoter.getStats.invalidate();
      toast.success("Student added successfully.");
      setShowDialog(false);
      setForm(emptyForm);
      setFormErrors({});
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.students.update.useMutation({
    onSuccess: () => {
      utils.students.listByPromoter.invalidate();
      toast.success("Student updated.");
      setShowDialog(false);
      setEditId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.students.delete.useMutation({
    onSuccess: () => {
      utils.students.listByPromoter.invalidate();
      utils.promoter.getStats.invalidate();
      toast.success("Student removed.");
      setDeleteId(null);
    },
    onError: (e) => {
      toast.error(e.message);
      setDeleteId(null);
    },
  });

  const openAdd = () => {
    setEditId(null);
    setForm(emptyForm);
    setFormErrors({});
    setShowDialog(true);
  };

  const openEdit = (s: (typeof students)[0]) => {
    setEditId(s.id);
    setForm({
      parentId: String(s.parentId),
      name: s.name,
      age: s.age ? String(s.age) : "",
      gradeLevel: s.gradeLevel ?? "",
      subjects: s.subjects ? s.subjects.split(",").map((x) => x.trim()).filter(Boolean) : [],
    });
    setFormErrors({});
    setShowDialog(true);
  };

  const toggleSubject = (sub: string) => {
    setForm((f) => ({
      ...f,
      subjects: f.subjects.includes(sub)
        ? f.subjects.filter((s) => s !== sub)
        : [...f.subjects, sub],
    }));
  };

  const handleSubmit = () => {
    const errs: typeof formErrors = {};
    if (!form.name.trim()) errs.name = "Student name is required.";
    if (!form.parentId) errs.parentId = "Please select a parent.";
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }

    const payload = {
      parentId: parseInt(form.parentId),
      name: form.name.trim(),
      age: form.age ? parseInt(form.age) : undefined,
      gradeLevel: form.gradeLevel || undefined,
      subjects: form.subjects.length ? form.subjects.join(", ") : undefined,
    };
    if (editId) {
      updateMutation.mutate({ id: editId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const getParentName = (parentId: number) =>
    parents.find((p) => p.id === parentId)?.name ?? "Unknown Parent";

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">My Students</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Students from your referred families.
            </p>
          </div>
          <Button onClick={openAdd} className="gap-2 shrink-0" disabled={parents.length === 0}>
            <Plus className="h-4 w-4" />
            Add Student
          </Button>
        </div>

        {/* No parents warning */}
        {parents.length === 0 && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            You need to add a parent first before adding students.
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by name, grade, or subject…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {parents.length > 0 && (
            <Select value={filterParent} onValueChange={setFilterParent}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All parents" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All parents</SelectItem>
                {parents.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
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
              <GraduationCap className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground mb-1">
              {search || filterParent !== "all" ? "No students match your filters" : "No students yet"}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {search || filterParent !== "all"
                ? "Try adjusting your search or filter."
                : "Add students under your referred parents."}
            </p>
            {!search && filterParent === "all" && parents.length > 0 && (
              <Button variant="outline" className="gap-2" onClick={openAdd}>
                <Plus className="h-4 w-4" />
                Add Student
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((s) => (
              <Card key={s.id} className="border shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <GraduationCap className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-foreground">{s.name}</p>
                          {s.enrolled ? (
                            <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200 gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Enrolled
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs gap-1">
                              <Clock className="h-3 w-3" />
                              Pending
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <User className="h-3.5 w-3.5" />
                            {getParentName(s.parentId)}
                          </span>
                          {s.gradeLevel && (
                            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <GraduationCap className="h-3.5 w-3.5" />
                              {s.gradeLevel}
                              {s.age ? ` · Age ${s.age}` : ""}
                            </span>
                          )}
                        </div>
                        {s.subjects && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {s.subjects.split(",").map((sub) => (
                              <span
                                key={sub.trim()}
                                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary"
                              >
                                <BookOpen className="h-2.5 w-2.5" />
                                {sub.trim()}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions — locked for enrolled students */}
                    {!s.enrolled ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Edit student"
                          onClick={() => openEdit(s)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          title="Remove student"
                          onClick={() => setDeleteId(s.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic shrink-0">Locked</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ── Add / Edit Dialog ── */}
      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) { setShowDialog(false); setEditId(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Student" : "Add Student"}</DialogTitle>
            <DialogDescription>
              {editId ? "Update the student's details." : "Add a new student under one of your referred parents."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {/* Parent */}
            <div className="grid gap-1.5">
              <Label>Parent <span className="text-destructive">*</span></Label>
              <Select
                value={form.parentId}
                onValueChange={(v) => {
                  setForm({ ...form, parentId: v });
                  if (formErrors.parentId) setFormErrors({ ...formErrors, parentId: undefined });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a parent" />
                </SelectTrigger>
                <SelectContent>
                  {parents.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.parentId && <p className="text-xs text-destructive">{formErrors.parentId}</p>}
            </div>

            {/* Name */}
            <div className="grid gap-1.5">
              <Label>Student Name <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Alex Smith"
                value={form.name}
                onChange={(e) => {
                  setForm({ ...form, name: e.target.value });
                  if (formErrors.name) setFormErrors({ ...formErrors, name: undefined });
                }}
              />
              {formErrors.name && <p className="text-xs text-destructive">{formErrors.name}</p>}
            </div>

            {/* Age + Grade */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Age</Label>
                <Input
                  type="number"
                  placeholder="12"
                  min={1}
                  max={25}
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Grade Level</Label>
                <Select
                  value={form.gradeLevel}
                  onValueChange={(v) => setForm({ ...form, gradeLevel: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADE_LEVELS.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Subjects */}
            <div className="grid gap-1.5">
              <Label>Subjects of Interest</Label>
              <div className="flex flex-wrap gap-2">
                {SUBJECTS.map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => toggleSubject(sub)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      form.subjects.includes(sub)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:border-primary/50"
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDialog(false); setEditId(null); }}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isPending} className="gap-2">
              {isPending ? (
                <>
                  <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Saving…
                </>
              ) : editId ? "Save Changes" : "Add Student"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Student</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <strong>{deleteTarget?.name ?? "this student"}</strong>? This action cannot be
              undone.
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
