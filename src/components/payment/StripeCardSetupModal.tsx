"use client";

import { FormEvent, useState } from "react";
import {
  CardElement,
  Elements,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Loader2 } from "lucide-react";
import { Button, Modal } from "@/shared/ui";
import type { StripeSetupIntent } from "@/lib/services";
import { useTranslation } from "@/hooks";

const stripePublishableKey =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
const stripePromise = stripePublishableKey
  ? loadStripe(stripePublishableKey)
  : null;

export const isStripeClientConfigured = Boolean(stripePromise);

interface StripeCardSetupModalProps {
  isOpen: boolean;
  setupIntent: StripeSetupIntent | null;
  preparing: boolean;
  completing: boolean;
  onClose: () => void;
  onComplete: (setupIntentId: string) => void;
}

export function StripeCardSetupModal({
  isOpen,
  setupIntent,
  preparing,
  completing,
  onClose,
  onComplete,
}: StripeCardSetupModalProps) {
  const { t } = useTranslation();
  if (!isOpen) return null;

  if (!stripePromise) {
    return (
      <Modal isOpen onClose={onClose} title="Stripe" size="sm">
        <p className="text-sm text-red-600">{t("stripeSetup.missingKey")}</p>
      </Modal>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <StripeCardSetupForm
        setupIntent={setupIntent}
        preparing={preparing}
        completing={completing}
        onClose={onClose}
        onComplete={onComplete}
      />
    </Elements>
  );
}

function StripeCardSetupForm({
  setupIntent,
  preparing,
  completing,
  onClose,
  onComplete,
}: Omit<StripeCardSetupModalProps, "isOpen">) {
  const { t } = useTranslation();
  const stripe = useStripe();
  const elements = useElements();
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!stripe || !elements || !setupIntent) return;

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

  const busy = preparing || completing || confirming;

  return (
    <Modal isOpen onClose={onClose} title={t("stripeSetup.title")} size="sm">
      {preparing || !setupIntent ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-500">
          <Loader2 size={18} className="animate-spin text-blue-600" />
          {t("stripeSetup.preparing")}
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div className="rounded-md border border-gray-200 bg-white px-3 py-3">
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
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={busy}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              loading={completing || confirming}
              disabled={!stripe || busy}
            >
              {t("stripeSetup.confirm")}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
