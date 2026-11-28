"use client";
import { Banknote, Check, CreditCard, Loader2, PlusCircle } from "lucide-react";
import { Button } from "@/shared/ui";
import { StripeCardSetupModal } from "@/components/payment/StripeCardSetupModal";
import type { StripeSetupIntent } from "@/lib/services";
import type { PaymentMethod } from "@/types";
import { paymentMethodLabel } from "./CheckoutOptions";
type T = (key: string, values?: Record<string, string | number>) => string;
interface Props {
  locale: "vi" | "en";
  loading: boolean;
  vnpay: boolean;
  method?: PaymentMethod | null;
  modalOpen: boolean;
  saving: boolean;
  option: string;
  methods: PaymentMethod[];
  stripeOpen: boolean;
  setup: StripeSetupIntent | null;
  preparing: boolean;
  completing: boolean;
  onModal: (open: boolean) => void;
  onSelect: (option: string) => void;
  onOpenStripe: () => void;
  onCloseStripe: () => void;
  onCompleteStripe: (id: string) => void;
  t: T;
}
export default function CheckoutPaymentPanel(props: Props) {
  const {
    locale,
    loading: loadingPm,
    option: effectivePaymentOption,
    methods: usablePaymentMethods,
    saving: savingPaymentPreference,
    stripeOpen: stripeCardModalOpen,
    setup: stripeSetupIntent,
    preparing,
    completing,
    onSelect: handlePaymentSelection,
    onOpenStripe: openStripeCardModal,
    onCloseStripe,
    onCompleteStripe,
    t,
  } = props;
  const loadingPaymentPreference = false;
  const createStripeSetupMutation = { isPending: preparing };
  const completeStripeSetupMutation = {
    isPending: completing,
    mutate: ({ setupIntentId }: { setupIntentId: string }) =>
      onCompleteStripe(setupIntentId),
  };
  return (
    <>
      {" "}
      <div className="bg-white rounded-2xl border border-gray-400 shadow-sm p-6">
        <h2 className="flex items-center gap-2.5 text-base font-semibold text-gray-900">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand/5 text-brand">
            <CreditCard size={16} />
          </span>
          {locale === "vi" ? t("checkout.paymentMethod") : "Payment method"}
        </h2>
        {loadingPm || loadingPaymentPreference ? (
          <div className="flex justify-center py-5">
            <Loader2 className="animate-spin text-brand" size={20} />
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handlePaymentSelection("COD")}
              disabled={savingPaymentPreference}
              className={`inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-sm transition-all disabled:opacity-50 ${
                effectivePaymentOption === "COD"
                  ? "border-brand bg-brand/5 font-semibold text-brand ring-1 ring-brand/20"
                  : "border-gray-400 bg-white text-gray-700 hover:border-brand/50 hover:bg-gray-50"
              }`}
            >
              <Banknote size={16} className="shrink-0" />
              {locale === "vi" ? t("checkout.cod") : "Cash on delivery"}
              {effectivePaymentOption === "COD" && (
                <Check size={15} className="shrink-0 text-brand" />
              )}
            </button>
            <button
              type="button"
              onClick={() => handlePaymentSelection("VNPAY")}
              disabled={savingPaymentPreference}
              className={`inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-sm transition-all disabled:opacity-50 ${
                effectivePaymentOption === "VNPAY"
                  ? "border-brand bg-brand/5 font-semibold text-brand ring-1 ring-brand/20"
                  : "border-gray-400 bg-white text-gray-700 hover:border-brand/50 hover:bg-gray-50"
              }`}
            >
              <CreditCard size={16} className="shrink-0" />
              VNPay
              {effectivePaymentOption === "VNPAY" && (
                <Check size={15} className="shrink-0 text-brand" />
              )}
            </button>
            {usablePaymentMethods.map((method) => (
              <button
                key={method.methodId}
                type="button"
                onClick={() => handlePaymentSelection(method.methodId)}
                disabled={savingPaymentPreference}
                className={`inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-sm transition-all disabled:opacity-50 ${
                  effectivePaymentOption === method.methodId
                    ? "border-brand bg-brand/5 font-semibold text-brand ring-1 ring-brand/20"
                    : "border-gray-400 bg-white text-gray-700 hover:border-brand/50 hover:bg-gray-50"
                }`}
              >
                <CreditCard size={16} className="shrink-0" />
                <span className="max-w-[180px] truncate">
                  {paymentMethodLabel(method)}
                </span>
                {effectivePaymentOption === method.methodId && (
                  <Check size={15} className="shrink-0 text-brand" />
                )}
              </button>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={openStripeCardModal}
              loading={createStripeSetupMutation.isPending}
              className="inline-flex h-11 rounded-xl border-dashed border-gray-400 px-4 text-sm font-semibold text-gray-700 hover:border-brand hover:text-brand"
            >
              <PlusCircle size={16} className="mr-1.5" />
              {t("checkout.addStripeCard")}
            </Button>
          </div>
        )}
      </div>
      <StripeCardSetupModal
        isOpen={stripeCardModalOpen}
        setupIntent={stripeSetupIntent}
        preparing={createStripeSetupMutation.isPending}
        completing={completeStripeSetupMutation.isPending}
        onClose={() => {
          if (!completeStripeSetupMutation.isPending) {
            onCloseStripe();
          }
        }}
        onComplete={(setupIntentId) =>
          completeStripeSetupMutation.mutate({ setupIntentId })
        }
      />
    </>
  );
}
