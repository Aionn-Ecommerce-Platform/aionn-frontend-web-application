"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CreditCard, Loader2, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Badge, Button, ConfirmDialog } from "@/shared/ui";
import AuthGuard from "@/components/auth/AuthGuard";
import Sidebar from "@/components/layout/Sidebar";
import {
  StripeCardSetupModal,
  isStripeClientConfigured,
} from "@/components/payment/StripeCardSetupModal";
import { getErrorMessage } from "@/shared/lib/errors";
import { qk } from "@/lib/query-keys";
import { paymentMethodService } from "@/lib/services";
import type { StripeSetupIntent } from "@/lib/services";
import { useTranslation } from "@/hooks";
const CARD_BRANDS = new Set([
  "VISA",
  "MASTERCARD",
  "AMEX",
  "DISCOVER",
  "JCB",
  "DINERS",
  "UNIONPAY",
  "CARD",
]);

function VisaLogo({ className = "w-11 h-7" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 44 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="44" height="28" rx="4" fill="#0E4595" />
      <path
        d="M17.5 19H15.1L16.6 9.5H19L17.5 19ZM13.1 9.5L10.8 16.1L10.5 14.6C10 13.1 8.7 11.4 7.2 10.6L9.3 19H11.8L15.6 9.5H13.1ZM25.6 15.8C25.6 12.2 20.6 12 20.6 10.3C20.6 9.6 21.2 9 22.6 8.8C23.3 8.7 25.1 8.6 26.8 9.4L27.4 7.1C26.7 6.8 25.6 6.5 24.3 6.5C20.8 6.5 18.3 8.4 18.3 11.1C18.3 15 23.5 14.8 23.5 17.1C23.5 17.8 22.7 18.5 21.3 18.5C19.6 18.5 17.9 17.7 17.1 17.2L16.5 19.6C17.5 20.1 19.3 20.5 21.2 20.5C24.9 20.5 27.3 18.6 25.6 15.8ZM33.5 9.5H31.5C30.9 9.5 30.3 9.9 30.1 10.5L25.6 19H28.2L28.8 17.5H32L32.4 19H34.7L33.5 9.5ZM29.4 15.3L30.7 11.6L31.5 15.3H29.4Z"
        fill="white"
      />
    </svg>
  );
}

function MastercardLogo({ className = "w-11 h-7" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 44 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="44" height="28" rx="4" fill="#141414" />
      <circle cx="17" cy="14" r="8" fill="#EB001B" />
      <circle cx="27" cy="14" r="8" fill="#F79E1B" fillOpacity="0.88" />
    </svg>
  );
}

function JcbLogo({ className = "w-11 h-7" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 44 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="44" height="28" rx="4" fill="#FFFFFF" stroke="#E5E7EB" />
      <rect x="7" y="5" width="8" height="18" rx="2" fill="#003B99" />
      <rect x="18" y="5" width="8" height="18" rx="2" fill="#ED0006" />
      <rect x="29" y="5" width="8" height="18" rx="2" fill="#007940" />
      <text
        x="8.5"
        y="17.5"
        fill="white"
        fontSize="7"
        fontWeight="bold"
        fontFamily="sans-serif"
      >
        J
      </text>
      <text
        x="19.5"
        y="17.5"
        fill="white"
        fontSize="7"
        fontWeight="bold"
        fontFamily="sans-serif"
      >
        C
      </text>
      <text
        x="30.5"
        y="17.5"
        fill="white"
        fontSize="7"
        fontWeight="bold"
        fontFamily="sans-serif"
      >
        B
      </text>
    </svg>
  );
}

function AmexLogo({ className = "w-11 h-7" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 44 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="44" height="28" rx="4" fill="#006FCF" />
      <text
        x="5"
        y="18"
        fill="white"
        fontSize="8"
        fontWeight="bold"
        fontFamily="sans-serif"
        letterSpacing="0.8"
      >
        AMEX
      </text>
    </svg>
  );
}

function GenericCardLogo({ className = "w-11 h-7" }: { className?: string }) {
  return (
    <div
      className={`${className} rounded bg-gray-100 border border-gray-200 flex items-center justify-center`}
    >
      <CreditCard size={18} className="text-gray-500" />
    </div>
  );
}

function CardBrandLogo({
  provider,
  className,
}: {
  provider?: string;
  className?: string;
}) {
  const p = provider?.toUpperCase() || "";
  if (p === "VISA") return <VisaLogo className={className} />;
  if (p === "MASTERCARD") return <MastercardLogo className={className} />;
  if (p === "JCB") return <JcbLogo className={className} />;
  if (p === "AMEX" || p === "AMERICAN_EXPRESS")
    return <AmexLogo className={className} />;
  return <GenericCardLogo className={className} />;
}

