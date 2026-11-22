import type { ReturnReasonType } from "@/types";

export const RETURN_REASON_TYPES: ReturnReasonType[] = [
  "WRONG_ITEM",
  "DAMAGED",
  "DEFECTIVE",
  "NOT_AS_DESCRIBED",
  "MISSING_PARTS",
  "WRONG_SIZE",
  "LATE_DELIVERY",
  "CHANGED_MIND",
  "OTHER",
];

export const RETURN_REASON_BADGE_CLASS: Record<ReturnReasonType, string> = {
  WRONG_ITEM: "bg-blue-100 text-blue-700 border-blue-200",
  DAMAGED: "bg-red-100 text-red-700 border-red-200",
  DEFECTIVE: "bg-rose-100 text-rose-700 border-rose-200",
  NOT_AS_DESCRIBED: "bg-amber-100 text-amber-800 border-amber-200",
  MISSING_PARTS: "bg-purple-100 text-purple-700 border-purple-200",
  WRONG_SIZE: "bg-cyan-100 text-cyan-800 border-cyan-200",
  LATE_DELIVERY: "bg-orange-100 text-orange-700 border-orange-200",
  CHANGED_MIND: "bg-slate-100 text-slate-700 border-slate-200",
  OTHER: "bg-gray-100 text-gray-700 border-gray-200",
};

export function returnReasonBadgeClass(
  type: ReturnReasonType | null | undefined,
) {
  return RETURN_REASON_BADGE_CLASS[type ?? "OTHER"];
}

export function returnReasonLabelKey(type: ReturnReasonType | null | undefined) {
  return `orders.returns.reasonTypes.${type ?? "OTHER"}`;
}
