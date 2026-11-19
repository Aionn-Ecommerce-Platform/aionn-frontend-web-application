export type RecommendationReason =
  | "TRENDING"
  | "SIMILAR_TO_VIEWED"
  | "FREQUENTLY_BOUGHT_TOGETHER"
  | "MATCHES_YOUR_INTERESTS"
  | "NEW_ARRIVAL";

export interface RecommendationItem {
  productId: string;
  name: string;
  imageUrl: string;
  priceFrom: number;
  originalPriceFrom?: number | null;
  currency: string;
  score: number;
  reason: RecommendationReason;
  categoryIds?: string[];
  brandId?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  soldCount?: number | null;
  provinceCode?: string | null;
  provinceName?: string | null;
}
