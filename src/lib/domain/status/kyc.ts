import type { KycStatus } from "@/types";

type KycStatusConfig = {
  labelKey: string;
  variant: "default" | "info" | "success" | "warning" | "danger";
};

const KYC_STATUS: Record<KycStatus, KycStatusConfig> = {
  DRAFT: { labelKey: "statuses.kyc.DRAFT", variant: "default" },
  SUBMITTED: { labelKey: "statuses.kyc.SUBMITTED", variant: "warning" },
  IN_REVIEW: { labelKey: "statuses.kyc.IN_REVIEW", variant: "info" },
  APPROVED: { labelKey: "statuses.kyc.APPROVED", variant: "success" },
  REJECTED: { labelKey: "statuses.kyc.REJECTED", variant: "danger" },
};

export function getKycStatus(status: KycStatus) {
  return KYC_STATUS[status];
}
