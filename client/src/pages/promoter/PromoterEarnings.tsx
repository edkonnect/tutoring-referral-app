import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { DollarSign, Clock, CheckCircle, TrendingUp } from "lucide-react";

export default function PromoterEarnings() {
  const { data: referrals, isLoading } = trpc.referrals.myReferrals.useQuery();
  const { data: earnings } = trpc.referrals.myEarnings.useQuery();
  const { data: parents } = trpc.parents.list.useQuery();
  const { data: students } = trpc.students.listByPromoter.useQuery();

  const getParentName = (parentId: number) =>
    parents?.find((p) => p.id === parentId)?.name ?? "Unknown Parent";

  const getStudentName = (studentId: number) =>
    students?.find((s) => s.id === studentId)?.name ?? "Unknown Student";

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground">Earnings</h1>
          <p className="text-muted-foreground mt-1">
            Track your referral credits and payout status
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <SummaryCard
            icon={TrendingUp}
            label="Total Credits"
            value={`$${earnings?.total ?? 0}`}
            color="blue"
          />
          <SummaryCard
            icon={DollarSign}
            label="Total Referrals"
            value={earnings?.count ?? 0}
            color="indigo"
          />
          <SummaryCard
            icon={Clock}
            label="Pending Payout"
            value={`$${earnings?.pending ?? 0}`}
            color="amber"
          />
          <SummaryCard
            icon={CheckCircle}
            label="Total Paid"
            value={`$${earnings?.paid ?? 0}`}
            color="emerald"
          />
        </div>

        {/* Referral history table */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Referral History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : !referrals?.length ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                <DollarSign className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="font-medium text-foreground">No referral credits yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Credits are issued when your referred students are enrolled by the admin.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Student</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Parent</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Enrolled On</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Credit</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referrals.map((r) => (
                      <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">
                          {getStudentName(r.studentId)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {getParentName(r.parentId)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(r.enrolledAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">
                          ${Number(r.creditAmount).toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          {r.status === "paid" ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                              <CheckCircle className="h-3 w-3" />
                              Paid
                              {r.paidAt && (
                                <span className="text-emerald-600">
                                  &nbsp;&middot;&nbsp;{new Date(r.paidAt).toLocaleDateString()}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                              <Clock className="h-3 w-3" />
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    indigo: "bg-indigo-50 text-indigo-600",
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
  };
  return (
    <Card className="border shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{label}</p>
            <p className="text-2xl font-semibold text-foreground">{value}</p>
          </div>
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
