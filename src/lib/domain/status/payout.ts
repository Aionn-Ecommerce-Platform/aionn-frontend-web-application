import type { PayoutStatus } from "@/lib/services/payout.service";

type PayoutStatusConfig = {
  labelKey: string;
  variant: "info" | "success" | "warning" | "danger";
};

const PAYOUT_STATUS: Record<PayoutStatus, PayoutStatusConfig> = {
  PENDING: { labelKey: "statuses.payout.PENDING", variant: "warning" },
  PROCESSING: { labelKey: "statuses.payout.PROCESSING", variant: "info" },
  COMPLETED: { labelKey: "statuses.payout.COMPLETED", variant: "success" },
  FAILED: { labelKey: "statuses.payout.FAILED", variant: "danger" },
};

export function getPayoutStatus(status: PayoutStatus) {
  return PAYOUT_STATUS[status];
}
