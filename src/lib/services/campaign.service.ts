import api from "@/shared/api";
import type {
  CampaignStatus,
  PromotionCampaign,
  Voucher,
  VoucherType,
} from "@/types";

export const campaignService = {
  listByStatus(status: CampaignStatus = "RUNNING", limit = 50) {
    return api.get<PromotionCampaign[]>("/promotions/campaigns", {
      query: { status, limit },
    });
  },

  get(campaignId: string) {
    return api.get<PromotionCampaign>(`/promotions/campaigns/${campaignId}`);
  },

  listVouchers(
    campaignId: string,
    limit = 50,
    type?: VoucherType,
    available = false,
  ) {
    return api.get<Voucher[]>(`/promotions/campaigns/${campaignId}/vouchers`, {
      query: { limit, type, available },
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
      type?: VoucherType;
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
  minOrderValue?: number;
  usageLimit: number;
  validFrom: string;
  validUntil: string;
  type?: VoucherType;
};

export const shopVoucherService = {
  listMine(
    params: {
      limit?: number;
      search?: string;
      active?: boolean;
      discountMin?: number;
      discountMax?: number;
    } = {},
  ) {
    return api.get<Voucher[]>("/promotions/shop-vouchers/mine", {
      query: {
        limit: params.limit ?? 50,
        search: params.search,
        active: params.active,
        discountMin: params.discountMin,
        discountMax: params.discountMax,
      },
    });
  },
  listByMerchant(
    merchantId: string,
    limit = 20,
    type?: VoucherType,
    available = false,
  ) {
    return api.get<Voucher[]>(
      `/promotions/shop-vouchers/merchant/${encodeURIComponent(merchantId)}`,
      { query: { limit, type, available } },
    );
  },
  issue(body: IssueVoucherInput) {
    return api.post<Voucher>("/promotions/shop-vouchers", body);
  },
  setActive(voucherCode: string, active: boolean) {
    return api.post<Voucher>(
      `/promotions/shop-vouchers/${encodeURIComponent(voucherCode)}/status`,
      { active },
    );
  },
};
