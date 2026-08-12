import api from "@/shared/api";
import type { PaymentMethod, Payment } from "@/types";

interface LinkPaymentMethodInput {
  provider: string;
  last4Digits?: string;
  gatewayToken: string;
}

export interface StripeSetupIntent {
  setupIntentId: string;
  clientSecret: string;
}

interface CompleteStripeSetupIntentInput {
  setupIntentId: string;
}

type PaymentPreferenceType = "COD" | "SAVED_CARD" | "VNPAY";

interface PaymentPreference {
  paymentType: PaymentPreferenceType;
  paymentMethodId: string | null;
}

export const paymentMethodService = {
  listMine() {
    return api.get<PaymentMethod[]>("/payments/methods");
  },

  async get(methodId: string) {
    const methods = await this.listMine();
    const method = methods.find((candidate) => candidate.methodId === methodId);
    if (!method) throw new Error(`Payment method ${methodId} was not found`);
    return method;
  },

  link(body: LinkPaymentMethodInput) {
    return api.post<PaymentMethod>("/payments/methods", body);
  },

  createStripeSetupIntent() {
    return api.post<StripeSetupIntent>(
      "/payments/methods/stripe/setup-intents",
      {},
    );
  },

  completeStripeSetupIntent(body: CompleteStripeSetupIntentInput) {
    return api.post<PaymentMethod>(
      "/payments/methods/stripe/setup-intents/complete",
      body,
    );
  },

  verify(methodId: string) {
    return api.post<PaymentMethod>(`/payments/methods/${methodId}/verify`);
  },

  remove(methodId: string) {
    return api.delete<void>(`/payments/methods/${methodId}`);
  },
};

export const paymentPreferenceService = {
  get() {
    return api.get<PaymentPreference>("/payments/methods/preference");
  },

  update(body: PaymentPreference) {
    return api.put<PaymentPreference>("/payments/methods/preference", body);
  },
};

interface InitiatePaymentInput {
  orderId: string;
  paymentMethodId?: string | null;
  amount: number;
  currency: string;
  gateway: string;
  idempotencyKey: string;
  returnUrl?: string | null;
}

interface RefundPaymentInput {
  amount: number;
  currency: string;
  reason: string;
}

export const paymentService = {
  initiate(body: InitiatePaymentInput) {
    return api.post<Payment>("/payments", body, { idempotent: true });
  },

  refund(paymentId: string, body: RefundPaymentInput) {
    return api.post<Payment>(`/payments/${paymentId}/refund`, body);
  },

  get(paymentId: string) {
    return api.get<Payment>(`/payments/${paymentId}`);
  },

  listByOrder(orderId: string) {
    return api.get<Payment[]>(`/payments/by-order/${orderId}`);
  },
};
