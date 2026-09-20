import api from "@/shared/api";
import type { RecommendationItem } from "@/types";

export const recommendationService = {
  getHomeFeed(limit = 10) {
    return api.get<RecommendationItem[]>("/recommendations/home", {
      query: { limit },
    });
  },

  getSimilarProducts(productId: string, limit = 10) {
    return api.get<RecommendationItem[]>(
      `/recommendations/products/${productId}/similar`,
      {
        anonymous: true,
        query: { limit },
      },
    );
  },

  getAlsoBought(productId: string, limit = 10) {
    return api.get<RecommendationItem[]>(
      `/recommendations/products/${productId}/also-bought`,
      {
        anonymous: true,
        query: { limit },
      },
    );
  },

  getCartSuggestions(skuIds: string[], limit = 10) {
    if (skuIds.length === 0) {
      return Promise.resolve([]);
    }
    return api.get<RecommendationItem[]>("/recommendations/cart/suggestions", {
      query: {
        skuIds: skuIds.join(","),
        limit,
      },
    });
  },
};
