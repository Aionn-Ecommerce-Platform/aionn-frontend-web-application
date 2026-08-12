import type { UserVoucherStatus } from "@/types";

type VoucherStatusConfig = {
  labelKey: string;
  variant: "success" | "info" | "warning" | "danger";
};

const VOUCHER_STATUS: Record<UserVoucherStatus, VoucherStatusConfig> = {
  CLAIMED: { labelKey: "statuses.voucher.CLAIMED", variant: "success" },
  RESERVED: { labelKey: "statuses.voucher.RESERVED", variant: "warning" },
  APPLIED: { labelKey: "statuses.voucher.APPLIED", variant: "info" },
  RELEASED: { labelKey: "statuses.voucher.RELEASED", variant: "info" },
  EXPIRED: { labelKey: "statuses.voucher.EXPIRED", variant: "danger" },
};

export function getVoucherStatus(status: UserVoucherStatus) {
  return VOUCHER_STATUS[status];
}
