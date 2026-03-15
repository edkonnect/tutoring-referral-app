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
import { trpc } from "@/lib/trpc";
import { UserCheck, GraduationCap, CheckCircle, Mail, BookOpen, Clock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

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
  enrolledAt?: Date | null;
  createdAt: Date;
};

export default function AdminEnrollments() {
  const utils = trpc.useUtils();
  const { data: students, isLoading } = trpc.students.listAll.useQuery();
  const { data: parents } = trpc.parents.listAll.useQuery();
  const { data: promoters } = trpc.admin.listPromoters.useQuery();

  const [confirmId, setConfirmId] = useState<number | null>(null);

  const enrollMutation = trpc.students.enroll.useMutation({
    onSuccess: (data) => {
      utils.students.listAll.invalidate();
      utils.admin.getStats.invalidate();
      utils.referrals.listAll.invalidate();
      const emailMsg = data.promoterEmail
        ? ` Email notification sent to ${data.promoterEmail}.`
        : "";
      toast.success(`Student enrolled! Referral credit issued.${emailMsg}`);
      setConfirmId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const pendingStudents = (students as Student[] | undefined)?.filter((s) => !s.enrolled) ?? [];
  const enrolledStudents = (students as Student[] | undefined)?.filter((s) => s.enrolled) ?? [];

  const getParentName = (parentId: number) =>
    parents?.find((p) => p.id === parentId)?.name ?? "Unknown";

  const getPromoterName = (parentId: number) => {
    const parent = parents?.find((p) => p.id === parentId);
    if (!parent) return "Unknown";
    return promoters?.find((pr) => pr.id === parent.promoterId)?.name ?? "Unknown";
  };

  const confirmStudent = (students as Student[] | undefined)?.find((s) => s.id === confirmId);
  const confirmParent = confirmStudent ? parents?.find((p) => p.id === confirmStudent.parentId) : null;
  const confirmPromoter = confirmParent ? promoters?.find((pr) => pr.id === confirmParent.promoterId) : null;

  const fullName = (s: Student) => [s.name, s.lastName].filter(Boolean).join(" ");

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground">Enrollment Confirmation</h1>
          <p className="text-muted-foreground mt-1">
            Review student details and confirm enrollments to issue referral credits to promoters
          </p>
        </div>

        {/* Pending enrollments */}
        <div className="mb-8">
          <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
            Pending Enrollment
            {pendingStudents.length > 0 && (
              <span className="ml-1 inline-flex items-center justify-center h-5 w-5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                {pendingStudents.length}
              </span>
            )}
          </h2>

          {isLoading ? (
            <div className="grid gap-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-28 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : !pendingStudents.length ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                <CheckCircle className="h-8 w-8 text-emerald-500 mb-2" />
                <p className="font-medium text-foreground">All caught up!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  No students are pending enrollment.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {pendingStudents.map((s) => (
                <Card key={s.id} className="border shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-2">
                        {/* Name and status */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-foreground">{fullName(s)}</p>
                          {s.gradeLevel && (
                            <Badge variant="secondary" className="font-normal text-xs">{s.gradeLevel}</Badge>
                          )}
                        </div>

                        {/* Parent / Promoter */}
                        <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                          <span className="text-sm text-muted-foreground">
                            Parent: <span className="text-foreground">{getParentName(s.parentId)}</span>
                          </span>
                          <span className="text-sm text-muted-foreground">
                            Promoter: <span className="font-medium text-foreground">{getPromoterName(s.parentId)}</span>
                          </span>
                        </div>

                        {/* Education Goals */}
                        {s.educationGoals && (
                          <div className="flex items-start gap-1.5 mt-1">
                            <BookOpen className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              <span className="font-medium text-foreground">Goals:</span> {s.educationGoals}
                            </p>
                          </div>
                        )}

                        {/* Subjects */}
                        {s.subjects && (
                          <p className="text-sm text-muted-foreground">
                            Subjects: {s.subjects}
                          </p>
                        )}
                      </div>

                      <Button
                        onClick={() => setConfirmId(s.id)}
                        className="gap-2 shrink-0"
                        size="sm"
                      >
                        <UserCheck className="h-4 w-4" />
                        Confirm Enrollment
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Enrolled students */}
        {enrolledStudents.length > 0 && (
          <div>
            <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              Enrolled Students ({enrolledStudents.length})
            </h2>
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
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Enrolled On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrolledStudents.map((s) => (
                      <tr key={s.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">{fullName(s)}</td>
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
                          {s.educationGoals ? (
                            <span className="line-clamp-2 text-xs">{s.educationGoals}</span>
                          ) : (
                            <span className="text-muted-foreground/50 italic text-xs">Not provided</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {s.enrolledAt ? new Date(s.enrolledAt).toLocaleDateString() : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Confirm Enrollment Dialog */}
      <Dialog open={confirmId !== null} onOpenChange={() => setConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Enrollment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Student info summary */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
              <div className="flex items-start gap-3">
                <GraduationCap className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">
                    {confirmStudent ? fullName(confirmStudent) : "—"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Parent: {confirmParent?.name ?? "—"}
                  </p>
                  {confirmStudent?.gradeLevel && (
                    <div className="mt-1">
                      <Badge variant="secondary" className="font-normal text-xs">
                        {confirmStudent.gradeLevel}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              {/* Education Goals */}
              {confirmStudent?.educationGoals && (
                <div className="flex items-start gap-2 pt-1 border-t border-blue-200">
                  <BookOpen className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-blue-700 mb-0.5">Education Goals</p>
                    <p className="text-sm text-foreground">{confirmStudent.educationGoals}</p>
                  </div>
                </div>
              )}

              {/* Subjects */}
              {confirmStudent?.subjects && (
                <p className="text-sm text-muted-foreground pt-1 border-t border-blue-200">
                  Subjects: {confirmStudent.subjects}
                </p>
              )}
            </div>

            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <p className="text-sm font-medium text-emerald-800 mb-1">This action will:</p>
              <ul className="text-sm text-emerald-700 space-y-1">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                  Mark {confirmStudent ? fullName(confirmStudent) : "this student"} as enrolled
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                  Issue a referral credit to <strong>{confirmPromoter?.name ?? "the promoter"}</strong>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  Send an email notification to the promoter
                </li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmId(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => confirmId && enrollMutation.mutate({ studentId: confirmId })}
              disabled={enrollMutation.isPending}
              className="gap-2"
            >
              <UserCheck className="h-4 w-4" />
              {enrollMutation.isPending ? "Confirming..." : "Confirm Enrollment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
