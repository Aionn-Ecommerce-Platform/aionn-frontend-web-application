import api from "@/shared/api";
import type {
  Shipment,
  ShipmentAddress,
  ShipmentDimensions,
  ShippingQuote,
} from "@/types";

interface CreateShipmentInput {
  orderId: string;
  userId: string;
  address: ShipmentAddress;
  dimensions: ShipmentDimensions;
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
  quote(
    address: ShipmentAddress,
    dimensions: ShipmentDimensions,
    currency?: string,
  ) {
    return api.post<ShippingQuote>("/shipping/shipments/quote", {
      address,
      dimensions,
      currency,
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
  createdAt: string;
  updatedAt: string;
}

export const shippingRateService = {
  configure(body: {
    zoneCode: string;
    baseFee: number;
    currency: string;
    condition?: string;
  }) {
    return api.post<ShippingRate>("/shipping/rates", body);
  },

  update(rateId: string, body: { baseFee: number; condition?: string }) {
    return api.put<ShippingRate>(`/shipping/rates/${rateId}`, body);
  },

  get(rateId: string) {
    return api.get<ShippingRate>(`/shipping/rates/${rateId}`);
  },
};
