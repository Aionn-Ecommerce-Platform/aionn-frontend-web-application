export type ShipmentStatus =
  | "REQUESTED"
  | "REGISTERED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "DELIVERY_FAILED"
  | "RETURNED"
  | "CANCELLED";

export interface ShipmentAddress {
  fullName: string;
  phone: string;
  addressLine: string;
  wardCode: string;
  districtId: string;
  provinceCode: string;
  countryCode: string;
}

export interface ShipmentDimensions {
  weightGram: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}

export interface Shipment {
  shipmentId: string;
  orderId: string;
  trackingCode: string | null;
  carrierOrderId: string | null;
  labelUrl: string | null;
  codAmount: number;
  shippingFee: number;
  currency: string;
  status: ShipmentStatus;
  currentLocation: string | null;
  shipperName: string | null;
  shipperPhone: string | null;
  attemptCount: number;
  lastFailureReason: string | null;
  expectedDeliveryDate: string | null;
  pickedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  returnedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ShippingQuote {
  fee: number;
  currency: string;
  zoneCode: string;
  source: string;
  detail: string | null;
  estimatedDeliveryAt: string | null;
  carrierOrderDate: string | null;
}
