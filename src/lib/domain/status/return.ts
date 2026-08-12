import type { ReturnStatus } from "@/types";

type ReturnStatusConfig = {
  labelKey: string;
  variant: "default" | "success" | "warning" | "danger" | "info";
};

const RETURN_STATUS: Record<ReturnStatus, ReturnStatusConfig> = {
  REQUESTED: { labelKey: "statuses.return.REQUESTED", variant: "warning" },
  APPROVED: { labelKey: "statuses.return.APPROVED", variant: "info" },
  REJECTED: { labelKey: "statuses.return.REJECTED", variant: "danger" },
  ITEM_RECEIVED: {
    labelKey: "statuses.return.ITEM_RECEIVED",
    variant: "info",
  },
  REFUNDED: { labelKey: "statuses.return.REFUNDED", variant: "success" },
  CANCELLED: { labelKey: "statuses.return.CANCELLED", variant: "default" },
};

export function getReturnStatus(status: ReturnStatus) {
  return RETURN_STATUS[status];
}
