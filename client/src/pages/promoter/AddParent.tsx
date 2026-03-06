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
  ChevronRight,
  Users,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type ParentForm = {
  name: string;
  email: string;
  phone: string;
  notes: string;
};

type StudentForm = {
  id: string; // local key only
  name: string;
  age: string;
  gradeLevel: string;
  subjects: string;
};

type FieldError = Partial<Record<keyof ParentForm, string>>;

const emptyParent: ParentForm = { name: "", email: "", phone: "", notes: "" };
const emptyStudent = (): StudentForm => ({
  id: crypto.randomUUID(),
  name: "",
  age: "",
  gradeLevel: "",
  subjects: "",
});

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

// ─── Sub-components ───────────────────────────────────────────────────────────

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

function StudentCard({
  student,
  index,
  onChange,
  onRemove,
  canRemove,
}: {
  student: StudentForm;
  index: number;
  onChange: (updated: StudentForm) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const set = (field: keyof StudentForm, value: string) =>
    onChange({ ...student, [field]: value });

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

  return (
    <div className="border rounded-xl p-4 bg-muted/20 space-y-4 relative">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
            <GraduationCap className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground">
            Student {index + 1}
          </span>
        </div>
        {canRemove && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
            type="button"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
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
              onClick={() => set("gradeLevel", student.gradeLevel === g ? "" : g)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
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
              onClick={() => toggleSubject(subj)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
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

// ─── Success Screen ───────────────────────────────────────────────────────────

function SuccessScreen({
  parentName,
  studentCount,
  onAddAnother,
  onViewAll,
}: {
  parentName: string;
  studentCount: number;
  onAddAnother: () => void;
  onViewAll: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center max-w-md mx-auto">
      <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center mb-5">
        <CheckCircle2 className="h-8 w-8 text-emerald-600" />
      </div>
      <h2 className="text-xl font-semibold text-foreground mb-2">Parent Added!</h2>
      <p className="text-muted-foreground text-sm leading-relaxed mb-1">
        <strong>{parentName}</strong> has been added to your referrals.
      </p>
      {studentCount > 0 && (
        <p className="text-muted-foreground text-sm mb-6">
          {studentCount} student{studentCount > 1 ? "s were" : " was"} also registered.
        </p>
      )}
      {studentCount === 0 && (
        <p className="text-muted-foreground text-sm mb-6">
          You can add students later from the Parents list.
        </p>
      )}
      <div className="flex flex-col sm:flex-row gap-3 w-full">
        <Button onClick={onAddAnother} variant="outline" className="flex-1 gap-2">
          <Plus className="h-4 w-4" />
          Add Another Parent
        </Button>
        <Button onClick={onViewAll} className="flex-1 gap-2">
          <Users className="h-4 w-4" />
          View All Parents
        </Button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AddParent() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const [parent, setParent] = useState<ParentForm>(emptyParent);
  const [errors, setErrors] = useState<FieldError>({});
  const [students, setStudents] = useState<StudentForm[]>([]);
  const [addStudents, setAddStudents] = useState(false);
  const [submittedParentName, setSubmittedParentName] = useState("");
  const [submittedStudentCount, setSubmittedStudentCount] = useState(0);
  const [done, setDone] = useState(false);

  // ── Mutations ──
  const createParent = trpc.parents.create.useMutation();
  const createStudent = trpc.students.create.useMutation();

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

    // Validate students if section is open
    if (addStudents) {
      for (const s of students) {
        if (!s.name.trim()) {
          toast.error("All students must have a name.");
          return;
        }
      }
    }

    try {
      // 1. Create parent
      const createdParents = await createParent.mutateAsync({
        name: parent.name.trim(),
        email: parent.email.trim(),
        phone: parent.phone.trim() || undefined,
        notes: parent.notes.trim() || undefined,
      });

      // 2. Fetch the newly created parent id by re-querying the list
      await utils.parents.list.invalidate();
      const freshList = await utils.parents.list.fetch();
      const newParent = freshList?.find(
        (p) => p.email === parent.email.trim()
      );

      // 3. Create students if any
      let studentCount = 0;
      if (addStudents && students.length > 0 && newParent) {
        for (const s of students) {
          if (!s.name.trim()) continue;
          await createStudent.mutateAsync({
            parentId: newParent.id,
            name: s.name.trim(),
            age: s.age ? Number(s.age) : undefined,
            gradeLevel: s.gradeLevel || undefined,
            subjects: s.subjects || undefined,
          });
          studentCount++;
        }
        await utils.students.listByPromoter.invalidate();
      }

      await utils.promoter.getStats.invalidate();

      setSubmittedParentName(parent.name.trim());
      setSubmittedStudentCount(studentCount);
      setDone(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      toast.error(msg);
    }
  };

  const handleAddAnother = () => {
    setParent(emptyParent);
    setStudents([]);
    setErrors({});
    setAddStudents(false);
    setDone(false);
  };

  const isPending = createParent.isPending || createStudent.isPending;

  // ── Success screen ──
  if (done) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto">
          <SuccessScreen
            parentName={submittedParentName}
            studentCount={submittedStudentCount}
            onAddAnother={handleAddAnother}
            onViewAll={() => navigate("/promoter/parents")}
          />
        </div>
      </DashboardLayout>
    );
  }

  // ── Form ──
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
            <h1 className="text-2xl font-semibold text-foreground">Add New Parent</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Enter the parent's contact details and optionally register their students.
            </p>
          </div>
        </div>

        {/* Progress breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
          <span className="font-medium text-foreground">Parent Details</span>
          {addStudents && (
            <>
              <ChevronRight className="h-3 w-3" />
              <span className="font-medium text-foreground">Student Information</span>
            </>
          )}
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

        {/* ── Section 2: Students (optional) ── */}
        <Card className="border shadow-sm mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center">
                  <GraduationCap className="h-3.5 w-3.5 text-indigo-600" />
                </div>
                Student Information
                <Badge variant="secondary" className="text-xs font-normal">
                  Optional
                </Badge>
              </CardTitle>
              {!addStudents ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs h-8"
                  onClick={() => {
                    setAddStudents(true);
                    setStudents([emptyStudent()]);
                  }}
                  type="button"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Students
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-8 text-muted-foreground"
                  onClick={() => {
                    setAddStudents(false);
                    setStudents([]);
                  }}
                  type="button"
                >
                  Skip for now
                </Button>
              )}
            </div>
            {!addStudents && (
              <p className="text-xs text-muted-foreground mt-1">
                You can add student details now or later from the Parents list.
              </p>
            )}
          </CardHeader>

          {addStudents && (
            <CardContent className="space-y-4 pt-0">
              <Separator />
              {students.map((s, i) => (
                <StudentCard
                  key={s.id}
                  student={s}
                  index={i}
                  canRemove={students.length > 1}
                  onChange={(updated) =>
                    setStudents((prev) =>
                      prev.map((x) => (x.id === updated.id ? updated : x))
                    )
                  }
                  onRemove={() =>
                    setStudents((prev) => prev.filter((x) => x.id !== s.id))
                  }
                />
              ))}
              <Button
                variant="outline"
                size="sm"
                className="gap-2 w-full border-dashed"
                onClick={() => setStudents((prev) => [...prev, emptyStudent()])}
                type="button"
              >
                <Plus className="h-4 w-4" />
                Add Another Student
              </Button>
            </CardContent>
          )}
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
                <CheckCircle2 className="h-4 w-4" />
                Save Parent
              </>
            )}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
