"use client";

import { AppImage } from "@/shared/ui";

import { useState } from "react";
import {
  Package,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Eye,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  Button,
  Modal,
  Textarea,
  Input,
  ConfirmDialog,
  Pagination,
} from "@/shared/ui";
import {
  AdminEmpty,
  AdminHeader,
  AdminPill,
  AdminSearch,
  AdminTable,
  adminPrimaryClass,
  adminRow,
  adminTd,
  adminTh,
} from "@/features/admin";
import AuthGuard from "@/components/auth/AuthGuard";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/query-keys";
import { getProductStatus } from "@/lib/domain/status/product";
import { productService } from "@/lib/services";
import { getErrorMessage } from "@/shared/lib/errors";
import { getProductCoverImage } from "@/shared/lib/media";
import { useDebounce, useTranslation } from "@/hooks";
import type { Product } from "@/types";
import { formatCurrency, formatDateTime } from "@/shared/lib/utils";

const TONE = {
  default: "neutral",
  info: "info",
  success: "success",
  warning: "warning",
  danger: "danger",
} as const;

function AdminProductApprovalInner() {
  const { t, locale } = useTranslation();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const qc = useQueryClient();
  const query = {
    page,
    size: 20,
    search: debouncedSearch.trim() || undefined,
  };
  const { data, isLoading: loading } = useQuery({
    queryKey: qk.adminPendingReviews(query),
    queryFn: () => productService.listPendingReviews(query),
  });
  const refetch = () => qc.invalidateQueries({ queryKey: ["products"] });
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const [actionModal, setActionModal] = useState<{
    action: "approve" | "reject" | "takedown";
    productId: string;
  } | null>(null);
  const [reasonCode, setReasonCode] = useState("");
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);

  const products = data?.content || [];
  const totalPages = data?.totalElements
    ? Math.ceil(data.totalElements / data.size)
    : 1;

  async function handleApprove(productId: string) {
    setSaving(true);
    try {
      await productService.publish(productId);
      toast.success(t("adminProductApproval.approveSuccess"));
      void refetch();
      setActionModal(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleReject() {
    if (!actionModal || !reasonCode) {
      toast.error(t("adminProductApproval.reasonCodeRequired"));
      return;
    }
    setSaving(true);
    try {
      await productService.reject(actionModal.productId, {
        reasonCode,
        feedback: feedback || undefined,
      });
      toast.success(t("adminProductApproval.rejectSuccess"));
      void refetch();
      setActionModal(null);
      setReasonCode("");
      setFeedback("");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleTakedown() {
    if (!actionModal || !feedback) {
      toast.error(t("adminProductApproval.takedownReasonRequired"));
      return;
    }
    setSaving(true);
    try {
      await productService.emergencyTakedown(actionModal.productId, {
        reason: feedback,
      });
      toast.success(t("adminProductApproval.takedownSuccess"));
      void refetch();
      setActionModal(null);
      setFeedback("");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen">
      <AdminHeader icon={Package} title={t("adminProductApproval.title")} />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <AdminSearch
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(0);
          }}
          placeholder={t("adminProductApproval.searchPlaceholder")}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-purple-300" size={28} />
        </div>
      ) : products.length > 0 ? (
        <>
          <AdminTable>
            <thead>
              <tr className="border-b border-slate-600/60 bg-white/[0.03]">
                <th className={adminTh}>{t("common.image")}</th>
                <th className={adminTh}>{t("common.details")}</th>
                <th className={adminTh}>{t("common.status")}</th>
                <th className={`${adminTh} text-right`}>
                  {t("common.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.productId} className={adminRow}>
                  <td className={adminTd}>
                    {product.imageList && product.imageList.length > 0 ? (
                      <AppImage
                        src={getProductCoverImage(product.imageList)}
                        alt={product.name}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="flex w-16 h-16 items-center justify-center rounded-lg bg-white/5">
                        <Package className="text-slate-500" size={24} />
                      </div>
                    )}
                  </td>
                  <td className={adminTd}>
                    <h3 className="text-base font-semibold text-white">
                      {product.name}
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">
                      {product.productId.slice(0, 24)}... •{" "}
                      {formatDateTime(product.createdAt, locale)}
                    </p>

                    {product.description && (
                      <p className="mt-2 line-clamp-2 text-sm text-slate-300">
                        {product.description}
                      </p>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-400">
                      <span>
                        Merchant: {product.merchantId.slice(0, 12)}...
                      </span>
                      {product.variants[0] && (
                        <span>
                          {t("common.price")}:{" "}
                          {formatCurrency(
                            product.variants[0].price,
                            product.variants[0].currency,
                            locale,
                          )}
                        </span>
                      )}
                      <span>
                        {t("adminProductApproval.variantCount", {
                          count: product.variants.length,
                        })}
                      </span>
                    </div>
                  </td>
                  <td className={adminTd}>
                    <AdminPill
                      tone={TONE[getProductStatus(product.status).variant]}
                    >
                      {t(getProductStatus(product.status).labelKey)}
                    </AdminPill>
                  </td>
                  <td className={`${adminTd} text-right`}>
                    {product.status === "PENDING_REVIEW" && (
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Button
                          size="sm"
                          className={adminPrimaryClass}
                          onClick={() =>
                            setActionModal({
                              action: "approve",
                              productId: product.productId,
                            })
                          }
                        >
                          <CheckCircle2 size={14} />
                          {t("adminProductApproval.approve")}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setActionModal({
                              action: "reject",
                              productId: product.productId,
                            })
                          }
                        >
                          <XCircle size={14} className="mr-1" />
                          {t("adminProductApproval.reject")}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewProduct(product)}
                        >
                          <Eye size={14} className="mr-1" />
                          {t("common.details")}
                        </Button>
                      </div>
                    )}

                    {product.status === "PUBLISHED" && (
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() =>
                            setActionModal({
                              action: "takedown",
                              productId: product.productId,
                            })
                          }
                        >
                          <AlertTriangle size={14} className="mr-1" />
                          {t("adminProductApproval.emergencyTakedown")}
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </AdminTable>

          {data && (
            <Pagination
              currentPage={page + 1}
              totalPages={totalPages}
              onPageChange={(nextPage) => setPage(nextPage - 1)}
            />
          )}
        </>
      ) : (
        <AdminEmpty
          icon={Package}
          title={t("adminProductApproval.emptyTitle")}
          description={t("adminProductApproval.emptyPending")}
        />
      )}

      <ConfirmDialog
        isOpen={actionModal?.action === "approve"}
        onClose={() => setActionModal(null)}
        onConfirm={() => actionModal && handleApprove(actionModal.productId)}
        title={t("adminProductApproval.approveTitle")}
        message={t("adminProductApproval.approveMessage")}
        confirmLabel={t("adminProductApproval.approve")}
        loading={saving}
      />

      <Modal
        isOpen={actionModal?.action === "reject"}
        onClose={() => {
          setActionModal(null);
          setReasonCode("");
          setFeedback("");
        }}
        title={t("adminProductApproval.rejectTitle")}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label={t("adminProductApproval.reasonCode")}
            value={reasonCode}
            onChange={(e) => setReasonCode(e.target.value)}
            placeholder={t("adminProductApproval.reasonCodePlaceholder")}
          />
          <Textarea
            label={t("adminProductApproval.feedback")}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder={t("adminProductApproval.feedbackPlaceholder")}
            rows={4}
          />
          <Button
            onClick={handleReject}
            className="w-full"
            loading={saving}
            disabled={!reasonCode}
          >
            {t("adminProductApproval.confirmReject")}
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={actionModal?.action === "takedown"}
        onClose={() => {
          setActionModal(null);
          setFeedback("");
        }}
        title={t("adminProductApproval.takedownTitle")}
        size="md"
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-900">
              {t("adminProductApproval.takedownWarning")}
            </p>
            <p className="mt-1 text-xs text-red-700">
              {t("adminProductApproval.takedownHelp")}
            </p>
          </div>
          <Textarea
            label={t("adminProductApproval.takedownReason")}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder={t("adminProductApproval.takedownPlaceholder")}
            rows={4}
          />
          <Button
            onClick={handleTakedown}
            className="w-full bg-red-600 hover:bg-red-700"
            loading={saving}
            disabled={!feedback}
          >
            {t("adminProductApproval.confirmTakedown")}
          </Button>
        </div>
      </Modal>

      {viewProduct && (
        <Modal
          isOpen={true}
          onClose={() => setViewProduct(null)}
          title={t("adminProductApproval.detailTitle")}
          size="lg"
        >
          <div className="space-y-4">
            <div>
              <h4 className="mb-2 text-sm font-medium text-gray-900">
                {t("common.images")}
              </h4>
              <div className="flex gap-2">
                {viewProduct.imageList.map((img, idx) => (
                  <AppImage
                    key={idx}
                    src={img}
                    alt=""
                    className="w-24 h-24 object-cover rounded"
                  />
                ))}
              </div>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-medium text-gray-900">
                {t("adminProductApproval.description")}
              </h4>
              <p className="text-sm text-gray-600">
                {viewProduct.description || "—"}
              </p>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-medium text-gray-900">
                {t("adminProductApproval.variantCount", {
                  count: viewProduct.variants.length,
                })}
              </h4>
              <div className="space-y-2">
                {viewProduct.variants.map((v, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded bg-gray-50 p-2"
                  >
                    <span className="text-sm text-gray-700">
                      {Object.entries(v.attributeValues)
                        .map(([k, val]) => `${k}: ${val}`)
                        .join(", ")}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(v.price, v.currency, locale)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function AdminProductApprovalPage() {
  return (
    <AuthGuard requiredRoles={["SYSTEM_ADMIN", "CS_ADMIN"]}>
      <AdminProductApprovalInner />
    </AuthGuard>
  );
}
