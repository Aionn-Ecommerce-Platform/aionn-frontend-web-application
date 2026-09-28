"use client";

import { AppImage } from "@/shared/ui";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Star, MessageCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { reviewService, type Review } from "@/lib/services";
import { useTranslation } from "@/hooks";
import { formatDistanceToNow, type Locale } from "date-fns";
import { vi, enUS } from "date-fns/locale";

interface ReviewListProps {
  productId: string;
  headerSlot?: React.ReactNode;
}

export function ReviewList({ productId, headerSlot }: ReviewListProps) {
  const { t, locale } = useTranslation();
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const [activeFilter, setActiveFilter] = useState<
    "all" | 5 | 4 | 3 | 2 | 1 | "with_comment" | "with_media"
  >("all");

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
      <div className="space-y-6">
        {headerSlot}
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const reviews = reviewsData?.content || [];
  const totalPages = reviewsData?.totalPages || 0;
  const summary = ratingSummary;
  const totalReviews = summary?.total ?? summary?.totalReviews ?? 0;
  const averageRating = summary?.average ?? summary?.averageRating ?? 0;
  const distribution =
    summary?.distribution ?? summary?.ratingDistribution ?? {};

  const dateLocale = locale === "vi" ? vi : enUS;

  const commentCount = reviews.filter(
    (r) => r.content && r.content.trim().length > 0,
  ).length;
  const mediaCount = reviews.filter(
    (r) => r.imageUrls && r.imageUrls.length > 0,
  ).length;

  const filteredReviews = reviews.filter((review: Review) => {
    if (activeFilter === "all") return true;
    if (typeof activeFilter === "number") return review.rating === activeFilter;
    if (activeFilter === "with_comment")
      return Boolean(review.content && review.content.trim().length > 0);
    if (activeFilter === "with_media")
      return Boolean(review.imageUrls && review.imageUrls.length > 0);
    return true;
  });

  return (
    <div className="space-y-6">
      {summary && totalReviews > 0 && (
        <div className="bg-orange-50/40 border border-orange-100 rounded-sm p-6 flex flex-col md:flex-row items-start md:items-center gap-6 sm:gap-8">
          <div className="flex flex-col items-center justify-center min-w-[140px] text-center">
            <div className="text-xl sm:text-2xl font-medium text-red-500">
              <span className="text-3xl sm:text-4xl font-bold">
                {averageRating.toFixed(1)}
              </span>{" "}
              <span className="text-base sm:text-lg">
                {t("reviews.outOfFive")}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-5 h-5 ${
                    star <= Math.round(averageRating)
                      ? "fill-red-500 text-red-500"
                      : "text-gray-300 fill-gray-200"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex-1 flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => setActiveFilter("all")}
              className={`px-4 py-1.5 text-sm rounded-xs border transition-colors ${
                activeFilter === "all"
                  ? "border-red-500 text-red-500 bg-white font-medium shadow-2xs"
                  : "border-gray-200 text-gray-700 bg-white hover:border-gray-300"
              }`}
            >
              {t("reviews.allFilter")}
            </button>
            {[5, 4, 3, 2, 1].map((star) => {
              const count = distribution[star] || 0;
              return (
                <button
                  key={star}
                  type="button"
                  onClick={() => setActiveFilter(star as 5 | 4 | 3 | 2 | 1)}
                  className={`px-4 py-1.5 text-sm rounded-xs border transition-colors ${
                    activeFilter === star
                      ? "border-red-500 text-red-500 bg-white font-medium shadow-2xs"
                      : "border-gray-200 text-gray-700 bg-white hover:border-gray-300"
                  }`}
                >
                  {t("reviews.starFilter", { star, count })}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setActiveFilter("with_comment")}
              className={`px-4 py-1.5 text-sm rounded-xs border transition-colors ${
                activeFilter === "with_comment"
                  ? "border-red-500 text-red-500 bg-white font-medium shadow-2xs"
                  : "border-gray-200 text-gray-700 bg-white hover:border-gray-300"
              }`}
            >
              {t("reviews.withComment", { count: commentCount })}
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("with_media")}
              className={`px-4 py-1.5 text-sm rounded-xs border transition-colors ${
                activeFilter === "with_media"
                  ? "border-red-500 text-red-500 bg-white font-medium shadow-2xs"
                  : "border-gray-200 text-gray-700 bg-white hover:border-gray-300"
              }`}
            >
              {t("reviews.withMedia", { count: mediaCount })}
            </button>
          </div>
        </div>
      )}

      {headerSlot}

      <div className="space-y-4">
        {filteredReviews.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>{t("reviews.noReviews")}</p>
          </div>
        ) : (
          filteredReviews.map((review: Review) => (
            <ReviewCard
              key={review.reviewId}
              review={review}
              dateLocale={dateLocale}
            />
          ))
        )}
      </div>

      {filteredReviews.length > 0 && (
        <div className="flex items-center justify-center sm:justify-end gap-1.5 pt-6">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            aria-label={t("common.previous")}
            className="h-8.5 px-2.5 border border-gray-200 rounded-xs text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 transition-colors cursor-pointer"
          >
            <ChevronLeft size={16} />
          </button>
          {Array.from({ length: Math.max(1, totalPages) }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPage(i)}
              className={`min-w-8.5 h-8.5 px-3 rounded-xs text-sm font-medium transition-colors cursor-pointer ${
                page === i
                  ? "bg-red-500 text-white shadow-xs font-semibold"
                  : "border border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            type="button"
            onClick={() =>
              setPage((p) => Math.min(Math.max(1, totalPages) - 1, p + 1))
            }
            disabled={page >= Math.max(1, totalPages) - 1}
            aria-label={t("common.next")}
            className="h-8.5 px-2.5 border border-gray-200 rounded-xs text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 transition-colors cursor-pointer"
          >
            <ChevronRight size={16} />
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
    <div className="border border-gray-200 rounded-sm p-4 hover:shadow-md transition-shadow">
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
              className="w-20 h-20 object-cover rounded-xs border border-gray-200"
            />
          ))}
        </div>
      )}

      {review.merchantReply && (
        <div className="mt-3 bg-gray-50 rounded-xs p-3 border-l-4 border-purple-500">
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
