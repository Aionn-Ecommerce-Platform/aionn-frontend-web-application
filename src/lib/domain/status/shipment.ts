import type { ShipmentStatus } from "@/types";

type ShipmentStatusConfig = {
  labelKey: string;
  variant: "default" | "info" | "success" | "warning" | "danger";
};

const SHIPMENT_STATUS: Record<ShipmentStatus, ShipmentStatusConfig> = {
  REQUESTED: { labelKey: "statuses.shipment.REQUESTED", variant: "default" },
  REGISTERED: { labelKey: "statuses.shipment.REGISTERED", variant: "info" },
  PICKED_UP: { labelKey: "statuses.shipment.PICKED_UP", variant: "info" },
  IN_TRANSIT: { labelKey: "statuses.shipment.IN_TRANSIT", variant: "info" },
  OUT_FOR_DELIVERY: {
    labelKey: "statuses.shipment.OUT_FOR_DELIVERY",
    variant: "warning",
  },
  DELIVERED: { labelKey: "statuses.shipment.DELIVERED", variant: "success" },
  DELIVERY_FAILED: {
    labelKey: "statuses.shipment.DELIVERY_FAILED",
    variant: "danger",
  },
  RETURNED: { labelKey: "statuses.shipment.RETURNED", variant: "warning" },
  CANCELLED: { labelKey: "statuses.shipment.CANCELLED", variant: "danger" },
};

export function getShipmentStatus(status: ShipmentStatus) {
  return SHIPMENT_STATUS[status];
}
