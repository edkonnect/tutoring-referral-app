import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import {
  Link2,
  Copy,
  RefreshCw,
  CheckCheck,
  ExternalLink,
  Share2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function ReferralLinkCard() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.referralLink.getMyToken.useQuery();
  const [copied, setCopied] = useState(false);

  const regenerateMutation = trpc.referralLink.regenerateToken.useMutation({
    onSuccess: () => {
      utils.referralLink.getMyToken.invalidate();
      toast.success("Referral link regenerated. Your old link is now invalid.");
    },
    onError: (e) => toast.error(e.message),
  });

  const referralUrl = data?.token
    ? `${window.location.origin}/refer/${data.token}`
    : null;

  const handleCopy = async () => {
    if (!referralUrl) return;
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      toast.success("Referral link copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Could not copy to clipboard. Please copy the link manually.");
    }
  };

  const handleShare = async () => {
    if (!referralUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join our tutoring program",
          text: "I'd like to refer you to our tutoring program. Click the link below to register your interest!",
          url: referralUrl,
        });
      } catch {
        // User cancelled share — no-op
      }
    } else {
      handleCopy();
    }
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Link2 className="h-4 w-4 text-primary" />
          Your Referral Link
        </CardTitle>
        <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
          Share this link with parents. When they register, they'll be automatically linked to your account and you'll earn a $50 credit once their child is enrolled.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Link display */}
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0 bg-muted/50 border rounded-lg px-3 py-2.5">
            {isLoading ? (
              <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
            ) : referralUrl ? (
              <p className="text-sm font-mono text-foreground truncate select-all">
                {referralUrl}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground italic">Generating link…</p>
            )}
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={handleCopy}
            disabled={!referralUrl || isLoading}
            title="Copy link"
          >
            {copied ? (
              <CheckCheck className="h-4 w-4 text-emerald-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            className="gap-2 flex-1 sm:flex-none"
            onClick={handleCopy}
            disabled={!referralUrl || isLoading}
          >
            {copied ? (
              <>
                <CheckCheck className="h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy Link
              </>
            )}
          </Button>

          <Button
            variant="outline"
            className="gap-2 flex-1 sm:flex-none"
            onClick={handleShare}
            disabled={!referralUrl || isLoading}
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>

          {referralUrl && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => window.open(referralUrl, "_blank")}
              title="Preview registration page"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Regenerate link */}
        <div className="pt-1 border-t">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Regenerating creates a new link and invalidates the current one.
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs h-7 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => regenerateMutation.mutate()}
              disabled={regenerateMutation.isPending || isLoading}
            >
              <RefreshCw
                className={`h-3 w-3 ${regenerateMutation.isPending ? "animate-spin" : ""}`}
              />
              {regenerateMutation.isPending ? "Regenerating…" : "Regenerate"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
