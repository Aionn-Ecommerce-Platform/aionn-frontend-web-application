import api from "@/shared/api";
export type ReviewStatus = "VISIBLE" | "HIDDEN" | "REPORTED" | "DELETED";

export interface Review {
  reviewId: string;
  productId: string;
  userId: string;
  orderId: string | null;
  rating: number;
  title: string | null;
  content: string | null;
  imageUrls: string[];
  status: ReviewStatus;
  merchantReply: string | null;
  merchantRepliedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface RatingSummary {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    [key: number]: number;
  };
}

export interface SubmitReviewRequest {
  rating: number;
  title?: string;
  content?: string;
  imageUrls?: string[];
}

interface UpdateReviewRequest {
  rating: number;
  title?: string;
  content?: string;
  imageUrls?: string[];
}

interface MerchantReplyRequest {
  content: string;
}

interface ReviewEligibility {
  canReview: boolean;
  reason: "ALREADY_REVIEWED" | "NOT_PURCHASED" | null;
}

export const reviewService = {
  submitReview(productId: string, data: SubmitReviewRequest) {
    return api.post<Review>(`/catalog/products/${productId}/reviews`, data);
  },

  checkEligibility(productId: string) {
    return api.get<ReviewEligibility>(
      `/catalog/products/${productId}/reviews/eligibility`,
    );
  },

  updateReview(reviewId: string, data: UpdateReviewRequest) {
    return api.put<Review>(`/catalog/reviews/${reviewId}`, data);
  },

  deleteReview(reviewId: string) {
    return api.delete<void>(`/catalog/reviews/${reviewId}`);
  },

  getProductReviews(productId: string, page = 0, size = 10) {
    return api.page<Review>(`/catalog/products/${productId}/reviews`, {
      query: { page, size },
    });
  },

  getAdminProductReviews(productId: string, page = 0, size = 50) {
    return api.page<Review>(`/catalog/admin/products/${productId}/reviews`, {
      query: { page, size },
    });
  },

  getProductRatingSummary(productId: string) {
    return api.get<RatingSummary>(
      `/catalog/products/${productId}/rating-summary`,
    );
  },

  getMyReviews(page = 0, size = 10) {
    return api.page<Review>(`/catalog/reviews/mine`, {
      query: { page, size },
    });
  },

  merchantReply(reviewId: string, data: MerchantReplyRequest) {
    return api.post<Review>(`/catalog/reviews/${reviewId}/reply`, data);
  },

  hide(reviewId: string) {
    return api.post<Review>(`/catalog/admin/reviews/${reviewId}/hide`);
  },

  listForMerchant(params: { page: number; size: number; replied?: boolean }) {
    return api.page<Review>("/catalog/merchant/reviews", {
      query: { page: params.page, size: params.size, replied: params.replied },
    });
  },

  unhide(reviewId: string) {
    return api.post<Review>(`/catalog/admin/reviews/${reviewId}/restore`);
  },
};
