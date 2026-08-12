"use client";
import { Banknote, Check, CreditCard, Loader2, PlusCircle } from "lucide-react";
import { Button, Modal } from "@/shared/ui";
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
    vnpay: isVnpay,
    method: effectivePaymentMethod,
    modalOpen: paymentModalOpen,
    saving: savingPaymentPreference,
    option: effectivePaymentOption,
    methods: usablePaymentMethods,
    stripeOpen: stripeCardModalOpen,
    setup: stripeSetupIntent,
    preparing,
    completing,
    onModal: setPaymentModalOpen,
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
        <div className="flex items-center justify-between gap-4">
          <h2 className="flex items-center gap-2.5 text-base font-semibold text-gray-900">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <CreditCard size={16} />
            </span>
            {locale === "vi" ? t("checkout.paymentMethod") : "Payment method"}
          </h2>
          <button
            type="button"
            onClick={() => setPaymentModalOpen(true)}
            disabled={savingPaymentPreference}
            className="text-sm font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50"
          >
            {t("checkout.change")}
          </button>
        </div>
        {loadingPm || loadingPaymentPreference ? (
          <div className="flex justify-center py-5">
            <Loader2 className="animate-spin text-blue-600" size={20} />
          </div>
        ) : isVnpay ? (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-gray-400 bg-gray-50 px-4 py-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm ring-1 ring-gray-100">
              <CreditCard size={16} />
            </span>
            <span className="font-medium text-gray-900">VNPay</span>
          </div>
        ) : effectivePaymentMethod ? (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-gray-400 bg-gray-50 px-4 py-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm ring-1 ring-gray-100">
              <CreditCard size={16} />
            </span>
            <span className="font-medium text-gray-900">
              {paymentMethodLabel(effectivePaymentMethod)}
            </span>
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-gray-400 bg-gray-50 px-4 py-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white text-green-600 shadow-sm ring-1 ring-gray-100">
              <Banknote size={16} />
            </span>
            <span className="font-medium text-gray-900">
              {locale === "vi" ? t("checkout.cod") : "Cash on delivery"}
            </span>
          </div>
        )}
      </div>
      <Modal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title={
          locale === "vi"
            ? t("checkout.selectPaymentMethod")
            : "Choose payment method"
        }
        size="lg"
      >
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => handlePaymentSelection("COD")}
            disabled={savingPaymentPreference}
            className={`flex w-full items-center gap-3 rounded-xl border px-4 py-4 text-left transition-all disabled:opacity-50 ${effectivePaymentOption === "COD" ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100" : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"}`}
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 text-green-600">
              <Banknote size={18} />
            </span>
            <span className="font-medium text-gray-900">
              {locale === "vi" ? t("checkout.cod") : "Cash on delivery"}
            </span>
            {effectivePaymentOption === "COD" && (
              <Check size={18} className="ml-auto text-blue-600" />
            )}
          </button>
          <button
            type="button"
            onClick={() => handlePaymentSelection("VNPAY")}
            disabled={savingPaymentPreference}
            className={`flex w-full items-center gap-3 rounded-xl border px-4 py-4 text-left transition-all disabled:opacity-50 ${effectivePaymentOption === "VNPAY" ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100" : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"}`}
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <CreditCard size={18} />
            </span>
            <span className="font-medium text-gray-900">VNPay</span>
            {effectivePaymentOption === "VNPAY" && (
              <Check size={18} className="ml-auto text-blue-600" />
            )}
          </button>
          {usablePaymentMethods.map((method) => (
            <button
              key={method.methodId}
              type="button"
              onClick={() => handlePaymentSelection(method.methodId)}
              disabled={savingPaymentPreference}
              className={`flex w-full items-center gap-3 rounded-xl border px-4 py-4 text-left transition-all disabled:opacity-50 ${effectivePaymentOption === method.methodId ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100" : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"}`}
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <CreditCard size={18} />
              </span>
              <span className="font-medium text-gray-900">
                {paymentMethodLabel(method)}
              </span>
              {effectivePaymentOption === method.methodId && (
                <Check size={18} className="ml-auto text-blue-600" />
              )}
            </button>
          ))}
          {usablePaymentMethods.length === 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-4 text-gray-600">
              <CreditCard size={20} className="text-blue-600" />
              <span className="text-sm">
                {locale === "vi"
                  ? t("checkout.addStripeCardHint")
                  : "Stripe: add a card to pay with Stripe"}
              </span>
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={openStripeCardModal}
            loading={createStripeSetupMutation.isPending}
          >
            <PlusCircle size={16} className="mr-2" />
            {t("checkout.addStripeCard")}
          </Button>
        </div>
      </Modal>
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
