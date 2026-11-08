import api from "@/shared/api";
import type {
  Shipment,
  ShipmentAddress,
  ShippingQuote,
} from "@/types";

export interface ShippingQuoteItem {
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
  freeShippingThreshold: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ShippingRateInput {
  baseFee: number;
  condition?: string;
  baseWeightGram?: number;
  stepWeightGram?: number;
  stepFee?: number;
  maxFee?: number | null;
  freeShippingThreshold?: number | null;
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
