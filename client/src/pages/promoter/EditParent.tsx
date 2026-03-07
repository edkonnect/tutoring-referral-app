import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  FileText,
  GraduationCap,
  Plus,
  Trash2,
  CheckCircle2,
  Save,
  AlertCircle,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────────────────────────────

const GRADE_OPTIONS = [
  "Pre-K", "Kindergarten",
  "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5",
  "Grade 6", "Grade 7", "Grade 8",
  "Grade 9", "Grade 10", "Grade 11", "Grade 12",
  "College / University",
];

const SUBJECT_OPTIONS = [
  "Mathematics", "English", "Science", "History",
  "Physics", "Chemistry", "Biology", "Computer Science",
  "French", "Spanish", "Art", "Music",
];

// ─── Types ────────────────────────────────────────────────────────────────────

type ParentForm = {
  name: string;
  email: string;
  phone: string;
  notes: string;
};

type FieldError = Partial<Record<keyof ParentForm, string>>;

/** A student that already exists in the DB — has a real numeric id */
type ExistingStudent = {
  kind: "existing";
  dbId: number;
  localId: string;
  name: string;
  age: string;
  gradeLevel: string;
  subjects: string;
  enrolled: boolean;
};

/** A student being added fresh on this edit session */
type NewStudent = {
  kind: "new";
  localId: string;
  name: string;
  age: string;
  gradeLevel: string;
  subjects: string;
};

type AnyStudent = ExistingStudent | NewStudent;

const emptyNew = (): NewStudent => ({
  kind: "new",
  localId: crypto.randomUUID(),
  name: "",
  age: "",
  gradeLevel: "",
  subjects: "",
});

// ─── FormField helper ─────────────────────────────────────────────────────────

