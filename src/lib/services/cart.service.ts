import api from "@/shared/api";
import type { ServerCart } from "@/types";

export const cartService = {
  getMyCart() {
    return api.get<ServerCart>("/ordering/cart");
  },

  addItem(skuId: string, qty: number) {
    return api.post<ServerCart>("/ordering/cart/items", { skuId, qty });
  },

  updateItem(skuId: string, newQty: number) {
    return api.put<ServerCart>(`/ordering/cart/items/${skuId}`, { newQty });
  },

  removeItem(skuId: string) {
    return api.delete<ServerCart>(`/ordering/cart/items/${skuId}`);
  },

  clear() {
    return api.delete<ServerCart>("/ordering/cart");
  },

  applyVoucher(voucherCode: string) {
    return api.post<ServerCart>("/ordering/cart/voucher", { voucherCode });
  },

  removeVoucher() {
    return api.delete<ServerCart>("/ordering/cart/voucher");
  },
};
