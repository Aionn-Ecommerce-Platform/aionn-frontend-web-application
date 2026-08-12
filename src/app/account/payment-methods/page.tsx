"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  CardElement,
  Elements,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CreditCard, Loader2, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Badge, Button, ConfirmDialog, Modal } from "@/shared/ui";
import AuthGuard from "@/components/auth/AuthGuard";
import Sidebar from "@/components/layout/Sidebar";
import { getErrorMessage } from "@/shared/lib/errors";
import { qk } from "@/lib/query-keys";
import { paymentMethodService } from "@/lib/services";
import type { StripeSetupIntent } from "@/lib/services";
import type { PaymentMethod } from "@/types";
import { useTranslation } from "@/hooks";

const stripePublishableKey =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
const stripePromise = stripePublishableKey
  ? loadStripe(stripePublishableKey)
  : null;
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

  const openAddCard = () => {
    if (!stripePublishableKey || !stripePromise) {
      toast.error(t("stripeSetup.missingKey"));
      return;
    }
    createSetupMutation.mutate();
  };

  const renderMethodItem = (method: PaymentMethod) => {
    const verified = method.status === "ACTIVE" || method.status === "VERIFIED";
    return (
      <div
        key={method.methodId}
        className="bg-white rounded-xl border border-gray-100 p-5 flex items-center justify-between shadow-sm hover:border-gray-200 transition-all"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-8 bg-gray-50 rounded border border-gray-100 flex items-center justify-center flex-shrink-0">
            <CreditCard size={20} className="text-gray-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {formatCardBrand(method.provider)}
              {method.last4Digits && ` **** ${method.last4Digits}`}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              {verified ? (
                <span className="text-xs text-green-600 flex items-center gap-1 font-medium">
                  <Check size={12} /> {t("paymentMethods.verified")}
                </span>
              ) : (
                <Badge variant="warning">{method.status}</Badge>
              )}
            </div>
          </div>
        </div>
        <button
          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
          title={t("common.delete")}
          onClick={() => setDeleteId(method.methodId)}
        >
          <Trash2 size={16} />
        </button>
      </div>
    );
  };

  return (
    <div className="member-page bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          <Sidebar />
          <div className="flex-1 space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">
              {t("paymentMethods.title")}
            </h1>

            {isLoading ? (
              <div className="bg-white rounded-xl border border-gray-100 p-12 flex justify-center animate-pulse">
                <Loader2 className="animate-spin text-blue-600" size={28} />
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
                <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
                  <h2 className="text-lg font-bold text-gray-900">
                    {t("paymentMethods.cardsTitle")}
                  </h2>
                  <Button
                    size="sm"
                    onClick={openAddCard}
                    loading={createSetupMutation.isPending}
                  >
                    <Plus size={16} className="mr-1" />
                    {t("paymentMethods.addCard")}
                  </Button>
                </div>

                {cards.length === 0 ? (
                  <div className="py-12 text-center text-sm text-gray-450 font-medium bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                    {t("paymentMethods.noCards")}
                  </div>
                ) : (
                  <div className="space-y-3">{cards.map(renderMethodItem)}</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {setupIntent && stripePromise && (
        <Elements stripe={stripePromise}>
          <AddCardModal
            setupIntent={setupIntent}
            onClose={() => setSetupIntent(null)}
            onComplete={(setupIntentId) =>
              completeSetupMutation.mutate({ setupIntentId })
            }
            loading={completeSetupMutation.isPending}
          />
        </Elements>
      )}

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

function AddCardModal({
  setupIntent,
  onClose,
  onComplete,
  loading,
}: {
  setupIntent: StripeSetupIntent;
  onClose: () => void;
  onComplete: (setupIntentId: string) => void;
  loading: boolean;
}) {
  const { t } = useTranslation();
  const stripe = useStripe();
  const elements = useElements();
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    const card = elements.getElement(CardElement);
    if (!card) return;

    setStripeError(null);
    setConfirming(true);
    const result = await stripe.confirmCardSetup(setupIntent.clientSecret, {
      payment_method: { card },
    });
    setConfirming(false);

    if (result.error) {
      setStripeError(result.error.message || t("stripeSetup.errorFallback"));
      return;
    }

    onComplete(result.setupIntent?.id || setupIntent.setupIntentId);
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={t("paymentMethods.addCardTitle")}
      size="sm"
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="rounded-lg border border-gray-200 bg-white px-3 py-3">
          <CardElement
            options={{
              hidePostalCode: true,
              style: {
                base: {
                  color: "#111827",
                  fontFamily: "system-ui, -apple-system, sans-serif",
                  fontSize: "16px",
                  "::placeholder": { color: "#9ca3af" },
                },
                invalid: { color: "#dc2626" },
              },
            }}
          />
        </div>
        {stripeError && <p className="text-sm text-red-600">{stripeError}</p>}
        <div className="flex gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading || confirming}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            loading={loading || confirming}
            disabled={!stripe}
          >
            {t("paymentMethods.saveCard")}
          </Button>
        </div>
      </form>
    </Modal>
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
