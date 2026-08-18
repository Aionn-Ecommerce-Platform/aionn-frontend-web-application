export type CampaignType = "FLASH_SALE" | "SEASONAL" | "GENERAL" | string;
export type CampaignStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "RUNNING"
  | "ENDED"
  | "CANCELLED";

export interface PromotionCampaign {
  campaignId: string;
  name: string;
  type: CampaignType;
  budget: number;
  budgetRemaining: number;
  currency: string;
  startDate: string;
  endDate: string;
  createdBy: string;
  status: CampaignStatus;
  minOrderValue: number | null;
  applicableCategoryIds: string[] | null;
  maxClaimsPerUser: number | null;
  maxUsesPerVoucher: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Voucher {
  voucherCode: string;
  campaignId: string | null;
  scope: "PLATFORM" | "SHOP";
  merchantId: string | null;
  discountAmount: number;
  currency: string;
  usageLimit: number;
  usedCount: number;
  reservedCount: number;
  validFrom: string | null;
  validUntil: string | null;
  createdAt: string;
  updatedAt: string;
}

export type UserVoucherStatus =
  | "CLAIMED"
  | "RESERVED"
  | "APPLIED"
  | "RELEASED"
  | "EXPIRED";

export interface UserVoucher {
  userVoucherId: string;
  voucherCode: string;
  userId: string;
  status: UserVoucherStatus;
  reservedOrderId: string | null;
  appliedAmount: number | null;
  currency: string | null;
  claimedAt: string;
  reservedAt: string | null;
  reservedExpiresAt: string | null;
  appliedAt: string | null;
  releasedAt: string | null;
  updatedAt: string;
  voucherDiscountAmount: number | null;
  voucherCurrency: string | null;
  voucherScope: "PLATFORM" | "SHOP" | null;
  voucherValidUntil: string | null;
  minOrderValue: number | null;
  voucherUsageLimit: number;
  voucherUsedCount: number;
}

export interface PromotionBanner {
  bannerId: string;
  title: string;
  imageUrl: string;
  imagePublicId: string;
  linkUrl: string;
  displayOrder: number;
}
