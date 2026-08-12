import api from "@/shared/api";

interface MerchantBalance {
  merchantId: string;
  currency: string;
  pending: number;
  available: number;
  updatedAt: string;
}

export type PayoutStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface MerchantPayout {
  payoutId: string;
  merchantId: string;
  amount: number;
  currency: string;
  status: PayoutStatus;
  bankName: string | null;
  bankAccountNo: string | null;
  bankAccountName: string | null;
  externalRef: string | null;
  note: string | null;
  requestedAt: string;
  completedAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
}

interface RequestPayoutInput {
  amount: number;
  currency?: string;
  bankName: string;
  bankAccountNo: string;
  bankAccountName: string;
  note?: string;
}

export const merchantPayoutService = {
  getBalance(currency = "VND") {
    return api.get<MerchantBalance>("/payments/merchant/balance", {
      query: { currency },
    });
  },
  listMine(limit = 50) {
    return api.get<MerchantPayout[]>("/payments/merchant/payouts", {
      query: { limit },
    });
  },
  request(body: RequestPayoutInput) {
    return api.post<MerchantPayout>("/payments/merchant/payouts", body);
  },
};

export const adminPayoutService = {
  list(status: PayoutStatus = "PENDING", limit = 100) {
    return api.get<MerchantPayout[]>("/admin/payouts", {
      query: { status, limit },
    });
  },
  complete(payoutId: string, externalRef: string) {
    return api.post<MerchantPayout>(`/admin/payouts/${payoutId}/complete`, {
      externalRef,
    });
  },
  fail(payoutId: string, reason: string) {
    return api.post<MerchantPayout>(`/admin/payouts/${payoutId}/fail`, {
      reason,
    });
  },
};

export const stripeConnectService = {
  getOnboardingLink() {
    return api.post<{ url: string }>(
      "/payments/stripe-connect/onboarding-link",
    );
  },
};