function PaymentMethodsInner() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [setupIntent, setSetupIntent] = useState<StripeSetupIntent | null>(
    null,
  );

  const { data: methods, isLoading } = useQuery({
    queryKey: qk.paymentMethods,
    queryFn: () => paymentMethodService.listMine(),
  });

  const createSetupMutation = useMutation({
    mutationFn: () => paymentMethodService.createStripeSetupIntent(),
    onSuccess: (result) => setSetupIntent(result),
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const completeSetupMutation = useMutation({
    mutationFn: (input: { setupIntentId: string }) =>
      paymentMethodService.completeStripeSetupIntent(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.paymentMethods });
      setSetupIntent(null);
      toast.success(t("paymentMethods.cardAdded"));
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const removeMutation = useMutation({
    mutationFn: (methodId: string) => paymentMethodService.remove(methodId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.paymentMethods });
      setDeleteId(null);
      toast.success(t("paymentMethods.deleteSuccess"));
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const cards = useMemo(() => {
    return (methods || []).filter((method) => {
      const provider = method.provider?.toUpperCase();
      return (
        method.status !== "REMOVED" && !!provider && CARD_BRANDS.has(provider)
      );
    });
  }, [methods]);

  const [stripeModalOpen, setStripeModalOpen] = useState(false);

  const openAddCard = () => {
    if (!isStripeClientConfigured) {
      toast.error(t("stripeSetup.missingKey"));
      return;
    }
    setStripeModalOpen(true);
    createSetupMutation.mutate();
  };

  const hasCards = cards.length > 0;

  return (
    <div className="member-page bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          <Sidebar />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-900">
                {t("paymentMethods.cardsTitle")}
              </h1>
              <Button
                size="sm"
                onClick={openAddCard}
                loading={createSetupMutation.isPending}
              >
                <Plus size={16} className="mr-1" />
                {t("paymentMethods.addCard")}
              </Button>
            </div>

            <div className="bg-white rounded-sm border border-gray-100 overflow-hidden">
              {isLoading ? (
                <div className="py-12 flex justify-center">
                  <Loader2 className="animate-spin text-blue-600" size={28} />
                </div>
              ) : hasCards ? (
                <div className="divide-y divide-gray-200">
                  {cards.map((method) => {
                    const verified =
                      method.status === "ACTIVE" ||
                      method.status === "VERIFIED";
                    return (
                      <div
                        key={method.methodId}
                        className="p-6 hover:bg-gray-100/80 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="flex-shrink-0 shadow-xs rounded overflow-hidden">
                              <CardBrandLogo provider={method.provider} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold text-gray-900">
                                  {formatCardBrand(method.provider)}
                                  {method.last4Digits &&
                                    ` •••• ${method.last4Digits}`}
                                </span>
                                <Badge variant="info">
                                  {formatCardBrand(method.provider)}
                                </Badge>
                                {verified ? (
                                  <Badge variant="success">
                                    <Check size={12} className="mr-1" />
                                    {t("paymentMethods.verified")}
                                  </Badge>
                                ) : (
                                  <Badge variant="warning">
                                    {method.status}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {t("paymentMethods.cardsTitle")}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => setDeleteId(method.methodId)}
                              className="p-2 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                              title={t("common.delete")}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-16 text-center text-sm text-gray-450 font-medium">
                  {t("paymentMethods.noCards")}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <StripeCardSetupModal
        isOpen={stripeModalOpen}
        setupIntent={setupIntent}
        preparing={createSetupMutation.isPending}
        completing={completeSetupMutation.isPending}
        onClose={() => {
          setStripeModalOpen(false);
          setSetupIntent(null);
        }}
        onComplete={(setupIntentId) => {
          completeSetupMutation.mutate({ setupIntentId });
          setStripeModalOpen(false);
        }}
      />

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && removeMutation.mutate(deleteId)}
        title={t("paymentMethods.deleteTitle")}
        message={t("paymentMethods.deleteConfirm")}
        confirmLabel={t("common.delete")}
        variant="danger"
        loading={removeMutation.isPending}
      />
    </div>
  );
}

function formatCardBrand(provider: string) {
  return provider
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function PaymentMethodsPage() {
  return (
    <AuthGuard>
      <PaymentMethodsInner />
    </AuthGuard>
  );
}
