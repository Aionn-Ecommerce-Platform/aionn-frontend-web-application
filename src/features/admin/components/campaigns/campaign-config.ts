import type { CampaignStatus, CampaignType } from "@/types";

export interface CampaignForm {
  name: string;
  type: CampaignType;
  budget: number;
  currency: string;
  startDate: string;
  endDate: string;
  minOrderValue: number | null;
  maxClaimsPerUser: number | null;
  maxUsesPerVoucher: number | null;
}

export const STATUS_CONFIG: Record<
  CampaignStatus,
  { labelKey: string; color: string }
> = {
  DRAFT: {
    labelKey: "statuses.campaign.DRAFT",
    color: "bg-gray-100 text-gray-700",
  },
  SCHEDULED: {
    labelKey: "statuses.campaign.SCHEDULED",
    color: "bg-blue-100 text-blue-700",
  },
  RUNNING: {
    labelKey: "statuses.campaign.RUNNING",
    color: "bg-green-100 text-green-700",
  },
  ENDED: {
    labelKey: "statuses.campaign.ENDED",
    color: "bg-gray-100 text-gray-700",
  },
  CANCELLED: {
    labelKey: "statuses.campaign.CANCELLED",
    color: "bg-red-100 text-red-700",
  },
};

export const CAMPAIGN_TYPES: { value: CampaignType; labelKey: string }[] = [
  { value: "FLASH_SALE", labelKey: "adminCampaigns.typeFlashSale" },
  { value: "SEASONAL", labelKey: "adminCampaigns.typeSeasonal" },
  { value: "GENERAL", labelKey: "adminCampaigns.typeGeneral" },
];

function toDateTimeLocal(date: Date) {
  return date.toISOString().slice(0, 16);
}

export function createEmptyCampaignForm(): CampaignForm {
  const now = Date.now();
  return {
    name: "",
    type: "GENERAL",
    budget: 0,
    currency: "VND",
    startDate: toDateTimeLocal(new Date(now)),
    endDate: toDateTimeLocal(new Date(now + 7 * 24 * 60 * 60 * 1000)),
    minOrderValue: null,
    maxClaimsPerUser: null,
    maxUsesPerVoucher: null,
  };
}
