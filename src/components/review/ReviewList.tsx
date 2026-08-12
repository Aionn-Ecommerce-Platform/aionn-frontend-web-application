"use client";

import { AppImage } from "@/shared/ui";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Star, MessageCircle } from "lucide-react";
import { reviewService, type Review } from "@/lib/services";
import { useTranslation } from "@/hooks";
import { formatDistanceToNow, type Locale } from "date-fns";
import { vi, enUS } from "date-fns/locale";

interface ReviewListProps {
  productId: string;
}

export function ReviewList({ productId }: ReviewListProps) {
  const { t, locale } = useTranslation();
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const { data: reviewsData, isLoading } = useQuery({
    queryKey: ["product-reviews", productId, page],
    queryFn: () => reviewService.getProductReviews(productId, page, pageSize),
  });

  const { data: ratingSummary } = useQuery({
    queryKey: ["product-rating-summary", productId],
    queryFn: () => reviewService.getProductRatingSummary(productId),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  const reviews = reviewsData?.content || [];
  const totalPages = reviewsData?.totalPages || 0;
  const summary = ratingSummary;

  const dateLocale = locale === "vi" ? vi : enUS;

  const renderStars = (rating: number, size: "sm" | "md" = "sm") => {
    const sizeClass = size === "sm" ? "w-4 h-4" : "w-5 h-5";
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClass} ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {summary && summary.totalReviews > 0 && (
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="flex items-start gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900">
                {summary.averageRating.toFixed(1)}
              </div>
              <div className="mt-1">
                {renderStars(Math.round(summary.averageRating), "md")}
              </div>
              <div className="mt-2 text-sm text-gray-600">
                {summary.totalReviews} {t("reviews.totalReviews")}
              </div>
            </div>

            <div className="flex-1 space-y-2">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = summary.ratingDistribution[rating] || 0;
                const percentage =
                  summary.totalReviews > 0
                    ? (count / summary.totalReviews) * 100
                    : 0;
                return (
                  <div key={rating} className="flex items-center gap-2">
                    <div className="flex items-center gap-1 w-12">
                      <span className="text-sm text-gray-700">{rating}</span>
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    </div>
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-400"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="text-sm text-gray-600 w-12 text-right">
                      {count}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>{t("reviews.noReviews")}</p>
          </div>
        ) : (
          reviews.map((review: Review) => (
            <ReviewCard
              key={review.reviewId}
              review={review}
              dateLocale={dateLocale}
            />
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t("common.previous")}
          </button>
          <span className="px-4 py-2 text-sm text-gray-700">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t("common.next")}
          </button>
        </div>
      )}
    </div>
  );
}

function ReviewCard({
  review,
  dateLocale,
}: {
  review: Review;
  dateLocale: Locale;
}) {
  const { t } = useTranslation();

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-purple-600">
              {review.userId.substring(0, 2).toUpperCase()}
            </span>
          </div>
          <div>
            <div className="font-medium text-gray-900">
              {review.userId.substring(0, 8)}***
            </div>
            <div className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(review.createdAt), {
                addSuffix: true,
                locale: dateLocale,
              })}
            </div>
          </div>
        </div>
        {renderStars(review.rating)}
      </div>

      {review.title && (
        <h4 className="font-medium text-gray-900 mb-2">{review.title}</h4>
      )}

      {review.content && (
        <p className="text-gray-700 text-sm leading-relaxed mb-3">
          {review.content}
        </p>
      )}

      {review.imageUrls && review.imageUrls.length > 0 && (
        <div className="flex gap-2 mb-3 flex-wrap">
          {review.imageUrls.map((url, idx) => (
            <AppImage
              key={idx}
              src={url}
              alt={`Review image ${idx + 1}`}
              className="w-20 h-20 object-cover rounded-md border border-gray-200"
            />
          ))}
        </div>
      )}

      {review.merchantReply && (
        <div className="mt-3 bg-gray-50 rounded-md p-3 border-l-4 border-purple-500">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-purple-600">
              {t("reviews.merchantReply")}
            </span>
            {review.merchantRepliedAt && (
              <span className="text-xs text-gray-500">
                •{" "}
                {formatDistanceToNow(new Date(review.merchantRepliedAt), {
                  addSuffix: true,
                  locale: dateLocale,
                })}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-700">{review.merchantReply}</p>
        </div>
      )}
    </div>
  );
}
