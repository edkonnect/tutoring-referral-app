import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Users, Mail, Link2, Copy, ExternalLink, Eye } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Promoter = {
  id: number;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  createdAt: Date;
  lastSignedIn: Date;
  referralToken: string | null;
};

function PromoterRow({
  promoter: p,
  visitCount,
}: {
  promoter: Promoter;
  visitCount: number;
}) {
  const [copied, setCopied] = useState(false);
  const referralUrl = p.referralToken
    ? `${window.location.origin}/refer/${p.referralToken}`
    : null;

  const handleCopy = async () => {
    if (!referralUrl) return;
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      toast.success("Referral link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  return (
    <tr className="border-b last:border-0 hover:bg-muted/20 transition-colors">
      <td className="px-4 py-3 font-medium text-foreground">
        {p.name || <span className="text-muted-foreground italic">No name</span>}
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Mail className="h-3.5 w-3.5" />
          {p.email || "—"}
        </span>
      </td>
      <td className="px-4 py-3 text-muted-foreground capitalize">
        {p.loginMethod || "—"}
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {new Date(p.createdAt).toLocaleDateString()}
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {new Date(p.lastSignedIn).toLocaleDateString()}
      </td>
      {/* Visit count */}
      <td className="px-4 py-3">
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
          <Eye className="h-3 w-3" />
          {visitCount} visit{visitCount !== 1 ? "s" : ""}
        </span>
      </td>
      {/* Referral link */}
      <td className="px-4 py-3">
        {referralUrl ? (
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground font-mono truncate max-w-[120px]">
              /refer/{p.referralToken}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleCopy}
              title="Copy link"
            >
              <Copy className={`h-3 w-3 ${copied ? "text-emerald-600" : ""}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => window.open(referralUrl, "_blank")}
              title="Preview"
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <span className="flex items-center gap-1 text-xs text-muted-foreground italic">
            <Link2 className="h-3 w-3" />
            Not generated
          </span>
        )}
      </td>
    </tr>
  );
}

export default function AdminPromoters() {
  const { data: promoters, isLoading } = trpc.admin.listPromoters.useQuery();
  const { data: visitStats, isLoading: statsLoading } =
    trpc.referralLink.getAllVisitStats.useQuery();

  // Build a map of promoterId → total visits for O(1) lookup
  const visitMap = new Map<number, number>(
    (visitStats ?? []).map((s) => [s.promoterId, s.total])
  );

  const loading = isLoading || statsLoading;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground">Promoters</h1>
          <p className="text-muted-foreground mt-1">
            All registered promoters — including their referral link visit counts.
          </p>
        </div>

        {loading ? (
          <div className="grid gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : !promoters?.length ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="font-medium text-foreground">No promoters yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Promoters will appear here once they sign up and are assigned the
                promoter role.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Name
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Email
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Login Method
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Joined
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Last Sign In
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Link Visits
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Referral Link
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {promoters.map((p) => (
                    <PromoterRow
                      key={p.id}
                      promoter={p}
                      visitCount={visitMap.get(p.id) ?? 0}
                    />
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
