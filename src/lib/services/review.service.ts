import api from "@/shared/api";
export type ReviewStatus = "VISIBLE" | "HIDDEN" | "REPORTED" | "DELETED";

export interface Review {
  reviewId: string;
  productId: string;
  userId: string;
  orderId: string | null;
  skuId?: string | null;
  rating: number;
  title: string | null;
  content: string | null;
  imageUrls: string[];
  status: ReviewStatus;
  merchantReply: string | null;
  merchantRepliedAt: string | null;
  reportedByMerchantId?: string | null;
  reportReason?: string | null;
  reportedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  userName?: string | null;
  userDisplayName?: string | null;
  userAvatarUrl?: string | null;
}

interface RatingSummary {
  productId?: string;
  average: number;
  total: number;
  distribution: {
    [key: number]: number;
  };
  averageRating?: number;
  totalReviews?: number;
  ratingDistribution?: {
    [key: number]: number;
  };
}

export interface SubmitReviewRequest {
  orderId?: string;
  skuId?: string;
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
  orderId?: string | null;
  skuId?: string | null;
}

export const reviewService = {
  submitReview(productId: string, data: SubmitReviewRequest) {
    return api.post<Review>(`/catalog/products/${productId}/reviews`, data);
  },

  checkEligibility(
    productId: string,
    params: { orderId?: string; skuId?: string } = {},
  ) {
    return api.get<ReviewEligibility>(
      `/catalog/products/${productId}/reviews/eligibility`,
      { query: params },
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

  async getAllMyReviews(pageSize = 100) {
    const first = await this.getMyReviews(0, pageSize);
    if (first.totalPages <= 1) {
      return first.content;
    }
    const remaining = await Promise.all(
      Array.from({ length: first.totalPages - 1 }, (_, index) =>
        this.getMyReviews(index + 1, pageSize),
      ),
    );
    return remaining.reduce(
      (all, page) => all.concat(page.content),
      [...first.content],
    );
  },

  merchantReply(reviewId: string, data: MerchantReplyRequest) {
    return api.post<Review>(`/catalog/reviews/${reviewId}/reply`, data);
  },

  report(reviewId: string, data: { reason: string }) {
    return api.post<Review>(`/catalog/reviews/${reviewId}/report`, data);
  },

  adminList(params: {
    search?: string;
    status?: ReviewStatus;
    rating?: number;
    page: number;
    size: number;
  }) {
    return api.page<Review>("/catalog/admin/reviews", {
      query: {
        search: params.search,
        status: params.status,
        rating: params.rating,
        page: params.page,
        size: params.size,
      },
    });
  },

  listReported(page = 0, size = 20) {
    return api.page<Review>("/catalog/admin/reviews/reported", {
      query: { page, size },
    });
  },

  adminDelete(reviewId: string) {
    return api.delete<void>(`/catalog/admin/reviews/${reviewId}`);
  },

  hide(reviewId: string) {
    return api.post<Review>(`/catalog/admin/reviews/${reviewId}/hide`);
  },

  listForMerchant(params: {
    page: number;
    size: number;
    replied?: boolean;
    search?: string;
  }) {
    return api.page<Review>("/catalog/merchant/reviews", {
      query: {
        page: params.page,
        size: params.size,
        replied: params.replied,
        search: params.search,
      },
    });
  },

  unhide(reviewId: string) {
    return api.post<Review>(`/catalog/admin/reviews/${reviewId}/restore`);
  },
};
