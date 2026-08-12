"use client";

import { useState } from "react";
import Image from "next/image";
import { MessageSquare, Star, Reply, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button, Modal, Textarea, Badge } from "@/shared/ui";
import AuthGuard from "@/components/auth/AuthGuard";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/hooks";
import { qk } from "@/lib/query-keys";
import { reviewService } from "@/lib/services";
import { getReviewStatus } from "@/lib/domain/status/review";
import { getErrorMessage, isNotImplemented } from "@/shared/lib/errors";
import { formatDateTime } from "@/shared/lib/utils";

function MerchantReviewsInner() {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "REPLIED">("ALL");
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
  const [saving, setSaving] = useState(false);

  const reviews = data?.content ?? [];
  const backendUnavailable = isNotImplemented(error);

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

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {t("merchant.reviews.title")}
        </h1>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex gap-2">
            {(["ALL", "PENDING", "REPLIED"] as const).map((f) => (
              <Button
                key={f}
                variant={filter === f ? "primary" : "outline"}
                size="sm"
                onClick={() => {
                  setFilter(f);
                  setPage(0);
                }}
              >
                {f === "ALL"
                  ? t("merchant.reviews.filterAll")
                  : f === "PENDING"
                    ? t("merchant.reviews.filterPending")
                    : t("merchant.reviews.filterReplied")}
              </Button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-md border border-gray-400 p-12 flex justify-center">
            <Loader2 className="animate-spin text-blue-600" size={28} />
          </div>
        ) : backendUnavailable ? (
          <div className="bg-white rounded-md border border-gray-400 p-12 text-center">
            <MessageSquare className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t("merchant.reviews.unavailableTitle")}
            </h3>
            <p className="text-sm text-gray-500">
              {t("merchant.reviews.unavailableDescription")}
            </p>
          </div>
        ) : reviews.length > 0 ? (
          <div className="space-y-4">
            {reviews.map((review) => {
              const isHidden = review.status === "HIDDEN";
              return (
                <div
                  key={review.reviewId}
                  className="bg-white rounded-md border border-gray-400 p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-semibold text-blue-600">
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
                    <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded">
                      <div className="flex items-start gap-2">
                        <Reply size={14} className="text-blue-600 mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-blue-900 mb-1">
                            {t("merchant.reviews.merchantReplyLabel")}
                          </p>
                          <p className="text-sm text-blue-800">
                            {review.merchantReply}
                          </p>
                          {review.merchantRepliedAt && (
                            <p className="text-xs text-blue-600 mt-2">
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
                </div>
              );
            })}

            {data && data.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 0}
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
                  onClick={() => setPage(page + 1)}
                  disabled={page >= data.totalPages - 1}
                >
                  {t("merchant.reviews.nextPage")}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-md border border-gray-400 p-12 text-center">
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
