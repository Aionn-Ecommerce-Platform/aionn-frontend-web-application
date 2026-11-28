"use client";

import { useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  EyeOff,
  Eye,
  Loader2,
  MessageSquare,
  Star,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button, ConfirmDialog, Pagination } from "@/shared/ui";
import {
  AdminEmpty,
  AdminHeader,
  AdminPill,
  AdminSearch,
  AdminTable,
  AdminTabs,
  adminRow,
  adminTd,
  adminTh,
} from "@/features/admin";
import AuthGuard from "@/components/auth/AuthGuard";
import { useDebounce, useTranslation } from "@/hooks";
import { productService, reviewService } from "@/lib/services";
import type { ReviewStatus } from "@/lib/services/review.service";
import { getReviewStatus } from "@/lib/domain/status/review";
import { getErrorMessage } from "@/shared/lib/errors";
import { formatDateTime } from "@/shared/lib/utils";

const TONE = {
  default: "neutral",
  info: "info",
  success: "success",
  warning: "warning",
  danger: "danger",
} as const;

type ReviewTab = "ALL" | "REPORTED" | "HIDDEN";

const TABS: Array<{ value: ReviewTab; labelKey: string }> = [
  { value: "ALL", labelKey: "common.all" },
  { value: "REPORTED", labelKey: "adminReviews.tabReported" },
  { value: "HIDDEN", labelKey: "statuses.review.HIDDEN" },
];

const PAGE_SIZE = 20;

function tabStatus(tab: ReviewTab): ReviewStatus | undefined {
  return tab === "ALL" ? undefined : tab;
}

