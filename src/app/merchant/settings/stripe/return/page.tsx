"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/shared/ui";
import AuthGuard from "@/components/auth/AuthGuard";
import { merchantService } from "@/lib/services";
import { useTranslation } from "@/hooks";

function StripeReturnInner() {
  const { t } = useTranslation();
  const [refetchCount, setRefetchCount] = useState(0);
  const { data: merchant, isLoading } = useQuery({
    queryKey: ["merchant", "me", refetchCount],
    queryFn: () => merchantService.getMine(),
  });

  useEffect(() => {
    const id = setInterval(() => setRefetchCount((n) => n + 1), 3000);
    const stop = setTimeout(() => clearInterval(id), 30000);
    return () => {
      clearInterval(id);
      clearTimeout(stop);
    };
  }, []);

  const m = merchant as typeof merchant & {
    stripeAccountId?: string | null;
    stripeChargesEnabled?: boolean;
    stripePayoutsEnabled?: boolean;
  };
  const ready = m?.stripeChargesEnabled && m?.stripePayoutsEnabled;

  return (
    <div className="bg-gray-50 min-h-screen flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-md w-full text-center">
        {isLoading ? (
          <>
            <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600">
              {t("merchant.stripeReturn.syncing")}
            </p>
          </>
        ) : ready ? (
          <>
            <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              {t("merchant.stripeReturn.linkedTitle")}
            </h1>
            <p className="text-sm text-gray-500 mb-6">
              {t("merchant.stripeReturn.linkedDesc")}
            </p>
            <Link href="/merchant/payouts">
              <Button className="w-full">
                {t("merchant.stripeReturn.viewBalance")}
              </Button>
            </Link>
          </>
        ) : (
          <>
            <AlertCircle className="w-16 h-16 text-amber-600 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              {t("merchant.stripeReturn.incompleteTitle")}
            </h1>
            <p className="text-sm text-gray-500 mb-6">
              {t("merchant.stripeReturn.incompleteDesc")}
            </p>
            <Link href="/merchant/payouts">
              <Button variant="outline" className="w-full">
                {t("merchant.stripeReturn.backToPayouts")}
              </Button>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function StripeReturnPage() {
  return (
    <AuthGuard requiredRoles={["MERCHANT"]}>
      <StripeReturnInner />
    </AuthGuard>
  );
}
