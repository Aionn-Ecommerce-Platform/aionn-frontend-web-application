export interface GuestRecommendationConfig {
  candidateLimit: number;
  pageSize: number;
  maxViewedProducts: number;
  viewTtlMinutes: number;
  affinityHalfLifeMinutes: number;
  categoryWeight: number;
  brandWeight: number;
  viewedProductWeight: number;
  jitter: number;
}

export const guestRecommendationConfig: GuestRecommendationConfig = {
  candidateLimit: 50,
  pageSize: 30,
  maxViewedProducts: 3,
  viewTtlMinutes: 30,
  affinityHalfLifeMinutes: 15,
  categoryWeight: 0.12,
  brandWeight: 0.08,
  viewedProductWeight: 0.1,
  jitter: 0.04,
};
