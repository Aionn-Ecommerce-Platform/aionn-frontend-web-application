import type { PaymentStatus } from "@/types";

type PaymentStatusConfig = {
  labelKey: string;
  variant: "default" | "info" | "success" | "warning" | "danger";
};

const PAYMENT_STATUS: Record<PaymentStatus, PaymentStatusConfig> = {
  INITIATED: { labelKey: "statuses.payment.INITIATED", variant: "default" },
  PROCESSING: { labelKey: "statuses.payment.PROCESSING", variant: "info" },
  PAID: { labelKey: "statuses.payment.PAID", variant: "success" },
  FAILED: { labelKey: "statuses.payment.FAILED", variant: "danger" },
  REFUNDED: { labelKey: "statuses.payment.REFUNDED", variant: "warning" },
};

export function getPaymentStatus(status: PaymentStatus) {
  return PAYMENT_STATUS[status];
}