function AdminReviewsInner() {
  const { t, locale } = useTranslation();
  const qc = useQueryClient();
  const [tab, setTab] = useState<ReviewTab>("ALL");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [hideTarget, setHideTarget] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const trimmedSearch = debouncedSearch.trim();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-reviews", { tab, search: trimmedSearch, page }],
    queryFn: () =>
      reviewService.adminList({
        search: trimmedSearch || undefined,
        status: tabStatus(tab),
        page: page - 1,
        size: PAGE_SIZE,
      }),
    retry: false,
  });

  const reviews = useMemo(() => data?.content ?? [], [data]);
  const totalElements = data?.totalElements ?? reviews.length;
  const totalPages = Math.max(1, data?.totalPages ?? 1);

  const productCache = useRef(new Map<string, string>());
  const productIds = useMemo(
    () => Array.from(new Set(reviews.map((review) => review.productId))),
    [reviews],
  );
  const productIdsKey = productIds.join(",");

  const { data: productNames } = useQuery({
    queryKey: ["admin-review-product-names", productIdsKey],
    queryFn: async () => {
      const entries = await Promise.all(
        productIds.map(async (productId) => {
          const cached = productCache.current.get(productId);
          if (cached) return [productId, cached] as const;
          try {
            const product = await productService.get(productId);
            productCache.current.set(productId, product.name);
            return [productId, product.name] as const;
          } catch {
            return [productId, productId] as const;
          }
        }),
      );
      return Object.fromEntries(entries) as Record<string, string>;
    },
    enabled: productIds.length > 0,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const hideMutation = useMutation({
    mutationFn: (reviewId: string) => reviewService.hide(reviewId),
    onSuccess: () => {
      toast.success(t("adminReviews.hiddenToast"));
      setHideTarget(null);
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const restoreMutation = useMutation({
    mutationFn: (reviewId: string) => reviewService.unhide(reviewId),
    onSuccess: () => {
      toast.success(t("adminReviews.restoredToast"));
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (reviewId: string) => reviewService.adminDelete(reviewId),
    onSuccess: () => {
      toast.success(t("adminReviews.deletedToast"));
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const productName = (productId: string) =>
    productNames?.[productId] ?? productId;

  return (
    <div className="min-h-screen">
      <AdminHeader
        icon={Star}
        title={t("adminReviews.title")}
        description={t("adminReviews.description")}
      />

      <AdminTabs
        value={tab}
        onChange={(value) => {
          setTab(value);
          setPage(1);
        }}
        tabs={TABS.map((tabOption) => ({
          value: tabOption.value,
          label: t(tabOption.labelKey),
        }))}
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <AdminSearch
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder={t("adminConsole.searchPlaceholder")}
        />
        <p className="text-xs text-slate-400 sm:ml-auto">
          {t("adminReviews.total", { count: totalElements })}
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-purple-300" size={28} />
        </div>
      ) : error ? (
        <AdminEmpty
          icon={AlertCircle}
          title={t("adminReviews.loadFailed")}
          description={getErrorMessage(error)}
          action={
            <Button variant="outline" onClick={() => void refetch()}>
              {t("common.tryAgain")}
            </Button>
          }
        />
      ) : reviews.length === 0 ? (
        <AdminEmpty
          icon={MessageSquare}
          title={t("common.noResults")}
          description={
            tab === "REPORTED"
              ? t("adminReviews.emptyReported")
              : t("adminConsole.totalCount", { count: 0 })
          }
        />
      ) : (
        <>
          <AdminTable>
            <thead>
              <tr className="border-b border-slate-600/60 bg-white/[0.03]">
                <th className={adminTh}>
                  {t("merchant.productList.colProduct")}
                </th>
                <th className={adminTh}>{t("adminUsers.user")}</th>
                <th className={adminTh}>{t("reviews.rating")}</th>
                <th className={adminTh}>{t("reviews.content")}</th>
                <th className={adminTh}>{t("common.status")}</th>
                <th className={adminTh}>{t("common.createdAt")}</th>
                <th className={`${adminTh} text-right`}>
                  {t("common.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((review) => (
                <tr key={review.reviewId} className={adminRow}>
                  <td className={adminTd}>
                    <p className="max-w-56 truncate font-semibold text-white">
                      {productName(review.productId)}
                    </p>
                    <p className="max-w-56 truncate font-mono text-xs text-slate-500">
                      {review.productId}
                    </p>
                  </td>
                  <td className={adminTd}>
                    <p className="max-w-40 truncate text-slate-200">
                      {review.userDisplayName ??
                        review.userName ??
                        review.userId}
                    </p>
                    <p className="max-w-40 truncate font-mono text-xs text-slate-500">
                      {review.userId}
                    </p>
                  </td>
                  <td className={adminTd}>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={13}
                          className={
                            star <= review.rating
                              ? "fill-yellow-400 text-yellow-400"
                              : "fill-slate-600 text-slate-600"
                          }
                        />
                      ))}
                    </div>
                  </td>
                  <td className={adminTd}>
                    {review.title && (
                      <p className="mb-0.5 line-clamp-1 text-sm font-semibold text-white">
                        {review.title}
                      </p>
                    )}
                    <p className="line-clamp-2 max-w-md text-sm text-slate-300">
                      {review.content}
                    </p>
                    {review.reportReason && (
                      <p className="mt-1 line-clamp-1 text-xs text-rose-300">
                        {t("adminReviews.reportReason", {
                          reason: review.reportReason,
                        })}
                      </p>
                    )}
                  </td>
                  <td className={adminTd}>
                    <AdminPill
                      tone={TONE[getReviewStatus(review.status).variant]}
                    >
                      {t(getReviewStatus(review.status).labelKey)}
                    </AdminPill>
                  </td>
                  <td className={adminTd}>
                    <span className="whitespace-nowrap text-xs text-slate-400">
                      {formatDateTime(review.createdAt, locale)}
                    </span>
                  </td>
                  <td className={`${adminTd} text-right`}>
                    <div className="flex flex-wrap items-center justify-end gap-2">
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
                          onClick={() =>
                            restoreMutation.mutate(review.reviewId)
                          }
                        >
                          <Eye size={14} className="mr-1 text-green-600" />
                          <span className="text-green-600">
                            {t("adminReviews.restore")}
                          </span>
                        </Button>
                      )}
                      {review.status !== "DELETED" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTarget(review.reviewId)}
                        >
                          <Trash2 size={14} className="mr-1 text-red-600" />
                          <span className="text-red-600">
                            {t("adminReviews.delete")}
                          </span>
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </AdminTable>

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      )}

      <ConfirmDialog
        isOpen={hideTarget !== null}
        onClose={() => setHideTarget(null)}
        onConfirm={() => hideTarget && hideMutation.mutate(hideTarget)}
        title={t("adminReviews.hideTitle")}
        message={t("adminReviews.hideMessage")}
        confirmLabel={t("adminReviews.confirmHide")}
        loading={hideMutation.isPending}
      />

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        title={t("adminReviews.deleteTitle")}
        message={t("adminReviews.deleteMessage")}
        confirmLabel={t("adminReviews.confirmDelete")}
        loading={deleteMutation.isPending}
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
