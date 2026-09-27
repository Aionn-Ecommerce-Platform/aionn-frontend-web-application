"use client";

import { FormEvent, useState } from "react";
import {
  CardCvcElement,
  CardExpiryElement,
  CardNumberElement,
  Elements,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Loader2, ShieldCheck, Wifi } from "lucide-react";
import { Button, Input, Modal } from "@/shared/ui";
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
  const [cardholderName, setCardholderName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!stripe || !elements || !setupIntent) return;

    if (!cardholderName.trim()) {
      setNameError(t("stripeSetup.cardholderRequired"));
      return;
    }
    setNameError(null);

    const cardNumber = elements.getElement(CardNumberElement);
    if (!cardNumber) return;

    setStripeError(null);
    setConfirming(true);
    const result = await stripe.confirmCardSetup(setupIntent.clientSecret, {
      payment_method: {
        card: cardNumber,
        billing_details: {
          name: cardholderName.trim(),
        },
      },
    });
    setConfirming(false);

    if (result.error) {
      setStripeError(result.error.message || t("stripeSetup.errorFallback"));
      return;
    }

    onComplete(result.setupIntent?.id || setupIntent.setupIntentId);
  };

  const busy = preparing || completing || confirming;

  const stripeElementStyle = {
    style: {
      base: {
        color: "#111827",
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontSize: "15px",
        "::placeholder": { color: "#9ca3af" },
      },
      invalid: { color: "#dc2626" },
    },
  };

  return (
    <Modal isOpen onClose={onClose} title={t("stripeSetup.title")} size="md">
      {preparing || !setupIntent ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500">
          <Loader2 size={20} className="animate-spin text-blue-600" />
          {t("stripeSetup.preparing")}
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-4">
          {/* Visual card banner with enhanced height and realistic details */}
          <div className="h-52 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden flex flex-col justify-between bg-gradient-to-tr from-slate-900 via-indigo-950 to-blue-900 border border-white/10">
            <div className="absolute -right-6 -bottom-10 w-36 h-36 bg-blue-500/20 rounded-full blur-xl pointer-events-none" />
            <div className="absolute -left-6 -top-10 w-36 h-36 bg-indigo-500/20 rounded-full blur-xl pointer-events-none" />

            {/* Top row: Chip + Contactless & Card Network Logos */}
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                {/* Simulated EMV Smart Chip */}
                <div className="w-11 h-8 rounded-md bg-gradient-to-tr from-amber-200 via-yellow-400 to-amber-500 p-1 border border-yellow-300/60 shadow-inner flex flex-col justify-around">
                  <div className="border-t border-b border-amber-600/40 h-1.5 rounded-xs" />
                  <div className="border-t border-b border-amber-600/40 h-1.5 rounded-xs" />
                </div>
                <Wifi size={20} className="rotate-90 text-white/70" />
              </div>
              <div className="flex items-center gap-1.5 bg-black/35 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-bold tracking-wide border border-white/10">
                <span className="text-white/95">VISA</span>
                <span className="text-white/40">•</span>
                <span className="text-white/95">MC</span>
                <span className="text-white/40">•</span>
                <span className="text-white/95">JCB</span>
              </div>
            </div>

            {/* Middle row: Card number placeholder */}
            <div className="relative z-10 py-1">
              <p className="font-mono text-xl sm:text-2xl tracking-[0.25em] text-white/95 font-medium select-none">
                •••• •••• •••• ••••
              </p>
            </div>

            {/* Bottom row: Cardholder Name & Expiry */}
            <div className="flex items-end justify-between relative z-10 text-xs">
              <div className="min-w-0 pr-4">
                <span className="block text-[10px] font-medium tracking-wider text-white/50 uppercase">
                  {t("stripeSetup.cardholder")}
                </span>
                <p className="text-sm font-semibold tracking-wider uppercase text-white truncate max-w-[220px]">
                  {cardholderName.trim() || t("stripeSetup.cardholderPlaceholder")}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="block text-[10px] font-medium tracking-wider text-white/50 uppercase">
                  {t("stripeSetup.expires")}
                </span>
                <p className="font-mono text-sm tracking-wider text-white/90">
                  MM / YY
                </p>
              </div>
            </div>
          </div>

          {/* Cardholder name input */}
          <Input
            label={t("stripeSetup.cardholderLabel")}
            placeholder={t("stripeSetup.cardholderInputPlaceholder")}
            value={cardholderName}
            onChange={(e) => {
              setCardholderName(e.target.value.toUpperCase());
              if (nameError) setNameError(null);
            }}
            error={nameError || undefined}
            required
          />

          {/* Separate Card Number input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("stripeSetup.cardNumber")}
            </label>
            <div className="rounded-lg border border-gray-300 bg-white px-4 py-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
              <CardNumberElement
                options={{
                  showIcon: true,
                  ...stripeElementStyle,
                }}
              />
            </div>
          </div>

          {/* Separate Expiry Date and CVC inputs */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("stripeSetup.expiryDate")}
              </label>
              <div className="rounded-lg border border-gray-300 bg-white px-4 py-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                <CardExpiryElement options={stripeElementStyle} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("stripeSetup.securityCode")}
              </label>
              <div className="rounded-lg border border-gray-300 bg-white px-4 py-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                <CardCvcElement options={stripeElementStyle} />
              </div>
            </div>
          </div>

          {stripeError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-start gap-2">
              <span>•</span>
              <p>{stripeError}</p>
            </div>
          )}

          {/* Security assurance footer */}
          <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 p-2.5 rounded-lg border border-gray-200">
            <ShieldCheck size={16} className="text-green-600 flex-shrink-0" />
            <span>{t("stripeSetup.pciDssNotice")}</span>
          </div>


          {/* Action buttons */}
          <div className="flex gap-2 justify-end pt-3 border-t border-gray-150">
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