function FormField({
  label,
  required,
  error,
  children,
  hint,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ─── StudentCard ──────────────────────────────────────────────────────────────

function StudentCard({
  student,
  index,
  onChange,
  onRemove,
  canRemove,
}: {
  student: AnyStudent;
  index: number;
  onChange: (updated: AnyStudent) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const set = (field: "name" | "age" | "gradeLevel" | "subjects", value: string) =>
    onChange({ ...student, [field]: value } as AnyStudent);

  const toggleSubject = (subj: string) => {
    const current = student.subjects
      ? student.subjects.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    const next = current.includes(subj)
      ? current.filter((s) => s !== subj)
      : [...current, subj];
    set("subjects", next.join(", "));
  };

  const selectedSubjects = student.subjects
    ? student.subjects.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const isEnrolled = student.kind === "existing" && student.enrolled;

  return (
    <div className={`border rounded-xl p-4 space-y-4 relative ${isEnrolled ? "bg-emerald-50/50 border-emerald-200" : "bg-muted/20"}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`h-7 w-7 rounded-full flex items-center justify-center ${isEnrolled ? "bg-emerald-100" : "bg-primary/10"}`}>
            <GraduationCap className={`h-3.5 w-3.5 ${isEnrolled ? "text-emerald-600" : "text-primary"}`} />
          </div>
          <span className="text-sm font-semibold text-foreground">
            Student {index + 1}
          </span>
          {isEnrolled && (
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs font-normal">
              Enrolled
            </Badge>
          )}
          {student.kind === "new" && (
            <Badge variant="secondary" className="text-xs font-normal">
              New
            </Badge>
          )}
        </div>
        {canRemove && !isEnrolled && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
            type="button"
            title="Remove student"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
        {isEnrolled && (
          <span className="text-xs text-emerald-600 font-medium">
            Enrolled — cannot be removed
          </span>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Name */}
        <div className="grid gap-1.5">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Full Name <span className="text-destructive">*</span>
          </Label>
          <Input
            placeholder="e.g. Alex Smith"
            value={student.name}
            onChange={(e) => set("name", e.target.value)}
            disabled={isEnrolled}
          />
        </div>

        {/* Age */}
        <div className="grid gap-1.5">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Age
          </Label>
          <Input
            type="number"
            placeholder="e.g. 12"
            min={1}
            max={25}
            value={student.age}
            onChange={(e) => set("age", e.target.value)}
            disabled={isEnrolled}
          />
        </div>
      </div>

      {/* Grade */}
      <div className="grid gap-1.5">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Grade Level
        </Label>
        <div className="flex flex-wrap gap-1.5">
          {GRADE_OPTIONS.map((g) => (
            <button
              key={g}
              type="button"
              disabled={isEnrolled}
              onClick={() => set("gradeLevel", student.gradeLevel === g ? "" : g)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                student.gradeLevel === g
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-primary hover:text-foreground"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Subjects */}
      <div className="grid gap-1.5">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Subjects of Interest
        </Label>
        <div className="flex flex-wrap gap-1.5">
          {SUBJECT_OPTIONS.map((subj) => (
            <button
              key={subj}
              type="button"
              disabled={isEnrolled}
              onClick={() => toggleSubject(subj)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                selectedSubjects.includes(subj)
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-background text-muted-foreground border-border hover:border-indigo-400 hover:text-foreground"
              }`}
            >
              {subj}
            </button>
          ))}
        </div>
        {selectedSubjects.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Selected: {selectedSubjects.join(", ")}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EditParent() {
  const params = useParams<{ id: string }>();
  const parentId = Number(params.id);
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  // ── Remote data ──
  const { data: allParents, isLoading: parentsLoading } = trpc.parents.list.useQuery();
  const { data: existingStudents, isLoading: studentsLoading } =
    trpc.students.listByParent.useQuery(
      { parentId },
      { enabled: !isNaN(parentId) }
    );

  // ── Local form state ──
  const [parent, setParent] = useState<ParentForm>({ name: "", email: "", phone: "", notes: "" });
  const [errors, setErrors] = useState<FieldError>({});
  const [students, setStudents] = useState<AnyStudent[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [done, setDone] = useState(false);

  // ── Populate form once data arrives ──
  useEffect(() => {
    if (initialized || parentsLoading || studentsLoading) return;
    const p = allParents?.find((x) => x.id === parentId);
    if (!p) return;
    setParent({
      name: p.name,
      email: p.email,
      phone: p.phone ?? "",
      notes: p.notes ?? "",
    });
    if (existingStudents) {
      setStudents(
        existingStudents.map((s) => ({
          kind: "existing",
          dbId: s.id,
          localId: String(s.id),
          name: s.name,
          age: s.age != null ? String(s.age) : "",
          gradeLevel: s.gradeLevel ?? "",
          subjects: s.subjects ?? "",
          enrolled: s.enrolled ?? false,
        }))
      );
    }
    setInitialized(true);
  }, [allParents, existingStudents, parentsLoading, studentsLoading, parentId, initialized]);

  // ── Mutations ──
  const updateParentMutation = trpc.parents.update.useMutation();
  const updateStudentMutation = trpc.students.update.useMutation();
  const createStudentMutation = trpc.students.create.useMutation();
  const deleteStudentMutation = trpc.students.delete.useMutation();

  // ── Validation ──
  const validate = (): boolean => {
    const errs: FieldError = {};
    if (!parent.name.trim()) errs.name = "Full name is required.";
    if (!parent.email.trim()) {
      errs.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parent.email)) {
      errs.email = "Please enter a valid email address.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Submit ──
  const handleSubmit = async () => {
    if (!validate()) return;

    for (const s of students) {
      if (!s.name.trim()) {
        toast.error("All students must have a name.");
        return;
      }
    }

    try {
      // 1. Update parent
      await updateParentMutation.mutateAsync({
        id: parentId,
        name: parent.name.trim(),
        email: parent.email.trim(),
        phone: parent.phone.trim() || undefined,
        notes: parent.notes.trim() || undefined,
      });

      // 2. Process students
      for (const s of students) {
        if (s.kind === "existing" && !s.enrolled) {
          await updateStudentMutation.mutateAsync({
            id: s.dbId,
            name: s.name.trim(),
            age: s.age ? Number(s.age) : undefined,
            gradeLevel: s.gradeLevel || undefined,
            subjects: s.subjects || undefined,
          });
        } else if (s.kind === "new" && s.name.trim()) {
          await createStudentMutation.mutateAsync({
            parentId,
            name: s.name.trim(),
            age: s.age ? Number(s.age) : undefined,
            gradeLevel: s.gradeLevel || undefined,
            subjects: s.subjects || undefined,
          });
        }
      }

      await utils.parents.list.invalidate();
      await utils.students.listByParent.invalidate({ parentId });
      await utils.students.listByPromoter.invalidate();
      await utils.promoter.getStats.invalidate();

      setDone(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      toast.error(msg);
    }
  };

  // ── Remove student (existing: delete from DB; new: remove from local list) ──
  const handleRemoveStudent = async (s: AnyStudent) => {
    if (s.kind === "existing") {
      try {
        await deleteStudentMutation.mutateAsync({ id: s.dbId });
        setStudents((prev) => prev.filter((x) => x.localId !== s.localId));
        toast.success("Student removed.");
        await utils.students.listByParent.invalidate({ parentId });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to remove student.";
        toast.error(msg);
      }
    } else {
      setStudents((prev) => prev.filter((x) => x.localId !== s.localId));
    }
  };

  const isPending =
    updateParentMutation.isPending ||
    updateStudentMutation.isPending ||
    createStudentMutation.isPending;

  const isLoading = parentsLoading || studentsLoading;
  const parentNotFound = !isLoading && !allParents?.find((x) => x.id === parentId);

  // ── Success screen ──
  if (done) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto">
          <div className="flex flex-col items-center justify-center py-16 text-center max-w-md mx-auto">
            <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center mb-5">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Changes Saved!</h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              <strong>{parent.name}</strong>'s details have been updated successfully.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => navigate(`/promoter/parents/${parentId}/edit`)}
              >
                Keep Editing
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={() => navigate("/promoter/parents")}
              >
                View All Parents
              </Button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ── Not found ──
  if (parentNotFound) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle className="h-10 w-10 text-destructive mb-4" />
          <h2 className="text-lg font-semibold mb-2">Parent Not Found</h2>
          <p className="text-muted-foreground text-sm mb-6">
            This parent doesn't exist or you don't have permission to edit them.
          </p>
          <Button onClick={() => navigate("/promoter/parents")}>Back to Parents</Button>
        </div>
      </DashboardLayout>
    );
  }

  // ── Loading skeleton ──
  if (isLoading || !initialized) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto space-y-5">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-8 w-8 bg-muted animate-pulse rounded-lg" />
            <div className="space-y-1.5">
              <div className="h-6 w-48 bg-muted animate-pulse rounded" />
              <div className="h-4 w-64 bg-muted animate-pulse rounded" />
            </div>
          </div>
          <div className="h-64 bg-muted animate-pulse rounded-xl" />
          <div className="h-48 bg-muted animate-pulse rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  // ── Main form ──
  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        {/* Page header */}
        <div className="flex items-center gap-3 mb-8">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => navigate("/promoter/parents")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Edit Parent</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Update contact details and manage students for{" "}
              <span className="font-medium text-foreground">{parent.name}</span>.
            </p>
          </div>
        </div>

        {/* ── Section 1: Parent Details ── */}
        <Card className="border shadow-sm mb-5">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-3.5 w-3.5 text-primary" />
              </div>
              Parent / Guardian Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <FormField label="Full Name" required error={errors.name}>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="e.g. Jane Smith"
                  value={parent.name}
                  onChange={(e) => {
                    setParent({ ...parent, name: e.target.value });
                    if (errors.name) setErrors({ ...errors, name: undefined });
                  }}
                />
              </div>
            </FormField>

            <FormField
              label="Email Address"
              required
              error={errors.email}
              hint="Used for enrollment notifications and follow-ups."
            >
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  type="email"
                  placeholder="jane@example.com"
                  value={parent.email}
                  onChange={(e) => {
                    setParent({ ...parent, email: e.target.value });
                    if (errors.email) setErrors({ ...errors, email: undefined });
                  }}
                />
              </div>
            </FormField>

            <FormField label="Phone Number" hint="Optional — include country code for international numbers.">
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="+1 (555) 000-0000"
                  value={parent.phone}
                  onChange={(e) => setParent({ ...parent, phone: e.target.value })}
                />
              </div>
            </FormField>

            <FormField label="Notes" hint="Any relevant context about this family or their tutoring needs.">
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Textarea
                  className="pl-9 resize-none"
                  placeholder="e.g. Interested in weekly math sessions, prefers evenings..."
                  value={parent.notes}
                  onChange={(e) => setParent({ ...parent, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </FormField>
          </CardContent>
        </Card>

        {/* ── Section 2: Students ── */}
        <Card className="border shadow-sm mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center">
                  <GraduationCap className="h-3.5 w-3.5 text-indigo-600" />
                </div>
                Students
                <Badge variant="secondary" className="text-xs font-normal">
                  {students.length} registered
                </Badge>
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-8"
                onClick={() => setStudents((prev) => [...prev, emptyNew()])}
                type="button"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Student
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pt-0">
            {students.length > 0 && <Separator />}
            {students.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <GraduationCap className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No students registered yet.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 gap-2 border-dashed"
                  onClick={() => setStudents([emptyNew()])}
                  type="button"
                >
                  <Plus className="h-4 w-4" />
                  Add First Student
                </Button>
              </div>
            ) : (
              students.map((s, i) => (
                <StudentCard
                  key={s.localId}
                  student={s}
                  index={i}
                  canRemove={!(s.kind === "existing" && s.enrolled)}
                  onChange={(updated) =>
                    setStudents((prev) =>
                      prev.map((x) => (x.localId === updated.localId ? updated : x))
                    )
                  }
                  onRemove={() => handleRemoveStudent(s)}
                />
              ))
            )}
            {students.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 w-full border-dashed"
                onClick={() => setStudents((prev) => [...prev, emptyNew()])}
                type="button"
              >
                <Plus className="h-4 w-4" />
                Add Another Student
              </Button>
            )}
          </CardContent>
        </Card>

        {/* ── Actions ── */}
        <div className="flex items-center justify-between gap-4">
          <Button
            variant="outline"
            onClick={() => navigate("/promoter/parents")}
            type="button"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className="gap-2 min-w-[140px]"
          >
            {isPending ? (
              <>
                <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
