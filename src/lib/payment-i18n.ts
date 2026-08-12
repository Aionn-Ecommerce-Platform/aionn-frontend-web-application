import type { Payment } from "@/types";

type Translate = (key: string) => string;

const VNPAY_ERROR_KEYS: Record<string, string> = {
  VNPAY_07: "paymentReturn.errorReasons.vnpay07",
  VNPAY_09: "paymentReturn.errorReasons.vnpay09",
  VNPAY_10: "paymentReturn.errorReasons.vnpay10",
  VNPAY_11: "paymentReturn.errorReasons.vnpay11",
  VNPAY_12: "paymentReturn.errorReasons.vnpay12",
  VNPAY_13: "paymentReturn.errorReasons.vnpay13",
  VNPAY_24: "paymentReturn.errorReasons.vnpay24",
  VNPAY_51: "paymentReturn.errorReasons.vnpay51",
  VNPAY_65: "paymentReturn.errorReasons.vnpay65",
  VNPAY_75: "paymentReturn.errorReasons.vnpay75",
  VNPAY_79: "paymentReturn.errorReasons.vnpay79",
  VNPAY_99: "paymentReturn.errorReasons.vnpay99",
};

const RAW_REASON_KEYS: Array<[RegExp, string]> = [
  [/cancelled by customer/i, "paymentReturn.errorReasons.vnpay24"],
  [/payment timeout/i, "paymentReturn.errorReasons.vnpay11"],
  [/insufficient balance/i, "paymentReturn.errorReasons.vnpay51"],
  [/daily limit exceeded/i, "paymentReturn.errorReasons.vnpay65"],
  [/bank is under maintenance/i, "paymentReturn.errorReasons.vnpay75"],
  [/incorrect otp/i, "paymentReturn.errorReasons.vnpay13"],
  [/card\/account is locked/i, "paymentReturn.errorReasons.vnpay12"],
];

function resolveKeyFromReason(
  reason: string | null | undefined,
): string | null {
  if (!reason) return null;
  const matched = RAW_REASON_KEYS.find(([pattern]) => pattern.test(reason));
  return matched?.[1] ?? null;
}

export function getPaymentFailureMessage(
  payment: Pick<Payment, "errorCode" | "errorReason"> | null | undefined,
  t: Translate,
): string {
  const errorCode = payment?.errorCode?.toUpperCase();
  const key =
    (errorCode && VNPAY_ERROR_KEYS[errorCode]) ||
    resolveKeyFromReason(payment?.errorReason) ||
    "paymentReturn.failedDefault";

  return t(key);
}
