"use client";

import { AppImage } from "@/shared/ui";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Star,
  EyeOff,
  Eye,
  Loader2,
  AlertTriangle,
  MessageSquare,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button, Badge, Input, ConfirmDialog } from "@/shared/ui";
import AuthGuard from "@/components/auth/AuthGuard";
import { useTranslation } from "@/hooks";
import { reviewService } from "@/lib/services";
import { getReviewStatus } from "@/lib/domain/status/review";
import { getErrorMessage } from "@/shared/lib/errors";
import { formatDateTime } from "@/shared/lib/utils";

function AdminReviewsInner() {
  const { t, locale } = useTranslation();
  const qc = useQueryClient();
  const [productInput, setProductInput] = useState("");
  const [productId, setProductId] = useState<string | null>(null);
  const [hideTarget, setHideTarget] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-product-reviews", productId],
    queryFn: () =>
      productId ? reviewService.getAdminProductReviews(productId, 0, 50) : null,
    enabled: !!productId,
    retry: false,
  });

  const hideMutation = useMutation({
    mutationFn: (reviewId: string) => reviewService.hide(reviewId),
    onSuccess: () => {
      toast.success(t("adminReviews.hiddenToast"));
      setHideTarget(null);
      qc.invalidateQueries({ queryKey: ["admin-product-reviews"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const restoreMutation = useMutation({
    mutationFn: (reviewId: string) => reviewService.unhide(reviewId),
    onSuccess: () => {
      toast.success(t("adminReviews.restoredToast"));
      qc.invalidateQueries({ queryKey: ["admin-product-reviews"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  function handleLookup() {
    const id = productInput.trim();
    if (!id) {
      toast.error(t("adminReviews.productRequired"));
      return;
    }
    setProductId(id);
  }

  const reviews = data?.content ?? [];

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            {t("adminReviews.title")}
          </h1>
          <p className="text-sm text-gray-500">
            {t("adminReviews.description")}
          </p>
        </div>

        <div className="bg-white rounded-md border border-gray-200 p-6">
          <div className="flex items-end gap-3">
            <Input
              label="Product ID"
              value={productInput}
              onChange={(e) => setProductInput(e.target.value)}
              placeholder="PR_..."
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleLookup();
              }}
            />
            <Button onClick={handleLookup} disabled={!productInput.trim()}>
              <Search size={14} className="mr-1" />
              {t("adminReviews.lookup")}
            </Button>
          </div>
        </div>

        {isLoading && (
          <div className="bg-white rounded-md border border-gray-200 p-12 flex justify-center">
            <Loader2 className="animate-spin text-blue-600" size={28} />
          </div>
        )}

        {error && productId && !isLoading && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-start gap-3">
            <AlertTriangle size={18} className="text-red-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">
                {t("adminReviews.loadFailed")}
              </p>
              <p className="text-xs text-red-600 mt-1">
                {getErrorMessage(error)}
              </p>
            </div>
          </div>
        )}

        {productId && !isLoading && !error && reviews.length === 0 && (
          <div className="bg-white rounded-md border border-gray-200 p-12 text-center">
            <MessageSquare className="mx-auto text-gray-400 mb-4" size={40} />
            <p className="text-sm text-gray-500">
              {t("adminReviews.empty", { id: productId })}
            </p>
          </div>
        )}

        {reviews.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              {t("adminReviews.total", {
                count: data?.totalElements ?? reviews.length,
              })}
            </p>
            {reviews.map((review) => (
              <div
                key={review.reviewId}
                className="bg-white rounded-md border border-gray-200 p-5"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={14}
                          className={
                            s <= review.rating
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-200 fill-gray-200"
                          }
                        />
                      ))}
                    </div>
                    <Badge
                      variant={getReviewStatus(review.status).variant}
                      className="text-xs"
                    >
                      {t(getReviewStatus(review.status).labelKey)}
                    </Badge>
                  </div>
                  <span className="text-xs text-gray-400">
                    {formatDateTime(review.createdAt, locale)}
                  </span>
                </div>

                {review.title && (
                  <p className="text-sm font-semibold text-gray-900 mb-1">
                    {review.title}
                  </p>
                )}
                {review.content && (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap mb-3">
                    {review.content}
                  </p>
                )}

                {review.imageUrls.length > 0 && (
                  <div className="flex gap-2 flex-wrap mb-3">
                    {review.imageUrls.map((url, i) => (
                      <AppImage
                        key={i}
                        src={url}
                        alt={t("adminReviews.imageAlt", { index: i + 1 })}
                        className="w-20 h-20 object-cover rounded-md border border-gray-200"
                      />
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500 font-mono">
                    {t("adminReviews.authorOrder", {
                      user: review.userId,
                      order: review.orderId ?? "—",
                    })}
                  </p>
                  {review.status === "VISIBLE" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setHideTarget(review.reviewId)}
                    >
                      <EyeOff size={14} className="mr-1 text-red-600" />
                      <span className="text-red-600">
                        {t("adminReviews.hide")}
                      </span>
                    </Button>
                  )}
                  {(review.status === "HIDDEN" ||
                    review.status === "REPORTED") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      loading={
                        restoreMutation.isPending &&
                        restoreMutation.variables === review.reviewId
                      }
                      onClick={() => restoreMutation.mutate(review.reviewId)}
                    >
                      <Eye size={14} className="mr-1 text-green-600" />
                      <span className="text-green-600">
                        {t("adminReviews.restore")}
                      </span>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={hideTarget !== null}
        onClose={() => setHideTarget(null)}
        onConfirm={() => hideTarget && hideMutation.mutate(hideTarget)}
        title={t("adminReviews.hideTitle")}
        message={t("adminReviews.hideMessage")}
        confirmLabel={t("adminReviews.confirmHide")}
        loading={hideMutation.isPending}
      />
    </div>
  );
}

export default function AdminReviewsPage() {
  return (
    <AuthGuard requiredRoles={["SYSTEM_ADMIN", "CS_ADMIN"]}>
      <AdminReviewsInner />
    </AuthGuard>
  );
}
