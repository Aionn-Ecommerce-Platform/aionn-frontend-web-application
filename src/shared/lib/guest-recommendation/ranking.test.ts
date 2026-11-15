import { describe, expect, it } from "vitest";
import type { GuestRecommendationConfig } from "./config";
import type { RecommendationItem } from "@/types";
import { rankGuestRecommendations } from "./ranking";

const config: GuestRecommendationConfig = {
  candidateLimit: 5,
  pageSize: 3,
  maxViewedProducts: 3,
  viewTtlMinutes: 30,
  affinityHalfLifeMinutes: 15,
  categoryWeight: 0.2,
  brandWeight: 0.12,
  viewedProductWeight: 0.15,
  jitter: 0.05,
};

function item(
  productId: string,
  score: number,
  categoryIds: string[] = [],
  brandId: string | null = null,
): RecommendationItem {
  return {
    productId,
    name: productId,
    imageUrl: "",
    priceFrom: 1000,
    currency: "VND",
    score,
    reason: "TRENDING",
    categoryIds,
    brandId,
  };
}

describe("rankGuestRecommendations", () => {
  it("boosts products in a viewed category", () => {
    const result = rankGuestRecommendations({
      items: [
        item("p-1", 0.5, ["cat-unknown"]),
        item("p-2", 0.4, ["cat-phone"]),
        item("p-3", 0.3, ["cat-unknown"]),
      ],
      viewed: [
        {
          productId: "viewed",
          categoryIds: ["cat-phone"],
          brandId: null,
          viewedAt: 0,
        },
      ],
      seed: "seed",
      pageNonce: "load",
      now: 0,
      config,
    });

    expect(result.map((entry) => entry.productId)).toEqual([
      "p-2",
      "p-1",
      "p-3",
    ]);
  });

  it("changes the sampled page when the page nonce changes", () => {
    const items = Array.from({ length: 5 }, (_, index) =>
      item(`p-${index}`, 0.5),
    );
    const first = rankGuestRecommendations({
      items,
      viewed: [],
      seed: "seed",
      pageNonce: "first",
      now: 0,
      config,
    }).map((entry) => entry.productId);
    const second = rankGuestRecommendations({
      items,
      viewed: [],
      seed: "seed",
      pageNonce: "second",
      now: 0,
      config,
    }).map((entry) => entry.productId);

    expect(first).not.toEqual(second);
  });

  it("is deterministic for the same session and page load", () => {
    const items = Array.from({ length: 5 }, (_, index) =>
      item(`p-${index}`, 0.5),
    );
    const first = rankGuestRecommendations({
      items,
      viewed: [],
      seed: "seed",
      pageNonce: "load",
      now: 0,
      config,
    });
    const second = rankGuestRecommendations({
      items,
      viewed: [],
      seed: "seed",
      pageNonce: "load",
      now: 0,
      config,
    });

    expect(first).toEqual(second);
  });
});
