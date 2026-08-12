import api from "@/shared/api";
import type {
  MerchantOrderAnalytics,
  Order,
  OrderReturn,
  PlatformOrderAnalytics,
  ReturnAnalytics,
  ShippingAddressSnapshot,
  TopProduct,
} from "@/types";

interface PlaceOrderInput {
  addressId: string;
  paymentMethodId: string;
  currency: string;
  shippingFee: number;
  shippingAddress: ShippingAddressSnapshot;
  selectedSkuIds?: string[];
  gateway: "STRIPE" | "VNPAY" | "COD";
}

export const orderService = {
  place(body: PlaceOrderInput) {
    return api.post<Order>("/ordering/orders", body, { idempotent: true });
  },

  cancel(orderId: string, reason: string) {
    return api.post<Order>(`/ordering/orders/${orderId}/cancel`, { reason });
  },

  changeShippingInfo(
    orderId: string,
    body: { newAddress: ShippingAddressSnapshot; newShippingFee: number },
  ) {
    return api.put<Order>(`/ordering/orders/${orderId}/shipping-info`, body);
  },

  get(orderId: string) {
    return api.get<Order>(`/ordering/orders/${orderId}`);
  },

  listMine(params: { status?: string; limit?: number } = {}) {
    return api.get<Order[]>("/ordering/orders", {
      query: { status: params.status, limit: params.limit ?? 20 },
    });
  },

  listForMerchant(params: { status?: string; limit?: number } = {}) {
    return api.get<Order[]>("/ordering/orders/merchant", {
      query: { status: params.status, limit: params.limit ?? 20 },
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
    body: { reason: string; evidenceUrl?: string | null },
  ) {
    return api.post<OrderReturn>(`/ordering/returns/orders/${orderId}`, body);
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

  listForMerchant(limit = 20) {
    return api.get<OrderReturn[]>("/ordering/returns/merchant", {
      query: { limit },
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
