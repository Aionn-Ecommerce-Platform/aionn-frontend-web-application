import api from "@/shared/api";

export const stockAlertService = {
  subscribe(productId: string, skuId: string) {
    return api.post<void>(
      `/catalog/products/${productId}/variants/${skuId}/stock-alert`,
    );
  },

  unsubscribe(productId: string, skuId: string) {
    return api.delete<void>(
      `/catalog/products/${productId}/variants/${skuId}/stock-alert`,
    );
  },

  status(productId: string, skuId: string) {
    return api.get<{ subscribed: boolean }>(
      `/catalog/products/${productId}/variants/${skuId}/stock-alert/status`,
    );
  },
};
