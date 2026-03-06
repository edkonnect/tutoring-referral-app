import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Users, GraduationCap, DollarSign, Clock, CheckCircle, TrendingUp } from "lucide-react";
import { useLocation } from "wouter";
import ReferralLinkCard from "@/components/ReferralLinkCard";

export default function PromoterDashboard() {
  const { data: stats, isLoading } = trpc.promoter.getStats.useQuery();
  const [, setLocation] = useLocation();

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overview of your referral activity and earnings
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <StatCard
            icon={Users}
            label="Parents Referred"
            value={stats?.totalParents ?? 0}
            loading={isLoading}
            color="blue"
          />
          <StatCard
            icon={GraduationCap}
            label="Students Added"
            value={stats?.totalStudents ?? 0}
            loading={isLoading}
            color="indigo"
          />
          <StatCard
            icon={CheckCircle}
            label="Enrolled Students"
            value={stats?.enrolledStudents ?? 0}
            loading={isLoading}
            color="emerald"
          />
          <StatCard
            icon={DollarSign}
            label="Total Credits Earned"
            value={`$${stats?.total ?? 0}`}
            loading={isLoading}
            color="green"
          />
          <StatCard
            icon={Clock}
            label="Pending Payout"
            value={`$${stats?.pending ?? 0}`}
            loading={isLoading}
            color="amber"
          />
          <StatCard
            icon={TrendingUp}
            label="Total Paid Out"
            value={`$${stats?.paid ?? 0}`}
            loading={isLoading}
            color="purple"
          />
        </div>

        {/* Referral Link */}
        <div className="mb-8">
          <ReferralLinkCard />
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <QuickAction
            title="Add a Parent"
            description="Register a new referred parent and their contact details."
            onClick={() => setLocation("/promoter/parents/new")}
          />
          <QuickAction
            title="Add a Student"
            description="Add a student under one of your referred parents."
            onClick={() => setLocation("/promoter/students")}
          />
          <QuickAction
            title="View Earnings"
            description="Track your referral credits and payout status."
            onClick={() => setLocation("/promoter/earnings")}
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
    emerald: "bg-emerald-50 text-emerald-600",
    green: "bg-green-50 text-green-600",
    amber: "bg-amber-50 text-amber-600",
    purple: "bg-purple-50 text-purple-600",
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
}: {
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <Card
      className="border shadow-sm cursor-pointer hover:border-primary/40 hover:shadow-md transition-all"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  );
}
