"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  CardCvcElement,
  CardExpiryElement,
  CardNumberElement,
  Elements,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  CreditCard,
  Loader2,
  Plus,
  ShieldCheck,
  Trash2,
  Wifi,
} from "lucide-react";
import toast from "react-hot-toast";
import { Badge, Button, ConfirmDialog, Input, Modal } from "@/shared/ui";
import AuthGuard from "@/components/auth/AuthGuard";
import Sidebar from "@/components/layout/Sidebar";
import { getErrorMessage } from "@/shared/lib/errors";
import { qk } from "@/lib/query-keys";
import { paymentMethodService } from "@/lib/services";
import type { StripeSetupIntent } from "@/lib/services";
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
  const { t, locale } = useTranslation();
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

  const hasCards = cards.length > 0;

  return (
    <div className="member-page bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          <Sidebar />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-900">
                {locale === "en" ? "Linked Cards" : "Thẻ liên kết"}
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
                                {verified && (
                                  <Badge variant="success">
                                    <Check size={12} className="mr-1" />
                                    {t("paymentMethods.verified")}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {locale === "en"
                                  ? "International Credit / Debit Card"
                                  : "Thẻ thanh toán quốc tế"}
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
  const { t, locale } = useTranslation();
  const stripe = useStripe();
  const elements = useElements();
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [cardholderName, setCardholderName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    if (!cardholderName.trim()) {
      setNameError(
        locale === "en"
          ? "Please enter the cardholder name"
          : "Vui lòng nhập tên in trên thẻ",
      );
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
    <Modal
      isOpen
      onClose={onClose}
      title={t("paymentMethods.addCardTitle")}
      size="md"
    >
      <form onSubmit={submit} className="space-y-4">
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
                {locale === "en" ? "CARDHOLDER" : "CHỦ THẺ"}
              </span>
              <p className="text-sm font-semibold tracking-wider uppercase text-white truncate max-w-[220px]">
                {cardholderName.trim() ||
                  (locale === "en" ? "CARDHOLDER NAME" : "TÊN CHỦ THẺ")}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <span className="block text-[10px] font-medium tracking-wider text-white/50 uppercase">
                {locale === "en" ? "EXPIRES" : "HẾT HẠN"}
              </span>
              <p className="font-mono text-sm tracking-wider text-white/90">
                MM / YY
              </p>
            </div>
          </div>
        </div>

        {/* Cardholder name input */}
        <Input
          label={locale === "en" ? "Cardholder Name" : "Tên in trên thẻ"}
          placeholder={
            locale === "en" ? "e.g. NGUYEN VAN A" : "Ví dụ: NGUYEN VAN A"
          }
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
            {locale === "en" ? "Card Number" : "Số thẻ"}
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
              {locale === "en" ? "Expiry Date" : "Hạn dùng (MM/YY)"}
            </label>
            <div className="rounded-lg border border-gray-300 bg-white px-4 py-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
              <CardExpiryElement options={stripeElementStyle} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {locale === "en" ? "Security Code (CVC)" : "Mã bảo mật (CVC)"}
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
          <span>
            {locale === "en"
              ? "Encrypted & secured by Stripe. Compliant with PCI-DSS Level 1."
              : "Bảo mật chuẩn PCI-DSS bởi Stripe."}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 justify-end pt-3 border-t border-gray-150">
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
