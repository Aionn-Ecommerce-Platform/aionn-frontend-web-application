"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/shared/ui";
import AuthGuard from "@/components/auth/AuthGuard";
import { useTranslation } from "@/hooks";
import { getPaymentFailureMessage } from "@/lib/payment-i18n";
import { paymentService } from "@/lib/services";
import { getErrorMessage } from "@/shared/lib/errors";
import type { Payment } from "@/types";

function PaymentReturnInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { t } = useTranslation();
  const tRef = useRef(t);

  useEffect(() => {
    tRef.current = t;
  }, [t]);

  const paymentId = params.get("paymentId") ?? params.get("vnp_TxnRef");
  const orderIdHint = params.get("orderId");

  const missingId = !paymentId;

  const [payment, setPayment] = useState<Payment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (!paymentId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      try {
        const result = await paymentService.get(paymentId);
        if (cancelled) return;
        setPayment(result);
        setAttempts((n) => n + 1);

        if (result.status === "PAID") {
          toast.success(tRef.current("paymentReturn.successTitle"));

          timer = setTimeout(
            () => router.replace(`/orders/${result.orderId}`),
            1200,
          );
          return;
        }
        if (result.status === "FAILED" || result.status === "REFUNDED") {
          return;
        }

        timer = setTimeout(tick, 2000);
      } catch (err) {
        if (cancelled) return;
        setError(
          getErrorMessage(err, tRef.current("paymentReturn.errorFallback")),
        );
      }
    };
    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [paymentId, router]);

  const orderId = payment?.orderId ?? orderIdHint;

  const view = useMemo(() => {
    if (missingId) return "missing" as const;
    if (error) return "error" as const;
    if (!payment) return "loading" as const;
    if (payment.status === "PAID") return "success" as const;
    if (payment.status === "FAILED") return "failed" as const;
    return "pending" as const;
  }, [payment, error, missingId]);

  return (
    <div className="min-h-[60vh] bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 shadow-lg shadow-gray-200/60 p-8 text-center">
        {view === "loading" && (
          <>
            <Loader2
              size={56}
              className="mx-auto text-blue-600 animate-spin"
              aria-hidden
            />
            <h1 className="mt-5 text-xl font-semibold text-gray-900">
              {t("paymentReturn.loadingTitle")}
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              {t("paymentReturn.loadingDesc")}
            </p>
          </>
        )}

        {view === "pending" && (
          <>
            <Loader2
              size={56}
              className="mx-auto text-blue-600 animate-spin"
              aria-hidden
            />
            <h1 className="mt-5 text-xl font-semibold text-gray-900">
              {t("paymentReturn.pendingTitle")}
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              {t("paymentReturn.pendingDesc")}
            </p>
            <p className="mt-3 text-xs text-gray-400">
              {t("paymentReturn.checkedCount", { count: attempts })}
            </p>
            {orderId && (
              <Link
                href={`/orders/${orderId}`}
                className="mt-5 inline-block text-sm text-blue-600 hover:underline"
              >
                {t("checkout.viewOrder")}
              </Link>
            )}
          </>
        )}

        {view === "success" && (
          <>
            <CheckCircle2
              size={56}
              className="mx-auto text-green-600"
              aria-hidden
            />
            <h1 className="mt-5 text-xl font-semibold text-gray-900">
              {t("paymentReturn.successTitle")}
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              {t("paymentReturn.successDesc")}
            </p>
          </>
        )}

        {view === "failed" && (
          <>
            <XCircle size={56} className="mx-auto text-red-600" aria-hidden />
            <h1 className="mt-5 text-xl font-semibold text-gray-900">
              {t("paymentReturn.failedTitle")}
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              {getPaymentFailureMessage(payment, t)}
            </p>
            <div className="mt-6 flex gap-3 justify-center">
              {orderId && (
                <Link href={`/orders/${orderId}`}>
                  <Button variant="outline">{t("checkout.viewOrder")}</Button>
                </Link>
              )}
              <Link href="/">
                <Button variant="outline">{t("common.home")}</Button>
              </Link>
            </div>
          </>
        )}

        {view === "error" && (
          <>
            <XCircle size={56} className="mx-auto text-red-600" aria-hidden />
            <h1 className="mt-5 text-xl font-semibold text-gray-900">
              {t("paymentReturn.errorTitle")}
            </h1>
            <p className="mt-2 text-sm text-gray-500">{error}</p>
            <div className="mt-6 flex gap-3 justify-center">
              <Link href="/orders">
                <Button variant="outline">{t("paymentReturn.myOrders")}</Button>
              </Link>
              <Link href="/">
                <Button variant="outline">{t("common.home")}</Button>
              </Link>
            </div>
          </>
        )}

        {view === "missing" && (
          <>
            <XCircle size={56} className="mx-auto text-red-600" aria-hidden />
            <h1 className="mt-5 text-xl font-semibold text-gray-900">
              {t("paymentReturn.missingTitle")}
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              {t("paymentReturn.missingDesc")}
            </p>
            <div className="mt-6 flex gap-3 justify-center">
              <Link href="/orders">
                <Button variant="outline">{t("paymentReturn.myOrders")}</Button>
              </Link>
              <Link href="/">
                <Button variant="outline">{t("common.home")}</Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function PaymentReturnPage() {
  return (
    <AuthGuard>
      <Suspense
        fallback={
          <div className="min-h-[60vh] flex items-center justify-center">
            <Loader2 className="animate-spin text-blue-600" size={32} />
          </div>
        }
      >
        <PaymentReturnInner />
      </Suspense>
    </AuthGuard>
  );
}
