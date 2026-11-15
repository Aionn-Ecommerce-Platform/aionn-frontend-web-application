import type { GuestRecommendationConfig } from "./config";
import type { RecommendationItem } from "@/types";

export interface GuestViewedProduct {
  productId: string;
  categoryIds: string[];
  brandId: string | null;
  viewedAt: number;
}

export interface GuestRankingInput {
  items: RecommendationItem[];
  viewed: GuestViewedProduct[];
  seed: string;
  pageNonce: string;
  now: number;
  config: GuestRecommendationConfig;
}

function hashToUnit(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
}

function decayedWeight(
  viewedAt: number,
  now: number,
  halfLifeMinutes: number,
): number {
  const ageMinutes = Math.max(0, (now - viewedAt) / 60_000);
  return Math.pow(0.5, ageMinutes / halfLifeMinutes);
}

function overlapScore(
  ids: string[] | null | undefined,
  weights: Map<string, number>,
): number {
  if (!ids || ids.length === 0) return 0;
  let total = 0;
  for (const id of ids) {
    total += weights.get(id) ?? 0;
  }
  return total;
}

export function rankGuestRecommendations({
  items,
  viewed,
  seed,
  pageNonce,
  now,
  config,
}: GuestRankingInput): RecommendationItem[] {
  if (items.length === 0) return [];

  const unique = new Map<string, RecommendationItem>();
  for (const item of items) {
    if (!unique.has(item.productId)) unique.set(item.productId, item);
  }

  const pool = [...unique.values()];
  const viewedIds = new Set(viewed.map((view) => view.productId));

  let totalViewWeight = 0;
  const categoryWeights = new Map<string, number>();
  const brandWeights = new Map<string, number>();

  for (const view of viewed) {
    const weight = decayedWeight(view.viewedAt, now, config.affinityHalfLifeMinutes);
    if (weight <= 0) continue;
    totalViewWeight += weight;
    for (const categoryId of view.categoryIds) {
      categoryWeights.set(
        categoryId,
        (categoryWeights.get(categoryId) ?? 0) + weight,
      );
    }
    if (view.brandId) {
      brandWeights.set(
        view.brandId,
        (brandWeights.get(view.brandId) ?? 0) + weight,
      );
    }
  }

  const denominator = totalViewWeight > 0 ? totalViewWeight : 1;

  const scored = pool.map((item) => {
    const categoryAffinity = Math.min(
      1,
      overlapScore(item.categoryIds, categoryWeights) / denominator,
    );
    const brandAffinity = Math.min(
      1,
      overlapScore([item.brandId ?? ""], brandWeights) / denominator,
    );
    const viewedBoost = viewedIds.has(item.productId) ? 1 : 0;
    const jitter =
      (hashToUnit(`${seed}:${pageNonce}:${item.productId}`) - 0.5) *
      config.jitter;
    const score =
      (Number.isFinite(item.score) ? item.score : 0) +
      categoryAffinity * config.categoryWeight +
      brandAffinity * config.brandWeight +
      viewedBoost * config.viewedProductWeight +
      jitter;

    return { item, score };
  });

  scored.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    return left.item.productId.localeCompare(right.item.productId);
  });

  return scored.slice(0, config.pageSize).map((entry) => entry.item);
}
