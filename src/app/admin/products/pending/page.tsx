"use client";

import { AppImage } from "@/shared/ui";

import { useState } from "react";
import {
  Package,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Search,
  Eye,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  Button,
  Modal,
  Textarea,
  Badge,
  Input,
  ConfirmDialog,
} from "@/shared/ui";
import AuthGuard from "@/components/auth/AuthGuard";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/query-keys";
import { getProductStatus } from "@/lib/domain/status/product";
import { productService } from "@/lib/services";
import { getErrorMessage } from "@/shared/lib/errors";
import { useTranslation } from "@/hooks";
import type { Product } from "@/types";
import { formatCurrency, formatDateTime } from "@/shared/lib/utils";

function AdminProductApprovalInner() {
  const { t, locale } = useTranslation();
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<"PENDING" | "REJECTED" | "ALL">(
    "PENDING",
  );
  const [search, setSearch] = useState("");
  const qc = useQueryClient();
  const searchParams = {
    page,
    size: 20,
    status:
      filter === "PENDING"
        ? ("PENDING_REVIEW" as const)
        : filter === "REJECTED"
          ? ("REJECTED" as const)
          : undefined,
  };
  const { data, isLoading: loading } = useQuery({
    queryKey: qk.productSearchByMerchant(searchParams),
    queryFn: () => productService.searchByMerchant(searchParams),
    enabled: filter === "PENDING",
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
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );
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
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {t("adminProductApproval.title")}
        </h1>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex gap-2">
            {(["PENDING", "REJECTED", "ALL"] as const).map((f) => (
              <Button
                key={f}
                variant={filter === f ? "primary" : "outline"}
                size="sm"
                onClick={() => {
                  setFilter(f);
                  setPage(0);
                }}
              >
                {f === "PENDING"
                  ? t("adminProductApproval.pending")
                  : f === "REJECTED"
                    ? t("adminProductApproval.rejected")
                    : t("common.all")}
              </Button>
            ))}
          </div>
          <div className="flex-1">
            <div className="relative max-w-md">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder={t("adminProductApproval.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {filter !== "PENDING" ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-6 text-center text-sm text-amber-800">
            {t("adminProductApproval.filterUnavailable")}
          </div>
        ) : loading ? (
          <div className="bg-white rounded-md border border-gray-400 p-12 flex justify-center">
            <Loader2 className="animate-spin text-blue-600" size={28} />
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="space-y-4">
            {filteredProducts.map((product) => (
              <div
                key={product.productId}
                className="bg-white rounded-md border border-gray-400 p-6"
              >
                <div className="flex gap-6">
                  <div className="flex-shrink-0">
                    {product.imageList && product.imageList.length > 0 ? (
                      <AppImage
                        src={product.imageList[0]!}
                        alt={product.name}
                        className="w-24 h-24 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Package className="text-gray-400" size={32} />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {product.name}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {product.productId.slice(0, 24)}... •{" "}
                          {formatDateTime(product.createdAt, locale)}
                        </p>
                      </div>
                      <Badge variant={getProductStatus(product.status).variant}>
                        {t(getProductStatus(product.status).labelKey)}
                      </Badge>
                    </div>

                    {product.aiDescription && (
                      <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                        {product.aiDescription}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-sm text-gray-500">
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

                    {product.status === "PENDING_REVIEW" && (
                      <div className="flex items-center gap-2 mt-4">
                        <Button
                          size="sm"
                          onClick={() =>
                            setActionModal({
                              action: "approve",
                              productId: product.productId,
                            })
                          }
                        >
                          <CheckCircle2 size={14} className="mr-1" />
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
                      <div className="flex items-center gap-2 mt-4">
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
                  </div>
                </div>
              </div>
            ))}

            {data && totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 0}
                >
                  {t("common.previous")}
                </Button>
                <span className="text-sm text-gray-600">
                  {t("common.pageOf", { page: page + 1, total: totalPages })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages - 1}
                >
                  {t("common.next")}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-md border border-gray-400 p-12 text-center">
            <Package className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t("adminProductApproval.emptyTitle")}
            </h3>
            <p className="text-sm text-gray-500">
              {filter === "PENDING"
                ? t("adminProductApproval.emptyPending")
                : t("adminProductApproval.changeFilter")}
            </p>
          </div>
        )}
      </div>

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
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-900 font-medium">
              {t("adminProductApproval.takedownWarning")}
            </p>
            <p className="text-xs text-red-700 mt-1">
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
              <h4 className="text-sm font-medium text-gray-900 mb-2">
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
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                {t("adminProductApproval.aiDescription")}
              </h4>
              <p className="text-sm text-gray-600">
                {viewProduct.aiDescription || "—"}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                {t("adminProductApproval.variantCount", {
                  count: viewProduct.variants.length,
                })}
              </h4>
              <div className="space-y-2">
                {viewProduct.variants.map((v, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
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
