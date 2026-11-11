import api from "@/shared/api";
import type { Merchant, MerchantStorefrontStats } from "@/types";

export const merchantService = {
  get(merchantId: string) {
    return api.get<Merchant>(`/catalog/merchants/${merchantId}`, {
      anonymous: true,
    });
  },
  getStorefrontStats(merchantId: string) {
    return api.get<MerchantStorefrontStats>(
      `/catalog/merchants/${merchantId}/storefront-stats`,
    );
  },
  updateCommissionRate(merchantId: string, commissionRate: number) {
    return api.put<Merchant>(
      `/catalog/merchants/${merchantId}/commission-rate`,
      { commissionRate },
    );
  },
  updateGlobalCommissionRate(commissionRate: number) {
    return api.put<void>("/catalog/merchants/settings/commission-rate", {
      commissionRate,
    });
  },
  follow(merchantId: string) {
    return api.post<void>(`/catalog/merchants/${merchantId}/follow`, {});
  },
  unfollow(merchantId: string) {
    return api.delete<void>(`/catalog/merchants/${merchantId}/follow`);
  },
  list(page = 0, size = 20) {
    return api.get<Merchant[]>("/catalog/merchants", {
      anonymous: true,
      query: { page, size },
    });
  },
  getMine() {
    return api.get<Merchant>("/catalog/merchants/me");
  },
  register(name: string) {
    return api.post<Merchant>("/catalog/merchants", { name });
  },
  updateProfile(
    merchantId: string,
    body: {
      name: string;
      logoUrl?: string;
      description?: string;
      provinceCode?: string;
    },
  ) {
    return api.put<Merchant>(`/catalog/merchants/${merchantId}`, body);
  },
  suspend(merchantId: string, body: { reason: string }) {
    return api.post<Merchant>(`/catalog/merchants/${merchantId}/suspend`, body);
  },
  activate(merchantId: string, body: { reason: string }) {
    return api.post<Merchant>(
      `/catalog/merchants/${merchantId}/activate`,
      body,
    );
  },
  close(merchantId: string, body: { reason: string }) {
    return api.post<Merchant>(`/catalog/merchants/${merchantId}/close`, body);
  },
};
