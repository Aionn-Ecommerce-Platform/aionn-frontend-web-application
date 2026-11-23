"use client";

import { useState } from "react";
import Image from "next/image";
import {
  MessageSquare,
  Star,
  Reply,
  Loader2,
  Flag,
  Search,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button, Modal, Textarea, Badge } from "@/shared/ui";
import AuthGuard from "@/components/auth/AuthGuard";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/hooks";
import { qk } from "@/lib/query-keys";
import { productService, reviewService } from "@/lib/services";
import { getReviewStatus } from "@/lib/domain/status/review";
import { getErrorMessage, isNotImplemented } from "@/shared/lib/errors";
import { formatDateTime } from "@/shared/lib/utils";

function MerchantReviewsInner() {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "REPLIED">("ALL");
  const [search, setSearch] = useState("");
  const qc = useQueryClient();
  const listParams = {
    page,
    size: 20,
    replied:
      filter === "REPLIED" ? true : filter === "PENDING" ? false : undefined,
  };
  const {
    data,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: qk.merchantReviews(listParams),
    queryFn: () => reviewService.listForMerchant(listParams),
  });
  const refetch = () => qc.invalidateQueries({ queryKey: ["reviews"] });
  const [replyModal, setReplyModal] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [reportModal, setReportModal] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [saving, setSaving] = useState(false);

  const reviews = data?.content ?? [];
  const backendUnavailable = isNotImplemented(error);

  const productIds = [...new Set(reviews.map((review) => review.productId))];
  const { data: reviewProducts } = useQuery({
    queryKey: ["merchant-review-products", productIds.join(",")],
    queryFn: async () => {
      const products = await Promise.all(
        productIds.map((id) => productService.get(id).catch(() => null)),
      );
      return new Map(
        products
          .filter((product): product is NonNullable<typeof product> =>
            Boolean(product),
          )
          .map((product) => [product.productId, product]),
      );
    },
    enabled: productIds.length > 0,
  });
  const normalizedSearch = search.trim().toLowerCase();
  const visibleReviews = reviews.filter((review) => {
    if (!normalizedSearch) return true;
    const product = reviewProducts?.get(review.productId);
    return (
      review.productId.toLowerCase().includes(normalizedSearch) ||
      (product?.name ?? "").toLowerCase().includes(normalizedSearch) ||
      (review.content ?? "").toLowerCase().includes(normalizedSearch)
    );
  });

  async function handleReply(reviewId: string) {
    setSaving(true);
    try {
      await reviewService.merchantReply(reviewId, { content: replyText });
      toast.success(t("merchant.reviews.toastReplied"));
      setReplyModal(null);
      setReplyText("");
      void refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleReport(reviewId: string) {
    setSaving(true);
    try {
      await reviewService.report(reviewId, { reason: reportReason.trim() });
      toast.success(t("merchant.reviews.toastReported"));
      setReportModal(null);
      setReportReason("");
      void refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {t("merchant.reviews.title")}
        </h1>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("merchant.reviews.searchPlaceholder")}
              className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <select
            value={filter}
            onChange={(event) => {
              setFilter(event.target.value as "ALL" | "PENDING" | "REPLIED");
              setPage(0);
            }}
            className="rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          >
            <option value="ALL">{t("merchant.reviews.filterAll")}</option>
            <option value="PENDING">
              {t("merchant.reviews.filterPending")}
            </option>
            <option value="REPLIED">
              {t("merchant.reviews.filterReplied")}
            </option>
          </select>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-400 shadow-xs p-12 flex justify-center">
            <Loader2 className="animate-spin text-brand" size={28} />
          </div>
        ) : backendUnavailable ? (
          <div className="bg-white rounded-2xl border border-gray-400 shadow-xs p-12 text-center">
            <MessageSquare className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t("merchant.reviews.unavailableTitle")}
            </h3>
            <p className="text-sm text-gray-500">
              {t("merchant.reviews.unavailableDescription")}
            </p>
          </div>
        ) : visibleReviews.length > 0 ? (
          <div className="space-y-4">
            {visibleReviews.map((review) => {
              const isHidden = review.status === "HIDDEN";
              return (
                <div
                  key={review.reviewId}
                  className="bg-white rounded-2xl border border-gray-400 shadow-xs p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-brand/15 rounded-full flex items-center justify-center">
                        <span className="text-sm font-semibold text-brand">
                          {review.userId.slice(0, 1).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {t("merchant.reviews.anonymousUser")}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                size={14}
                                className={
                                  i < review.rating
                                    ? "text-yellow-400 fill-current"
                                    : "text-gray-300"
                                }
                              />
                            ))}
                          </div>
                          <span className="text-xs text-gray-500">
                            {formatDateTime(review.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isHidden && (
                        <Badge
                          variant={getReviewStatus(review.status).variant}
                          className="text-xs"
                        >
                          {t(getReviewStatus(review.status).labelKey)}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm text-gray-700 mb-2">
                      {review.content}
                    </p>
                    {review.imageUrls.length > 0 && (
                      <div className="flex gap-2">
                        {review.imageUrls.map((imageUrl) => (
                          <Image
                            key={imageUrl}
                            src={imageUrl}
                            alt={t("merchant.reviews.reviewImageAlt")}
                            width={80}
                            height={80}
                            className="w-20 h-20 object-cover rounded"
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {review.merchantReply ? (
                    <div className="bg-brand/10 border-l-4 border-brand p-4 rounded">
                      <div className="flex items-start gap-2">
                        <Reply size={14} className="text-brand mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-brand-strong mb-1">
                            {t("merchant.reviews.merchantReplyLabel")}
                          </p>
                          <p className="text-sm text-brand-strong">
                            {review.merchantReply}
                          </p>
                          {review.merchantRepliedAt && (
                            <p className="text-xs text-brand mt-2">
                              {formatDateTime(review.merchantRepliedAt)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setReplyModal(review.reviewId);
                        setReplyText("");
                      }}
                    >
                      <Reply size={14} className="mr-2" />
                      {t("merchant.reviews.replyButton")}
                    </Button>
                  )}

                  {review.status === "VISIBLE" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-3"
                      onClick={() => {
                        setReportModal(review.reviewId);
                        setReportReason("");
                      }}
                    >
                      <Flag size={14} className="mr-2 text-red-600" />
                      <span className="text-red-600">
                        {t("merchant.reviews.reportButton")}
                      </span>
                    </Button>
                  )}
                </div>
              );
            })}

            {data && data.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => page > 0 && setPage(page - 1)}
                >
                  {t("merchant.reviews.prevPage")}
                </Button>
                <span className="text-sm text-gray-600">
                  {t("merchant.reviews.pageOf", {
                    current: page + 1,
                    total: data.totalPages,
                  })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    page < data.totalPages - 1 && setPage(page + 1)
                  }
                >
                  {t("merchant.reviews.nextPage")}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-400 shadow-xs p-12 text-center">
            <MessageSquare className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t("merchant.reviews.emptyTitle")}
            </h3>
            <p className="text-sm text-gray-500">
              {t("merchant.reviews.emptyDescription")}
            </p>
          </div>
        )}
      </div>

      <Modal
        isOpen={replyModal !== null}
        onClose={() => setReplyModal(null)}
        title={t("merchant.reviews.modalTitle")}
        size="md"
      >
        <div className="space-y-4">
          <Textarea
            label={t("merchant.reviews.replyTextareaLabel")}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder={t("merchant.reviews.replyTextareaPlaceholder")}
            rows={4}
          />
          <Button
            onClick={() => replyModal && handleReply(replyModal)}
            className="w-full"
            loading={saving}
            disabled={!replyText.trim()}
          >
            {t("merchant.reviews.submitReply")}
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={reportModal !== null}
        onClose={() => setReportModal(null)}
        title={t("merchant.reviews.reportTitle")}
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            {t("merchant.reviews.reportDescription")}
          </p>
          <Textarea
            label={t("merchant.reviews.reportReasonLabel")}
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            placeholder={t("merchant.reviews.reportReasonPlaceholder")}
            rows={4}
          />
          <Button
            onClick={() => reportModal && handleReport(reportModal)}
            className="w-full"
            loading={saving}
            disabled={!reportReason.trim()}
          >
            {t("merchant.reviews.submitReport")}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default function MerchantReviewsPage() {
  return (
    <AuthGuard requiredRoles={["MERCHANT"]}>
      <MerchantReviewsInner />
    </AuthGuard>
  );
}
