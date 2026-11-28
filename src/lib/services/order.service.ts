import api from "@/shared/api";
import { merchantService } from "@/lib/services/merchant.service";
import type {
  MerchantOrderAnalytics,
  Order,
  OrderReturn,
  PlatformOrderAnalytics,
  ReturnAnalytics,
  ReturnReasonType,
  ShippingAddressSnapshot,
  TopProduct,
} from "@/types";

export interface PlaceOrderInput {
  addressId: string;
  paymentMethodId: string;
  currency: string;
  shippingFee: number;
  shippingAddress: ShippingAddressSnapshot;
  selectedSkuIds?: string[];
  gateway: "STRIPE" | "VNPAY" | "COD";
  note?: string;
  shippingService?: string;
  platformVoucherCode?: string;
  shopVoucherCode?: string;
  shippingVoucherCode?: string;
  shopVoucherCodes?: Record<string, string>;
  notesByMerchant?: Record<string, string>;
  shippingServicesByMerchant?: Record<string, string>;
}

export interface PlaceOrderGroupResult {
  groupId: string;
  orders: Order[];
}

export const orderService = {
  place(body: PlaceOrderInput) {
    return api.post<Order>("/ordering/orders", body, { idempotent: true });
  },

  placeGroup(body: PlaceOrderInput) {
    return api.post<PlaceOrderGroupResult>("/ordering/orders/group", body, {
      idempotent: true,
    });
  },

  cancel(orderId: string, reason: string) {
    return api.post<Order>(`/ordering/orders/${orderId}/cancel`, { reason });
  },

  changeShippingInfo(
    orderId: string,
    body: { newAddress: ShippingAddressSnapshot },
  ) {
    return api.put<Order>(`/ordering/orders/${orderId}/shipping-info`, body);
  },
  changeShippingAddress(
    orderId: string,
    body: { newAddress: ShippingAddressSnapshot },
  ) {
    return api.put<Order>(
      `/ordering/orders/${orderId}/merchant/shipping-address`,
      body,
    );
  },

  get(orderId: string) {
    return api.get<Order>(`/ordering/orders/${orderId}`);
  },

  listMine(params: { status?: string; page?: number; limit?: number } = {}) {
    return api.page<Order>("/ordering/orders", {
      query: {
        status: params.status,
        page: params.page ?? 0,
        limit: params.limit ?? 20,
      },
    });
  },

  listForMerchant(
    params: {
      status?: string;
      search?: string;
      from?: string;
      to?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    return api.page<Order>("/ordering/orders/merchant", {
      query: {
        status: params.status,
        search: params.search,
        from: params.from,
        to: params.to,
        page: params.page ?? 0,
        limit: params.limit ?? 20,
      },
    });
  },
  merchantOrderStats() {
    return api.get<Record<string, number>>("/ordering/orders/merchant/stats");
  },

  adminList(
    params: {
      status?: string;
      search?: string;
      page?: number;
      size?: number;
    } = {},
  ) {
    return api.page<Order>("/ordering/orders/admin", {
      query: {
        status: params.status,
        search: params.search,
        page: params.page ?? 0,
        size: params.size ?? 20,
      },
    });
  },

  merchantAnalytics(params: { from?: string; to?: string } = {}) {
    return api.get<MerchantOrderAnalytics>(
      "/ordering/orders/merchant/analytics",
      {
        query: params,
      },
    );
  },

  /**
   * Backend analytics windows are capped at 366 days, so aggregate lifetime
   * revenue by walking the range in chunks instead of sending one huge range.
   */
  async merchantRevenueTotal(params: { from: string; to: string }) {
    const DAY_MS = 86_400_000;
    const start = Date.parse(`${params.from}T00:00:00Z`);
    const end = Date.parse(`${params.to}T00:00:00Z`);
    let cursor = start;
    let totalRevenue = 0;
    let totalOrders = 0;
    const formatDate = (time: number) =>
      new Date(time).toISOString().slice(0, 10);

    while (cursor <= end) {
      const chunkEnd = Math.min(cursor + 366 * DAY_MS, end);
      const chunk = await this.merchantAnalytics({
        from: formatDate(cursor),
        to: formatDate(chunkEnd),
      });
      totalRevenue += chunk.totalRevenue ?? 0;
      totalOrders += chunk.totalOrders ?? 0;
      cursor = chunkEnd + DAY_MS;
    }

    return { totalRevenue, totalOrders };
  },

  merchantTopProducts(
    params: { from?: string; to?: string; limit?: number } = {},
  ) {
    return api.get<TopProduct[]>("/ordering/orders/merchant/top-products", {
      query: params,
    });
  },

  platformAnalytics(params: { from?: string; to?: string } = {}) {
    return api.get<PlatformOrderAnalytics>("/ordering/orders/admin/analytics", {
      query: params,
    });
  },

  confirmPreparation(orderId: string) {
    return api.post<Order>(`/ordering/orders/${orderId}/confirm-preparation`);
  },

  rejectByMerchant(orderId: string, reason: string) {
    return api.post<Order>(`/ordering/orders/${orderId}/reject`, { reason });
  },

  complete(orderId: string) {
    return api.post<Order>(`/ordering/orders/${orderId}/complete`);
  },

  ship(orderId: string, body: { shipmentId: string }) {
    return api.post<Order>(`/ordering/orders/${orderId}/ship`, body);
  },
};

export const orderReturnService = {
  request(
    orderId: string,
    body: {
      reasonType: ReturnReasonType;
      reason: string;
      evidenceUrls: string[];
      items?: Array<{ skuId: string; qty: number }>;
    },
  ) {
    return api.post<OrderReturn>(`/ordering/returns/orders/${orderId}`, body);
  },

  cancel(returnId: string) {
    return api.post<OrderReturn>(`/ordering/returns/${returnId}/cancel`);
  },

  getItems(returnId: string) {
    return api.get<
      Array<{
        skuId: string;
        qty: number;
        unitPrice: number;
        refundAmount: number;
      }>
    >(`/ordering/returns/${returnId}/items`);
  },

  approve(
    returnId: string,
    body: {
      refundAmount: number;
      currency: string;
      returnWarehouseId?: string | null;
    },
  ) {
    return api.post<OrderReturn>(`/ordering/returns/${returnId}/approve`, body);
  },

  reject(returnId: string, reason: string) {
    return api.post<OrderReturn>(`/ordering/returns/${returnId}/reject`, {
      reason,
    });
  },

  confirmItemReceived(returnId: string, itemCondition: string) {
    return api.post<OrderReturn>(
      `/ordering/returns/${returnId}/item-received`,
      {
        itemCondition,
      },
    );
  },

  get(returnId: string) {
    return api.get<OrderReturn>(`/ordering/returns/${returnId}`);
  },

  listMine(limit = 20) {
    return api.get<OrderReturn[]>("/ordering/returns/me", {
      query: { limit },
    });
  },

  async listForMerchant(
    params: {
      status?: string;
      reasonType?: string;
      search?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const merchant = await merchantService.getMine();
    return api.page<OrderReturn>("/ordering/returns/merchant", {
      query: {
        status: params.status,
        reasonType: params.reasonType,
        search: params.search,
        page: params.page ?? 0,
        limit: params.limit ?? 20,
      },
      headers: { "X-Merchant-Id": merchant.merchantId },
    });
  },
  async merchantReturnStats() {
    const merchant = await merchantService.getMine();
    return api.get<Record<string, number>>("/ordering/returns/merchant/stats", {
      headers: { "X-Merchant-Id": merchant.merchantId },
    });
  },

  async summaryForMerchant(params: { from?: string; to?: string } = {}) {
    const merchant = await merchantService.getMine();
    return api.get<{
      requests: number;
      approved: number;
      refundTotal: number;
    }>("/ordering/returns/merchant/summary", {
      query: params,
      headers: { "X-Merchant-Id": merchant.merchantId },
    });
  },
};

export const adminOrderReturnService = {
  listByStatus(status: string, limit = 50) {
    return api.get<OrderReturn[]>("/admin/ordering/returns", {
      query: { status, limit },
    });
  },
  analytics(params: { from?: string; to?: string } = {}) {
    return api.get<ReturnAnalytics>("/admin/ordering/returns/analytics", {
      query: params,
    });
  },
  get(returnId: string) {
    return api.get<OrderReturn>(`/admin/ordering/returns/${returnId}`);
  },
  approve(
    returnId: string,
    body: {
      refundAmount?: number;
      currency?: string;
      returnWarehouseId?: string | null;
    },
  ) {
    return api.post<OrderReturn>(
      `/admin/ordering/returns/${returnId}/approve`,
      body,
    );
  },
  reject(returnId: string, reason: string) {
    return api.post<OrderReturn>(`/admin/ordering/returns/${returnId}/reject`, {
      reason,
    });
  },
  confirmItemReceived(returnId: string, itemCondition: string) {
    return api.post<OrderReturn>(
      `/admin/ordering/returns/${returnId}/item-received`,
      { itemCondition },
    );
  },
};
