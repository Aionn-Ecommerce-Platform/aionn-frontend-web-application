import type { Order } from "@/types";

interface OrderDateFilter {
  year: number | null;
  month: number | null;
  day: number | null;
}

export function filterMerchantOrders(
  orders: Order[] | undefined,
  statuses: string[] | null,
  search: string,
  date: OrderDateFilter,
) {
  const query = search.trim().toLowerCase();
  return (orders ?? []).filter((order) => {
    if (statuses && !statuses.includes(order.status)) return false;
    if (query && !order.orderId.toLowerCase().includes(query)) return false;
    if (!date.year) return true;
    const createdAt = new Date(order.createdAt);
    return (
      createdAt.getFullYear() === date.year &&
      (!date.month || createdAt.getMonth() + 1 === date.month) &&
      (!date.day || createdAt.getDate() === date.day)
    );
  });
}
