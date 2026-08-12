import api from "@/shared/api";
import type { Warehouse, WarehouseStatus } from "@/types";

export const warehouseService = {
  listMine() {
    return api.get<Warehouse[]>("/inventory/warehouses");
  },
  get(warehouseId: string) {
    return api.get<Warehouse>(`/inventory/warehouses/${warehouseId}`, {
      anonymous: true,
    });
  },
  create(body: {
    address?: string;
    merchantId: string;
    priorityLevel: number;
  }) {
    return api.post<Warehouse>("/inventory/warehouses", body);
  },
  changeStatus(warehouseId: string, status: WarehouseStatus) {
    return api.put<Warehouse>(`/inventory/warehouses/${warehouseId}/status`, {
      status,
    });
  },
  adjustPriority(warehouseId: string, priorityLevel: number) {
    return api.put<Warehouse>(`/inventory/warehouses/${warehouseId}/priority`, {
      priorityLevel,
    });
  },
  suspend(warehouseId: string, body: { reason: string }) {
    return api.post<Warehouse>(
      `/inventory/warehouses/${warehouseId}/suspend`,
      body,
    );
  },
  liftSuspension(warehouseId: string) {
    return api.post<Warehouse>(
      `/inventory/warehouses/${warehouseId}/lift-suspension`,
    );
  },
};
