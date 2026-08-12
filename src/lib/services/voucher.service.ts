import api from "@/shared/api";
import type { UserVoucher } from "@/types";

export const voucherService = {
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
