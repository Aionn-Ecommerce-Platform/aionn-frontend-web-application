import api from "@/shared/api";
import type {
  Shipment,
  ShipmentAddress,
  ShipmentEvent,
  ShippingQuote,
} from "@/types";

interface ShippingQuoteItem {
  skuId: string;
  qty: number;
}

interface CreateShipmentInput {
  orderId: string;
  userId: string;
  address: ShipmentAddress;
  items: ShippingQuoteItem[];
  codAmount: number;
  shippingFee: number;
  currency: string;
}

interface CarrierWebhookInput {
  trackingCode: string;
  type: string;
  currentLocation?: string | null;
  statusDesc?: string | null;
  shipperName?: string | null;
  shipperPhone?: string | null;
  signatureUrl?: string | null;
  reason?: string | null;
  warehouseId?: string | null;
}

export const shippingService = {
  /** Parcel dimensions are resolved server-side; the client sends only skuId+qty. */
  quote(
    address: ShipmentAddress,
    items: ShippingQuoteItem[],
    currency?: string,
    goodsSubtotal?: number,
  ) {
    return api.post<ShippingQuote>("/shipping/shipments/quote", {
      address,
      items,
      currency,
      goodsSubtotal,
    });
  },

  create(body: CreateShipmentInput) {
    return api.post<Shipment>("/shipping/shipments", body);
  },

  register(shipmentId: string) {
    return api.post<Shipment>(`/shipping/shipments/${shipmentId}/register`);
  },

  fetchLabel(shipmentId: string) {
    return api.post<Shipment>(`/shipping/shipments/${shipmentId}/label`);
  },

  cancel(shipmentId: string, reason: string) {
    return api.post<Shipment>(`/shipping/shipments/${shipmentId}/cancel`, {
      reason,
    });
  },

  listByOrder(orderId: string) {
    return api.get<Shipment[]>(`/shipping/shipments/by-order/${orderId}`);
  },

  createReturnPickup(returnId: string) {
    return api.post<Shipment>(`/shipping/shipments/returns/${returnId}`);
  },

  listByReturn(returnId: string) {
    return api.get<Shipment[]>(`/shipping/shipments/by-return/${returnId}`);
  },

  listEvents(shipmentId: string) {
    return api.get<ShipmentEvent[]>(`/shipping/shipments/${shipmentId}/events`);
  },

  applyCarrierWebhook(payload: CarrierWebhookInput) {
    return api.post<Shipment>("/shipping/webhooks/carrier", payload);
  },

  resolveIssue(
    shipmentId: string,
    body: { issueType: string; resolution: string },
  ) {
    return api.post<Shipment>(`/shipping/shipments/${shipmentId}/issue`, body);
  },

  get(shipmentId: string) {
    return api.get<Shipment>(`/shipping/shipments/${shipmentId}`);
  },

  /** Admin: paged shipping-rate configuration, optionally filtered by zone code. */
  listRates(params: { page?: number; size?: number; zoneCode?: string } = {}) {
    return api.page<ShippingRate>("/shipping/rates", {
      query: {
        page: params.page ?? 0,
        size: params.size ?? 20,
        zoneCode: params.zoneCode?.trim() || undefined,
      },
    });
  },
};

export interface ShippingRate {
  rateId: string;
  zoneCode: string;
  baseFee: number;
  currency: string;
  condition: string | null;
  baseWeightGram: number;
  stepWeightGram: number;
  stepFee: number;
  maxFee: number | null;
  expressExtraFee: number;
  expressEtaDays: number | null;
  createdAt: string;
  updatedAt: string;
}

interface ShippingRateInput {
  baseFee: number;
  condition?: string;
  baseWeightGram?: number;
  stepWeightGram?: number;
  stepFee?: number;
  maxFee?: number | null;
  expressExtraFee?: number;
  expressEtaDays?: number | null;
}

export const shippingRateService = {
  configure(body: ShippingRateInput & { zoneCode: string; currency: string }) {
    return api.post<ShippingRate>("/shipping/rates", body);
  },

  update(rateId: string, body: ShippingRateInput) {
    return api.put<ShippingRate>(`/shipping/rates/${rateId}`, body);
  },

  get(rateId: string) {
    return api.get<ShippingRate>(`/shipping/rates/${rateId}`);
  },
};
