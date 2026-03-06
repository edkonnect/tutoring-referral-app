import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import {
  Users,
  GraduationCap,
  BookOpen,
  UserCheck,
  DollarSign,
  Clock,
  CheckCircle,
  TrendingUp,
} from "lucide-react";
import { useLocation } from "wouter";

export default function AdminDashboard() {
  const { data: stats, isLoading } = trpc.admin.getStats.useQuery();
  const [, setLocation] = useLocation();

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            System-wide overview of the referral program
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={Users} label="Total Promoters" value={stats?.totalPromoters ?? 0} loading={isLoading} color="blue" />
          <StatCard icon={BookOpen} label="Total Parents" value={stats?.totalParents ?? 0} loading={isLoading} color="indigo" />
          <StatCard icon={GraduationCap} label="Total Students" value={stats?.totalStudents ?? 0} loading={isLoading} color="violet" />
          <StatCard icon={UserCheck} label="Enrolled Students" value={stats?.enrolledStudents ?? 0} loading={isLoading} color="emerald" />
          <StatCard icon={DollarSign} label="Total Credits Issued" value={`$${stats?.totalCreditsIssued ?? 0}`} loading={isLoading} color="green" />
          <StatCard icon={Clock} label="Pending Payouts" value={`$${stats?.pendingPayouts ?? 0}`} loading={isLoading} color="amber" />
          <StatCard icon={CheckCircle} label="Paid Referrals" value={stats?.paidReferrals ?? 0} loading={isLoading} color="teal" />
          <StatCard icon={TrendingUp} label="Pending Referrals" value={stats?.pendingReferrals ?? 0} loading={isLoading} color="orange" />
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickAction
            title="Manage Promoters"
            description="View and manage all registered promoters."
            onClick={() => setLocation("/admin/promoters")}
          />
          <QuickAction
            title="Confirm Enrollments"
            description="Review pending students and confirm enrollments."
            onClick={() => setLocation("/admin/enrollments")}
            highlight={!!stats?.pendingReferrals}
          />
          <QuickAction
            title="Manage Payouts"
            description="Process and mark referral fees as paid."
            onClick={() => setLocation("/admin/payouts")}
            highlight={!!stats?.pendingPayouts}
          />
          <QuickAction
            title="View All Parents"
            description="Browse all referred parents in the system."
            onClick={() => setLocation("/admin/parents")}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  loading: boolean;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    indigo: "bg-indigo-50 text-indigo-600",
    violet: "bg-violet-50 text-violet-600",
    emerald: "bg-emerald-50 text-emerald-600",
    green: "bg-green-50 text-green-600",
    amber: "bg-amber-50 text-amber-600",
    teal: "bg-teal-50 text-teal-600",
    orange: "bg-orange-50 text-orange-600",
  };
  return (
    <Card className="border shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{label}</p>
            {loading ? (
              <div className="h-7 w-16 bg-muted animate-pulse rounded" />
            ) : (
              <p className="text-2xl font-semibold text-foreground">{value}</p>
            )}
          </div>
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${colorMap[color] ?? "bg-gray-100 text-gray-600"}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickAction({
  title,
  description,
  onClick,
  highlight,
}: {
  title: string;
  description: string;
  onClick: () => void;
  highlight?: boolean;
}) {
  return (
    <Card
      className={`border shadow-sm cursor-pointer transition-all hover:shadow-md ${
        highlight ? "border-amber-300 bg-amber-50/30 hover:border-amber-400" : "hover:border-primary/40"
      }`}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          {title}
          {highlight && (
            <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  );
}
