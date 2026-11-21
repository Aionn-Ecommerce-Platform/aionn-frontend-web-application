import type { OrderStatus } from "@/types";

const ACTIVE_RETURN_STATUSES = new Set([
  "REQUESTED",
  "APPROVED",
  "ITEM_RECEIVED",
]);

export interface OrderCardActions {
  confirmReceived: boolean;
  rate: boolean;
  buyAgain: boolean;
  requestReturn: boolean;
  viewReturn: boolean;
}

export function isActiveReturnStatus(status: string): boolean {
  return ACTIVE_RETURN_STATUSES.has(status);
}

export function getOrderCardActions(params: {
  status: OrderStatus;
  hasUnreviewedItem: boolean;
  hasActiveReturn: boolean;
}): OrderCardActions {
  const completed = params.status === "COMPLETED";
  return {
    confirmReceived:
      params.status === "SHIPPED" || params.status === "DELIVERED",
    rate: completed && params.hasUnreviewedItem,
    buyAgain:
      params.status === "CANCELLED" ||
      params.status === "REJECTED" ||
      (completed && !params.hasUnreviewedItem),
    requestReturn: completed && !params.hasActiveReturn,
    viewReturn: params.hasActiveReturn,
  };
}
