"use client";

import { AppImage, ImageLightbox, RatingStars } from "@/shared/ui";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { reviewService, type Review } from "@/lib/services";
import { useTranslation } from "@/hooks";
import { formatDate } from "@/shared/lib/utils";
import { isVideoUrl } from "@/shared/lib/media";

interface ReviewListProps {
  productId: string;
  headerSlot?: React.ReactNode;
}

export function ReviewList({ productId, headerSlot }: ReviewListProps) {
  const { t } = useTranslation();
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
        <div className="flex flex-col gap-5 pb-2">
          <div className="flex flex-col items-start text-left">
            <div className="text-xl sm:text-2xl font-medium text-gray-950">
              <span className="text-6xl sm:text-7xl font-bold">
                {averageRating.toFixed(1)}
              </span>{" "}
              <span className="text-base sm:text-lg text-gray-500">
                {t("reviews.outOfFive")}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1">
              <RatingStars rating={averageRating} size={20} className="gap-0.5" />
            </div>
          </div>
          <div className="w-full flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveFilter("all")}
              className={`px-5 py-2 text-sm font-semibold rounded-full border transition-all cursor-pointer ${activeFilter === "all" ? "border-gray-950 text-white bg-gray-950 shadow-xs" : "border-gray-950 text-gray-800 bg-white hover:bg-gray-100 hover:text-black"}`}
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
                  className={`px-5 py-2 text-sm font-semibold rounded-full border transition-all cursor-pointer ${activeFilter === star ? "border-gray-950 text-white bg-gray-950 shadow-xs" : "border-gray-950 text-gray-800 bg-white hover:bg-gray-100 hover:text-black"}`}
                >
                  {t("reviews.starFilter", { star, count })}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setActiveFilter("with_comment")}
              className={`px-5 py-2 text-sm font-semibold rounded-full border transition-all cursor-pointer ${activeFilter === "with_comment" ? "border-gray-950 text-white bg-gray-950 shadow-xs" : "border-gray-950 text-gray-800 bg-white hover:bg-gray-100 hover:text-black"}`}
            >
              {t("reviews.withComment", { count: commentCount })}
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("with_media")}
              className={`px-5 py-2 text-sm font-semibold rounded-full border transition-all cursor-pointer ${activeFilter === "with_media" ? "border-gray-950 text-white bg-gray-950 shadow-xs" : "border-gray-950 text-gray-800 bg-white hover:bg-gray-100 hover:text-black"}`}
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
            />
          ))
        )}
      </div>

      {filteredReviews.length > 0 && (
        <div className="flex items-center justify-center gap-2 pt-6">
          <button
            type="button"
            onClick={() => page > 0 && setPage((p) => Math.max(0, p - 1))}
            disabled={page <= 0}
            aria-label={t("common.previous")}
            className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
              page <= 0
                ? "border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed"
                : "border-gray-400 bg-white text-gray-900 cursor-pointer hover:border-gray-950 hover:bg-gray-100"
            }`}
          >
            <ChevronLeft size={16} />
          </button>
          {Array.from({ length: Math.max(1, totalPages) }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPage(i)}
              aria-current={page === i ? "page" : undefined}
              className={`h-9 min-w-9 rounded-full border px-2 text-xs font-bold transition-all cursor-pointer ${
                page === i
                  ? "bg-gray-950 text-white shadow-xs border-gray-950"
                  : "border-gray-400 bg-white text-gray-800 hover:border-gray-950 hover:bg-gray-100"
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            type="button"
            onClick={() =>
              page < Math.max(1, totalPages) - 1 &&
              setPage((p) => Math.min(Math.max(1, totalPages) - 1, p + 1))
            }
            disabled={page >= Math.max(1, totalPages) - 1}
            aria-label={t("common.next")}
            className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
              page >= Math.max(1, totalPages) - 1
                ? "border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed"
                : "border-gray-400 bg-white text-gray-900 cursor-pointer hover:border-gray-950 hover:bg-gray-100"
            }`}
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
}: {
  review: Review;
}) {
  const { t, locale } = useTranslation();
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const renderStars = (rating: number) => {
    return <RatingStars rating={rating} size={16} className="gap-0.5" />;
  };

  const buyerName = (() => {
    const name = review.userDisplayName || review.userName;
    if (name && name.trim().length > 0) {
      return name.trim();
    }
    return t("reviews.customer");
  })();

  const initial = (() => {
    const name = review.userDisplayName || review.userName;
    if (name && name.trim().length > 0) {
      return name.trim().charAt(0).toUpperCase();
    }
    return "K";
  })();

  return (
    <div className="border border-gray-400 rounded-2xl p-5 hover:border-gray-400 transition-colors bg-white shadow-xs">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3">
          {review.userAvatarUrl ? (
            <div className="w-9 h-9 rounded-full overflow-hidden border border-gray-400 shrink-0 bg-gray-50 relative">
              <AppImage
                src={review.userAvatarUrl}
                alt={buyerName}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-9 h-9 rounded-full bg-linear-to-tr from-gray-100 to-gray-200 border border-gray-400 flex items-center justify-center shrink-0 text-xs font-bold text-gray-700">
              {initial}
            </div>
          )}
          <div>
            <div className="font-medium text-gray-900 text-sm">
              {buyerName}
            </div>
            <div className="text-xs text-gray-500">
              {formatDate(review.createdAt, locale)}
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
          {review.imageUrls.map((url, idx) =>
            isVideoUrl(url) ? (
              <video
                key={idx}
                src={url}
                controls
                className="h-20 w-32 rounded-xl border border-gray-400 bg-black object-cover"
              >
                <track kind="captions" />
              </video>
            ) : (
              <button
                key={idx}
                type="button"
                onClick={() => setPreviewImage(url)}
                className="cursor-zoom-in overflow-hidden rounded-xl border border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-950"
                aria-label={t("reviews.imageAlt", { index: idx + 1 })}
              >
                <AppImage
                  src={url}
                  alt={t("reviews.imageAlt", { index: idx + 1 })}
                  className="w-20 h-20 object-cover transition-transform hover:scale-105"
                />
              </button>
            ),
          )}
        </div>
      )}

      {review.merchantReply && (
        <div className="mt-3 bg-gray-200/70 rounded-xl p-3.5 border-l-3 border-gray-900">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-gray-900">
              {t("reviews.merchantReply")}
            </span>
            {review.merchantRepliedAt && (
              <span className="text-xs text-gray-500">
                •{" "}
                {formatDate(review.merchantRepliedAt, locale)}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-700">{review.merchantReply}</p>
        </div>
      )}

      <ImageLightbox
        src={previewImage}
        alt={t("reviews.images")}
        onClose={() => setPreviewImage(null)}
      />
    </div>
  );
}


