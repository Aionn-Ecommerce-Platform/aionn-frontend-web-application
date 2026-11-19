import api from "@/shared/api";
import type { UserVoucher } from "@/types";

export interface VoucherSummary {
  all: number;
  platform: number;
  shop: number;
  shipping: number;
}

export const voucherService = {
  getAvailableSummary() {
    return api.get<VoucherSummary>("/promotions/vouchers/summary", {
      anonymous: true,
    });
  },

  claim(voucherCode: string) {
    return api.post<UserVoucher>(
      `/promotions/vouchers/${encodeURIComponent(voucherCode)}/claim`,
    );
  },

  listMine(limit = 50) {
    return api.get<UserVoucher[]>("/promotions/vouchers/me", {
      query: { limit },
    });
  },

  getMine(voucherCode: string) {
    return api.get<UserVoucher>(
      `/promotions/vouchers/me/${encodeURIComponent(voucherCode)}`,
    );
  },

  grant(body: {
    userId: string;
    voucherCode: string;
    reason?: string;
    entitlementKey?: string;
  }) {
    return api.post<UserVoucher>("/promotions/vouchers/admin/grant", body);
  },

  reserve(
    voucherCode: string,
    body: {
      orderId: string;
      orderValue: number;
      currency: string;
      orderCategoryIds: string[];
      expiresAt?: string;
    },
  ) {
    return api.post<UserVoucher>(
      `/promotions/vouchers/${encodeURIComponent(voucherCode)}/reserve`,
      body,
    );
  },

  apply(
    voucherCode: string,
    body: {
      orderId: string;
      appliedAmount: number;
      currency: string;
    },
  ) {
    return api.post<UserVoucher>(
      `/promotions/vouchers/${encodeURIComponent(voucherCode)}/apply`,
      body,
    );
  },

  release(
    voucherCode: string,
    body: {
      orderId: string;
      reason: string;
    },
  ) {
    return api.post<UserVoucher>(
      `/promotions/vouchers/${encodeURIComponent(voucherCode)}/release`,
      body,
    );
  },
};
