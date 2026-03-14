import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DollarSign, Save, Settings, RefreshCw, Info } from "lucide-react";
import { toast } from "sonner";

export default function AdminSettings() {
  const { data: settings, isLoading, refetch } = trpc.admin.getSettings.useQuery();

  const [referralFee, setReferralFee] = useState("");
  const [productFee, setProductFee] = useState("");
  const [referralFeeEdited, setReferralFeeEdited] = useState(false);
  const [productFeeEdited, setProductFeeEdited] = useState(false);

  useEffect(() => {
    if (settings) {
      setReferralFee(settings.referralFee ?? "50");
      setProductFee(settings.productReferralFee ?? "25");
      setReferralFeeEdited(false);
      setProductFeeEdited(false);
    }
  }, [settings]);

  const updateReferralFeeMutation = trpc.admin.updateReferralFee.useMutation({
    onSuccess: (data) => {
      toast.success(`Referral fee updated to $${data.fee.toFixed(2)}`);
      setReferralFeeEdited(false);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateProductFeeMutation = trpc.admin.updateProductReferralFee.useMutation({
    onSuccess: (data) => {
      toast.success(`Product referral fee updated to $${data.fee.toFixed(2)}`);
      setProductFeeEdited(false);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSaveReferralFee = () => {
    const val = parseFloat(referralFee);
    if (isNaN(val) || val <= 0) {
      toast.error("Please enter a valid positive number");
      return;
    }
    updateReferralFeeMutation.mutate({ fee: val });
  };

  const handleSaveProductFee = () => {
    const val = parseFloat(productFee);
    if (isNaN(val) || val <= 0) {
      toast.error("Please enter a valid positive number");
      return;
    }
    updateProductFeeMutation.mutate({ fee: val });
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Settings className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Configure referral fees and other program parameters.
          </p>
        </div>
      </div>

      <Separator />

      {/* Referral Fees Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-500" />
            <CardTitle className="text-lg">Referral Fees</CardTitle>
          </div>
          <CardDescription>
            Set the credit amount awarded to promoters when a referral or product enrollment is confirmed.
            Changes take effect immediately for all future enrollments — existing records retain their
            original credit amounts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Loading settings…
            </div>
          ) : (
            <>
              {/* Student Referral Fee */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="referralFee" className="text-sm font-medium">
                    Student Referral Fee
                  </Label>
                  <Badge variant="outline" className="text-xs font-mono">
                    Current: ${parseFloat(settings?.referralFee ?? "50").toFixed(2)}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground -mt-1">
                  Credit issued when a promoter's referred student is enrolled by an admin.
                </p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input
                      id="referralFee"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={referralFee}
                      onChange={(e) => {
                        setReferralFee(e.target.value);
                        setReferralFeeEdited(true);
                      }}
                      className="pl-7"
                      placeholder="50.00"
                    />
                  </div>
                  <Button
                    onClick={handleSaveReferralFee}
                    disabled={!referralFeeEdited || updateReferralFeeMutation.isPending}
                    size="default"
                    className="gap-2 shrink-0"
                  >
                    {updateReferralFeeMutation.isPending ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Product Referral Fee */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="productFee" className="text-sm font-medium">
                    Product Referral Fee
                  </Label>
                  <Badge variant="outline" className="text-xs font-mono">
                    Current: ${parseFloat(settings?.productReferralFee ?? "25").toFixed(2)}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground -mt-1">
                  Credit issued when a parent enrolls in a product via a promoter's promotion email.
                </p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input
                      id="productFee"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={productFee}
                      onChange={(e) => {
                        setProductFee(e.target.value);
                        setProductFeeEdited(true);
                      }}
                      className="pl-7"
                      placeholder="25.00"
                    />
                  </div>
                  <Button
                    onClick={handleSaveProductFee}
                    disabled={!productFeeEdited || updateProductFeeMutation.isPending}
                    size="default"
                    className="gap-2 shrink-0"
                  >
                    {updateProductFeeMutation.isPending ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Info note */}
      <div className="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30 p-4 text-sm text-blue-700 dark:text-blue-300">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <p>
          Fee changes apply only to <strong>new</strong> enrollments. Historical records retain the
          credit amount that was active at the time of enrollment, ensuring accurate payout tracking.
        </p>
      </div>
    </div>
  );
}
