import api from "@/shared/api";
import type { Warehouse, WarehouseStatus } from "@/types";

export const warehouseService = {
  listMine(
    params: {
      page?: number;
      limit?: number;
      status?: WarehouseStatus;
      search?: string;
    } = {},
  ) {
    return api.page<Warehouse>("/inventory/warehouses", {
      query: {
        page: params.page ?? 0,
        limit: params.limit ?? 10,
        status: params.status,
        search: params.search,
      },
    });
  },
  stats() {
    return api.get<{
      total: number;
      active: number;
      inactive: number;
      suspended: number;
    }>("/inventory/warehouses/stats");
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
    pickupName?: string;
    pickupPhone?: string;
    provinceCode?: string;
    districtCode?: string;
    wardCode?: string;
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
