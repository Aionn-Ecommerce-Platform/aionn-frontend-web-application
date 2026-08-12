import type { OrderStatus } from "@/types";

type OrderStatusConfig = {
  labelKey: string;
  variant: "default" | "info" | "success" | "warning" | "danger";
  color: string;
  bar: string;
  dot: string;
};

const ORDER_STATUS: Record<OrderStatus, OrderStatusConfig> = {
  PENDING: {
    labelKey: "orders.statusPending",
    variant: "warning",
    color: "text-yellow-600",
    bar: "from-slate-300 to-slate-400",
    dot: "bg-slate-400",
  },
  APPROVED: {
    labelKey: "orders.statusApproved",
    variant: "info",
    color: "text-blue-600",
    bar: "from-blue-400 to-blue-600",
    dot: "bg-blue-600",
  },
  PLACED: {
    labelKey: "orders.statusPlaced",
    variant: "info",
    color: "text-blue-600",
    bar: "from-blue-400 to-blue-600",
    dot: "bg-blue-600",
  },
  PREPARING: {
    labelKey: "orders.statusPreparing",
    variant: "warning",
    color: "text-yellow-600",
    bar: "from-amber-300 to-amber-500",
    dot: "bg-amber-500",
  },
  SHIPPED: {
    labelKey: "orders.statusShipped",
    variant: "info",
    color: "text-blue-600",
    bar: "from-indigo-400 to-indigo-600",
    dot: "bg-indigo-500",
  },
  DELIVERED: {
    labelKey: "orders.statusDelivered",
    variant: "success",
    color: "text-green-600",
    bar: "from-cyan-400 to-cyan-600",
    dot: "bg-cyan-500",
  },
  COMPLETED: {
    labelKey: "orders.statusCompleted",
    variant: "success",
    color: "text-green-600",
    bar: "from-emerald-400 to-emerald-600",
    dot: "bg-emerald-600",
  },
  CANCELLED: {
    labelKey: "orders.statusCancelled",
    variant: "danger",
    color: "text-red-600",
    bar: "from-gray-300 to-gray-400",
    dot: "bg-gray-400",
  },
  REJECTED: {
    labelKey: "orders.statusRejected",
    variant: "danger",
    color: "text-red-600",
    bar: "from-rose-400 to-rose-500",
    dot: "bg-rose-500",
  },
  PROPOSED: {
    labelKey: "orders.statusProposed",
    variant: "default",
    color: "text-violet-600",
    bar: "from-violet-400 to-violet-500",
    dot: "bg-violet-500",
  },
};

export function getOrderStatus(status: string) {
  return ORDER_STATUS[status as OrderStatus];
}
