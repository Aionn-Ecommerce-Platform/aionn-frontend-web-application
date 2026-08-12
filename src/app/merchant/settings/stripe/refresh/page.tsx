"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import AuthGuard from "@/components/auth/AuthGuard";
import { stripeConnectService } from "@/lib/services/payout.service";
import { getErrorMessage } from "@/shared/lib/errors";
import { useTranslation } from "@/hooks";

function StripeRefreshInner() {
  const { t } = useTranslation();
  const router = useRouter();
  const { mutate: refresh } = useMutation({
    mutationFn: () => stripeConnectService.getOnboardingLink(),
    onSuccess: (res) => {
      window.location.href = res.url;
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
      router.push("/merchant/payouts");
    },
  });

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="bg-gray-50 min-h-screen flex items-center justify-center p-6">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
        <p className="text-gray-600">{t("merchant.stripeRefresh.loading")}</p>
      </div>
    </div>
  );
}

export default function StripeRefreshPage() {
  return (
    <AuthGuard requiredRoles={["MERCHANT"]}>
      <StripeRefreshInner />
    </AuthGuard>
  );
}
