import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { GraduationCap, CheckCircle, Clock } from "lucide-react";

export default function AdminStudents() {
  const { data: students, isLoading } = trpc.students.listAll.useQuery();
  const { data: parents } = trpc.parents.listAll.useQuery();
  const { data: promoters } = trpc.admin.listPromoters.useQuery();

  const getParentName = (parentId: number) =>
    parents?.find((p) => p.id === parentId)?.name ?? "Unknown";

  const getPromoterName = (parentId: number) => {
    const parent = parents?.find((p) => p.id === parentId);
    if (!parent) return "Unknown";
    return promoters?.find((pr) => pr.id === parent.promoterId)?.name ?? "Unknown";
  };

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
                Students will appear here once promoters add them.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Student</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Parent</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Promoter</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Age</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Grade</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Subjects</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{s.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{getParentName(s.parentId)}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          {getPromoterName(s.parentId)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{s.age ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.gradeLevel ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{s.subjects ?? "—"}</td>
                      <td className="px-4 py-3">
                        {s.enrolled ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                            <CheckCircle className="h-3 w-3" />
                            Enrolled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            <Clock className="h-3 w-3" />
                            Not Enrolled
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
