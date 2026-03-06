import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Plus, Pencil, Trash2, GraduationCap, CheckCircle, Clock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const GRADE_LEVELS = [
  "Pre-K", "Kindergarten", "Grade 1", "Grade 2", "Grade 3", "Grade 4",
  "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10",
  "Grade 11", "Grade 12", "College", "Adult",
];

const SUBJECTS = ["Math", "English", "Science", "History", "Reading", "Writing", "SAT/ACT Prep", "Other"];

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
  const { data: parents } = trpc.parents.list.useQuery();
  const { data: students, isLoading } = trpc.students.listByPromoter.useQuery();

  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<StudentForm>(emptyForm);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const createMutation = trpc.students.create.useMutation({
    onSuccess: () => {
      utils.students.listByPromoter.invalidate();
      utils.promoter.getStats.invalidate();
      toast.success("Student added successfully");
      setShowDialog(false);
      setForm(emptyForm);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.students.update.useMutation({
    onSuccess: () => {
      utils.students.listByPromoter.invalidate();
      toast.success("Student updated");
      setShowDialog(false);
      setEditId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.students.delete.useMutation({
    onSuccess: () => {
      utils.students.listByPromoter.invalidate();
      utils.promoter.getStats.invalidate();
      toast.success("Student removed");
      setDeleteId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const openAdd = () => {
    setEditId(null);
    setForm(emptyForm);
    setShowDialog(true);
  };

  const openEdit = (s: NonNullable<typeof students>[0]) => {
    setEditId(s.id);
    setForm({
      parentId: String(s.parentId),
      name: s.name,
      age: s.age ? String(s.age) : "",
      gradeLevel: s.gradeLevel ?? "",
      subjects: s.subjects ? s.subjects.split(",").map((x) => x.trim()) : [],
    });
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
    if (!form.name.trim() || !form.parentId) {
      toast.error("Student name and parent are required");
      return;
    }
    const payload = {
      parentId: parseInt(form.parentId),
      name: form.name,
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
    parents?.find((p) => p.id === parentId)?.name ?? "Unknown Parent";

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">My Students</h1>
            <p className="text-muted-foreground mt-1">Students from your referred families</p>
          </div>
          <Button onClick={openAdd} className="gap-2" disabled={!parents?.length}>
            <Plus className="h-4 w-4" />
            Add Student
          </Button>
        </div>

        {!parents?.length && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            You need to add a parent first before adding students.
          </div>
        )}

        {isLoading ? (
          <div className="grid gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : !students?.length ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <GraduationCap className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="font-medium text-foreground">No students yet</p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Add students under your referred parents.
              </p>
              {parents?.length ? (
                <Button onClick={openAdd} variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Student
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {students.map((s) => (
              <Card key={s.id} className="border shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-foreground">{s.name}</p>
                        {s.enrolled ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                            <CheckCircle className="h-3 w-3" />
                            Enrolled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            <Clock className="h-3 w-3" />
                            Pending
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Parent: {getParentName(s.parentId)}
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                        {s.age && (
                          <span className="text-xs text-muted-foreground">Age: {s.age}</span>
                        )}
                        {s.gradeLevel && (
                          <span className="text-xs text-muted-foreground">Grade: {s.gradeLevel}</span>
                        )}
                        {s.subjects && (
                          <span className="text-xs text-muted-foreground">Subjects: {s.subjects}</span>
                        )}
                      </div>
                    </div>
                    {!s.enrolled && (
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(s)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(s.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Student" : "Add Student"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>Parent *</Label>
              <Select
                value={form.parentId}
                onValueChange={(v) => setForm({ ...form, parentId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a parent" />
                </SelectTrigger>
                <SelectContent>
                  {parents?.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Student Name *</Label>
              <Input
                placeholder="Alex Smith"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
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
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Saving..." : editId ? "Save Changes" : "Add Student"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Student</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to remove this student?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Removing..." : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
