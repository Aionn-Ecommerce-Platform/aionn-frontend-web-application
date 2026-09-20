import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "@/shared/api";
import { recommendationService } from "./recommendation.service";
import type { RecommendationItem } from "@/types";

vi.mock("@/shared/api", () => ({
  default: {
    get: vi.fn(),
  },
}));

describe("recommendationService", () => {
  beforeEach(() => vi.clearAllMocks());

  const mockItem: RecommendationItem = {
    productId: "01J00000000000000000000001",
    name: "Sample Product",
    imageUrl: "https://example.com/item.png",
    priceFrom: 199000,
    currency: "VND",
    score: 0.95,
    reason: "TRENDING",
  };

  it("fetches home feed with limit", async () => {
    vi.mocked(api.get).mockResolvedValue([mockItem]);

    const result = await recommendationService.getHomeFeed(15);
    expect(result).toEqual([mockItem]);
    expect(api.get).toHaveBeenCalledWith("/recommendations/home", {
      query: { limit: 15 },
    });
  });

  it("fetches similar products anonymously", async () => {
    vi.mocked(api.get).mockResolvedValue([mockItem]);

    const result = await recommendationService.getSimilarProducts(
      "prod-123",
      6,
    );
    expect(result).toEqual([mockItem]);
    expect(api.get).toHaveBeenCalledWith(
      "/recommendations/products/prod-123/similar",
      {
        anonymous: true,
        query: { limit: 6 },
      },
    );
  });

  it("fetches also-bought products anonymously", async () => {
    vi.mocked(api.get).mockResolvedValue([mockItem]);

    const result = await recommendationService.getAlsoBought("prod-456", 8);
    expect(result).toEqual([mockItem]);
    expect(api.get).toHaveBeenCalledWith(
      "/recommendations/products/prod-456/also-bought",
      {
        anonymous: true,
        query: { limit: 8 },
      },
    );
  });

  it("fetches cart suggestions for given skuIds", async () => {
    vi.mocked(api.get).mockResolvedValue([mockItem]);

    const result = await recommendationService.getCartSuggestions(
      ["sku-1", "sku-2"],
      12,
    );
    expect(result).toEqual([mockItem]);
    expect(api.get).toHaveBeenCalledWith("/recommendations/cart/suggestions", {
      query: {
        skuIds: "sku-1,sku-2",
        limit: 12,
      },
    });
  });

  it("returns empty array for empty skuIds without calling api", async () => {
    const result = await recommendationService.getCartSuggestions([], 10);
    expect(result).toEqual([]);
    expect(api.get).not.toHaveBeenCalled();
  });
});
