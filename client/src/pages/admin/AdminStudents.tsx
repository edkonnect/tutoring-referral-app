import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  BookOpen,
  CheckCircle,
  Clock,
  GraduationCap,
  Pencil,
  Save,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const GRADE_LEVELS = [
  "Pre-K", "Kindergarten", "Grade 1", "Grade 2", "Grade 3", "Grade 4",
  "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10",
  "Grade 11", "Grade 12", "College", "Adult Learner",
];

type Student = {
  id: number;
  parentId: number;
  name: string;
  lastName?: string | null;
  gradeLevel?: string | null;
  educationGoals?: string | null;
  subjects?: string | null;
  age?: number | null;
  enrolled: boolean;
  createdAt: Date;
};

export default function AdminStudents() {
  const utils = trpc.useUtils();
  const { data: students, isLoading } = trpc.students.listAll.useQuery();
  const { data: parents } = trpc.parents.listAll.useQuery();
  const { data: promoters } = trpc.admin.listPromoters.useQuery();

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    lastName: "",
    gradeLevel: "",
    educationGoals: "",
    subjects: "",
  });

  const updateMutation = trpc.students.update.useMutation({
    onSuccess: () => {
      utils.students.listAll.invalidate();
      toast.success("Student information updated");
      setIsEditing(false);
      // Update the selected student in the slide-over
      if (selectedStudent) {
        setSelectedStudent({
          ...selectedStudent,
          name: editForm.name || selectedStudent.name,
          lastName: editForm.lastName || selectedStudent.lastName,
          gradeLevel: editForm.gradeLevel || selectedStudent.gradeLevel,
          educationGoals: editForm.educationGoals || selectedStudent.educationGoals,
          subjects: editForm.subjects || selectedStudent.subjects,
        });
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const getParentName = (parentId: number) =>
    parents?.find((p) => p.id === parentId)?.name ?? "Unknown";

  const getPromoterName = (parentId: number) => {
    const parent = parents?.find((p) => p.id === parentId);
    if (!parent) return "Unknown";
    return promoters?.find((pr) => pr.id === parent.promoterId)?.name ?? "Unknown";
  };

  const openStudent = (s: Student) => {
    setSelectedStudent(s);
    setEditForm({
      name: s.name ?? "",
      lastName: s.lastName ?? "",
      gradeLevel: s.gradeLevel ?? "",
      educationGoals: s.educationGoals ?? "",
      subjects: s.subjects ?? "",
    });
    setIsEditing(false);
  };

  const fullName = (s: Student) =>
    [s.name, s.lastName].filter(Boolean).join(" ");

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground">All Students</h1>
          <p className="text-muted-foreground mt-1">
            All students across all promoters and parents
          </p>
        </div>

        {isLoading ? (
          <div className="grid gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : !students?.length ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <GraduationCap className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="font-medium text-foreground">No students yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Students will appear here once they register via a promotion link.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Student Name</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Parent</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Promoter</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Grade Level</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Education Goals</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground"></th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr
                      key={s.id}
                      className="border-b last:border-0 hover:bg-muted/20 transition-colors cursor-pointer"
                      onClick={() => openStudent(s as Student)}
                    >
                      <td className="px-4 py-3 font-medium text-foreground">
                        {fullName(s as Student) || "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{getParentName(s.parentId)}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          {getPromoterName(s.parentId)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {s.gradeLevel ? (
                          <Badge variant="secondary" className="font-normal">{s.gradeLevel}</Badge>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-xs">
                        {(s as Student).educationGoals ? (
                          <span className="line-clamp-2 text-xs">{(s as Student).educationGoals}</span>
                        ) : (
                          <span className="text-muted-foreground/50 italic text-xs">Not provided</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {s.enrolled ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                            <CheckCircle className="h-3 w-3" />
                            Enrolled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            <Clock className="h-3 w-3" />
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={(e) => { e.stopPropagation(); openStudent(s as Student); }}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Student Detail Slide-over */}
      <Sheet open={!!selectedStudent} onOpenChange={(open) => { if (!open) { setSelectedStudent(null); setIsEditing(false); } }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedStudent && (
            <>
              <SheetHeader className="mb-6">
                <SheetTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  Student Details
                </SheetTitle>
              </SheetHeader>

              {isEditing ? (
                /* Edit form */
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-fname">First Name</Label>
                      <Input
                        id="edit-fname"
                        value={editForm.name}
                        onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder="First name"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-lname">Last Name</Label>
                      <Input
                        id="edit-lname"
                        value={editForm.lastName}
                        onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))}
                        placeholder="Last name"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Grade Level</Label>
                    <Select
                      value={editForm.gradeLevel}
                      onValueChange={(v) => setEditForm((f) => ({ ...f, gradeLevel: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select grade level" />
                      </SelectTrigger>
                      <SelectContent>
                        {GRADE_LEVELS.map((g) => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="edit-goals">Education Goals</Label>
                    <Textarea
                      id="edit-goals"
                      value={editForm.educationGoals}
                      onChange={(e) => setEditForm((f) => ({ ...f, educationGoals: e.target.value }))}
                      placeholder="Describe the student's education goals..."
                      rows={4}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="edit-subjects">Subjects</Label>
                    <Input
                      id="edit-subjects"
                      value={editForm.subjects}
                      onChange={(e) => setEditForm((f) => ({ ...f, subjects: e.target.value }))}
                      placeholder="e.g. Math, Science"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      className="flex-1 gap-2"
                      onClick={() => updateMutation.mutate({
                        id: selectedStudent.id,
                        name: editForm.name || undefined,
                        lastName: editForm.lastName || undefined,
                        gradeLevel: editForm.gradeLevel || undefined,
                        educationGoals: editForm.educationGoals || undefined,
                        subjects: editForm.subjects || undefined,
                      })}
                      disabled={updateMutation.isPending}
                    >
                      <Save className="h-4 w-4" />
                      {updateMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)} className="gap-2">
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                /* Read-only view */
                <div className="space-y-5">
                  {/* Header card */}
                  <div className="p-4 bg-muted/40 rounded-lg border">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-foreground">
                          {fullName(selectedStudent) || selectedStudent.name}
                        </p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          Parent: {getParentName(selectedStudent.parentId)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Promoter: {getPromoterName(selectedStudent.parentId)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {selectedStudent.enrolled ? (
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Enrolled
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 h-7 text-xs"
                          onClick={() => setIsEditing(true)}
                        >
                          <Pencil className="h-3 w-3" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Student info fields */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">First Name</p>
                        <p className="text-sm font-medium text-foreground">{selectedStudent.name || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Last Name</p>
                        <p className="text-sm font-medium text-foreground">{selectedStudent.lastName || "—"}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Grade Level</p>
                      {selectedStudent.gradeLevel ? (
                        <Badge variant="secondary">{selectedStudent.gradeLevel}</Badge>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Not provided</p>
                      )}
                    </div>

                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5" />
                        Education Goals
                      </p>
                      {selectedStudent.educationGoals ? (
                        <div className="p-3 bg-blue-50 border border-blue-100 rounded-md text-sm text-foreground leading-relaxed">
                          {selectedStudent.educationGoals}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Not provided</p>
                      )}
                    </div>

                    {selectedStudent.subjects && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Subjects</p>
                        <p className="text-sm text-foreground">{selectedStudent.subjects}</p>
                      </div>
                    )}

                    {selectedStudent.age && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Age</p>
                        <p className="text-sm text-foreground">{selectedStudent.age}</p>
                      </div>
                    )}

                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Registered On</p>
                      <p className="text-sm text-foreground">
                        {new Date(selectedStudent.createdAt).toLocaleDateString(undefined, {
                          year: "numeric", month: "long", day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  );
}
