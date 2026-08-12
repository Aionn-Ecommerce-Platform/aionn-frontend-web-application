import api from "@/shared/api";
import type { Brand } from "@/types";

export const brandService = {
  list(page = 0, size = 50) {
    return api.page<Brand>("/catalog/brands", {
      anonymous: true,
      query: { page, size },
    });
  },
  get(brandId: string) {
    return api.get<Brand>(`/catalog/brands/${brandId}`, { anonymous: true });
  },
  create(body: { name: string; logoUrl?: string; description?: string }) {
    return api.post<Brand>("/catalog/brands", body);
  },
  update(
    brandId: string,
    body: { name: string; logoUrl?: string; description?: string },
  ) {
    return api.put<Brand>(`/catalog/brands/${brandId}`, body);
  },
  delete(brandId: string, body: { reason: string }) {
    return api.post<void>(`/catalog/brands/${brandId}/delete`, body);
  },
};
