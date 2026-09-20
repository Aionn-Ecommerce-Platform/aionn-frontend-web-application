import api from "@/shared/api";
import type { RecommendationItem } from "@/types";

/**
 * Service for communicating with backend recommendation engine endpoints.
 */
export const recommendationService = {
  /**
   * Fetches personalized or trending recommendations for the home feed.
   * @param limit - Maximum number of recommended items to retrieve.
   */
  getHomeFeed(limit = 10) {
    return api.get<RecommendationItem[]>("/recommendations/home", {
      query: { limit },
    });
  },

  /**
   * Fetches products that are similar to the specified product.
   * @param productId - Target product ID to find similarities for.
   * @param limit - Maximum number of similar items to retrieve.
   */
  getSimilarProducts(productId: string, limit = 10) {
    return api.get<RecommendationItem[]>(
      `/recommendations/products/${productId}/similar`,
      {
        anonymous: true,
        query: { limit },
      },
    );
  },

  /**
   * Fetches products frequently bought together with the specified product.
   * @param productId - Target product ID.
   * @param limit - Maximum number of co-purchased items to retrieve.
   */
  getAlsoBought(productId: string, limit = 10) {
    return api.get<RecommendationItem[]>(
      `/recommendations/products/${productId}/also-bought`,
      {
        anonymous: true,
        query: { limit },
      },
    );
  },

  /**
   * Fetches complementary item suggestions based on current cart SKUs.
   * @param skuIds - Array of SKU IDs currently in the cart.
   * @param limit - Maximum number of cart suggestion items to retrieve.
   */
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
