import api from "@/shared/api";
import type { CampaignStatus, PromotionCampaign, Voucher } from "@/types";

export const campaignService = {
  listByStatus(status: CampaignStatus = "RUNNING", limit = 50) {
    return api.get<PromotionCampaign[]>("/promotions/campaigns", {
      query: { status, limit },
    });
  },

  get(campaignId: string) {
    return api.get<PromotionCampaign>(`/promotions/campaigns/${campaignId}`);
  },

  listVouchers(campaignId: string, limit = 50) {
    return api.get<Voucher[]>(`/promotions/campaigns/${campaignId}/vouchers`, {
      query: { limit },
    });
  },

  create(body: {
    name: string;
    type: string;
    budget: number;
    currency: string;
    startDate: string;
    endDate: string;
  }) {
    return api.post<PromotionCampaign>("/promotions/campaigns", body);
  },

  activate(campaignId: string) {
    return api.post<PromotionCampaign>(
      `/promotions/campaigns/${campaignId}/activate`,
    );
  },

  end(campaignId: string) {
    return api.post<PromotionCampaign>(
      `/promotions/campaigns/${campaignId}/end`,
    );
  },

  cancel(campaignId: string, body: { reason: string }) {
    return api.post<PromotionCampaign>(
      `/promotions/campaigns/${campaignId}/cancel`,
      body,
    );
  },

  configureCondition(
    campaignId: string,
    body: {
      minOrderValue?: number;
      applicableCategoryIds?: string[];
      maxClaimsPerUser?: number;
      maxUsesPerVoucher?: number;
    },
  ) {
    return api.put<PromotionCampaign>(
      `/promotions/campaigns/${campaignId}/conditions`,
      body,
    );
  },

  issueVoucher(
    campaignId: string,
    body: {
      voucherCode: string;
      discountAmount: number;
      currency: string;
      usageLimit: number;
      validFrom: string;
      validUntil: string;
    },
  ) {
    return api.post<Voucher>(
      `/promotions/campaigns/${campaignId}/vouchers`,
      body,
    );
  },
};

export type IssueVoucherInput = {
  voucherCode: string;
  discountAmount: number;
  currency: string;
  usageLimit: number;
  validFrom: string;
  validUntil: string;
};

export const shopVoucherService = {
  listMine(limit = 50) {
    return api.get<Voucher[]>("/promotions/shop-vouchers/mine", {
      query: { limit },
    });
  },
  listByMerchant(merchantId: string, limit = 20) {
    return api.get<Voucher[]>(
      `/promotions/shop-vouchers/merchant/${encodeURIComponent(merchantId)}`,
      { query: { limit } },
    );
  },
  issue(body: IssueVoucherInput) {
    return api.post<Voucher>("/promotions/shop-vouchers", body);
  },
};
