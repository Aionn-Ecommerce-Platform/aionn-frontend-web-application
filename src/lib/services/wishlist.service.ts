import api from "@/shared/api";
import type { Product } from "@/types";

export const wishlistService = {
  list(page = 0, size = 20) {
    return api.page<Product>("/catalog/wishlist", { query: { page, size } });
  },

  add(productId: string) {
    return api.post<void>(`/catalog/wishlist/${productId}`);
  },

  remove(productId: string) {
    return api.delete<void>(`/catalog/wishlist/${productId}`);
  },

  status(productId: string) {
    return api.get<{ wishlisted: boolean }>(
      `/catalog/wishlist/${productId}/status`,
    );
  },
};
