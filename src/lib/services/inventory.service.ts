import api from "@/shared/api";
import type {
  InventoryItem,
  PageResult,
  Reservation,
  StockTransfer,
} from "@/types";

export const inventoryService = {
  get(skuId: string, warehouseId: string) {
    return api.get<InventoryItem>(`/inventory/items/${skuId}/${warehouseId}`);
  },

  listBySku(skuId: string) {
    return api.get<InventoryItem[]>("/inventory/items", {
      query: { skuId },
    });
  },

  listByWarehouse(warehouseId: string, page = 0, size = 50) {
    return api.page<InventoryItem>(
      `/inventory/items/by-warehouse/${warehouseId}`,
      { query: { page, size } },
    );
  },

  listLowStock(page = 0, size = 50): Promise<PageResult<InventoryItem>> {
    return api.page<InventoryItem>("/inventory/items/admin/low-stock", {
      query: { page, size },
    });
  },

  initialize(body: { skuId: string; warehouseId: string; initialQty: number }) {
    return api.post<InventoryItem>("/inventory/items", body);
  },

  configureSafetyStock(
    skuId: string,
    warehouseId: string,
    body: { safetyStockQty: number },
  ) {
    return api.put<InventoryItem>(
      `/inventory/items/${skuId}/${warehouseId}/safety-stock`,
      body,
    );
  },

  trackBatchAndExpiry(
    skuId: string,
    warehouseId: string,
    body: { batchNo: string; expiryDate: string },
  ) {
    return api.put<InventoryItem>(
      `/inventory/items/${skuId}/${warehouseId}/batch-expiry`,
      body,
    );
  },

  manualAdjustment(
    skuId: string,
    warehouseId: string,
    body: { qty: number; type: string; reason?: string },
  ) {
    return api.post<InventoryItem>(
      `/inventory/items/${skuId}/${warehouseId}/manual-adjustment`,
      body,
    );
  },

  emergencyLock(skuId: string, warehouseId: string, body: { reason: string }) {
    return api.post<InventoryItem>(
      `/inventory/items/${skuId}/${warehouseId}/lock`,
      body,
    );
  },

  emergencyUnlock(skuId: string, warehouseId: string) {
    return api.post<InventoryItem>(
      `/inventory/items/${skuId}/${warehouseId}/unlock`,
    );
  },

  auditInventory(
    skuId: string,
    warehouseId: string,
    body: { actualQty: number },
  ) {
    return api.post<InventoryItem>(
      `/inventory/items/${skuId}/${warehouseId}/audit`,
      body,
    );
  },
};

export const stockTransferService = {
  initiate(body: {
    fromWarehouseId: string;
    toWarehouseId: string;
    skuId: string;
    qty: number;
  }) {
    return api.post<StockTransfer>("/inventory/transfers", body);
  },

  complete(transferId: string, body: { receivedQty: number }) {
    return api.post<StockTransfer>(
      `/inventory/transfers/${transferId}/complete`,
      body,
    );
  },

  cancel(transferId: string, body: { reason: string }) {
    return api.post<StockTransfer>(
      `/inventory/transfers/${transferId}/cancel`,
      body,
    );
  },

  get(transferId: string) {
    return api.get<StockTransfer>(`/inventory/transfers/${transferId}`);
  },
};

export const stockReservationService = {
  reserve(body: {
    skuId: string;
    warehouseId: string;
    orderId: string;
    qty: number;
    ttlSeconds: number;
  }) {
    return api.post<Reservation>("/inventory/reservations", body);
  },

  commit(reservationId: string) {
    return api.post<Reservation>(
      `/inventory/reservations/${reservationId}/commit`,
    );
  },

  release(reservationId: string, body: { reason: string }) {
    return api.post<Reservation>(
      `/inventory/reservations/${reservationId}/release`,
      body,
    );
  },

  get(reservationId: string) {
    return api.get<Reservation>(`/inventory/reservations/${reservationId}`);
  },
};
