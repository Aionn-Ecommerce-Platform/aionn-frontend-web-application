import api from "@/shared/api";
import type {
  FeedbackAnalytics,
  KycAnalytics,
  LowStockAlert,
  MerchantVoucherAnalytics,
  PaymentAnalytics,
  ProductAnalytics,
  UserAnalytics,
} from "@/types";

type DateRangeParams = { from?: string; to?: string };

export const adminAnalyticsService = {
  payments(params: DateRangeParams = {}) {
    return api.get<PaymentAnalytics>("/payments/admin/analytics", {
      query: params,
    });
  },
  users(params: DateRangeParams = {}) {
    return api.get<UserAnalytics>("/admin/users/analytics", { query: params });
  },
  kyc(params: DateRangeParams = {}) {
    return api.get<KycAnalytics>("/admin/kyc/analytics", { query: params });
  },
  feedbacks(params: DateRangeParams = {}) {
    return api.get<FeedbackAnalytics>("/admin/feedbacks/analytics", {
      query: params,
    });
  },
  products() {
    return api.get<ProductAnalytics>("/catalog/products/admin/analytics");
  },
};

export const merchantAnalyticsService = {
  vouchers() {
    return api.get<MerchantVoucherAnalytics>(
      "/promotions/shop-vouchers/analytics",
    );
  },
  lowStock() {
    return api.get<LowStockAlert[]>("/inventory/items/merchant/low-stock");
  },
};
