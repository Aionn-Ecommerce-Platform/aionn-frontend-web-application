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
  currency: string;
  score: number;
  reason: RecommendationReason;
}
