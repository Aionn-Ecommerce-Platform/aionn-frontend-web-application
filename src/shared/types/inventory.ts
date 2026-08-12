export type WarehouseStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export interface Warehouse {
  warehouseId: string;
  merchantId: string;
  address: string | null;
  priorityLevel: number;
  status: WarehouseStatus;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItem {
  skuId: string;
  warehouseId: string;
  physicalQty: number;
  availableQty: number;
  reservedQty: number;
  safetyStockQty: number;
  locked: boolean;
  batchNo: string | null;
  expiryDate: string | null;
  createdAt: string;
  updatedAt: string;
}

type ReservationStatus = "RESERVED" | "COMMITTED" | "RELEASED" | "EXPIRED";

export interface Reservation {
  reservationId: string;
  skuId: string;
  warehouseId: string;
  orderId: string;
  qty: number;
  status: ReservationStatus;
  reservedAt: string;
  expiresAt: string | null;
  decidedAt: string | null;
}

export type StockTransferStatus =
  | "INITIATED"
  | "IN_TRANSIT"
  | "COMPLETED"
  | "CANCELLED";

export interface StockTransfer {
  transferId: string;
  merchantId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  skuId: string;
  qty: number;
  status: StockTransferStatus;
  initiatedAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
}
