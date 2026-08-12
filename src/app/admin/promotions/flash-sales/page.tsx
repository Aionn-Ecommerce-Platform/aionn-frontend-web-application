"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Zap, CheckCircle2, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { Button, Badge, EmptyState, Modal } from "@/shared/ui";
import AuthGuard from "@/components/auth/AuthGuard";
import { flashSaleService } from "@/lib/services";
import type {
  FlashSaleRegistration,
  FlashSaleRegistrationStatus,
} from "@/lib/services/flash-sale.service";
import { getErrorMessage } from "@/shared/lib/errors";
import { formatCurrency, formatDateTime } from "@/shared/lib/utils";
import { useTranslation } from "@/hooks";

const TABS: Array<{ key: FlashSaleRegistrationStatus; labelKey: string }> = [
  { key: "PENDING", labelKey: "statuses.flashSaleRegistration.PENDING" },
  { key: "APPROVED", labelKey: "statuses.flashSaleRegistration.APPROVED" },
  { key: "REJECTED", labelKey: "statuses.flashSaleRegistration.REJECTED" },
  { key: "CANCELLED", labelKey: "statuses.flashSaleRegistration.CANCELLED" },
];

const STATUS_CFG: Record<
  FlashSaleRegistrationStatus,
  {
    labelKey: string;
    variant: "default" | "info" | "success" | "warning" | "danger";
  }
> = {
  PENDING: {
    labelKey: "statuses.flashSaleRegistration.PENDING",
    variant: "warning",
  },
  APPROVED: {
    labelKey: "statuses.flashSaleRegistration.APPROVED",
    variant: "success",
  },
  REJECTED: {
    labelKey: "statuses.flashSaleRegistration.REJECTED",
    variant: "danger",
  },
  CANCELLED: {
    labelKey: "statuses.flashSaleRegistration.CANCELLED",
    variant: "default",
  },
};

function AdminFlashSalesInner() {
  const { t, locale } = useTranslation();
  const qc = useQueryClient();
  const [tab, setTab] = useState<FlashSaleRegistrationStatus>("PENDING");
  const [rejectTarget, setRejectTarget] =
    useState<FlashSaleRegistration | null>(null);
  const [reason, setReason] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-flash-sales", tab],
    queryFn: () => flashSaleService.listByStatus(tab, 100),
  });
  const items = data ?? [];

  function refresh() {
    qc.invalidateQueries({ queryKey: ["admin-flash-sales"] });
  }

  const approveMu = useMutation({
    mutationFn: (registrationId: string) =>
      flashSaleService.approve(registrationId),
    onSuccess: () => {
      toast.success(t("adminFlashSales.approveSuccess"));
      refresh();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const rejectMu = useMutation({
    mutationFn: (vars: { registrationId: string; reason: string }) =>
      flashSaleService.reject(vars.registrationId, vars.reason),
    onSuccess: () => {
      toast.success(t("adminFlashSales.rejectSuccess"));
      setRejectTarget(null);
      setReason("");
      refresh();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  function submitReject() {
    if (!rejectTarget) return;
    if (!reason.trim()) {
      toast.error(t("adminFlashSales.reasonRequired"));
      return;
    }
    rejectMu.mutate({
      registrationId: rejectTarget.registrationId,
      reason: reason.trim(),
    });
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {t("adminFlashSales.title")}
        </h1>
        <p className="text-gray-500 mb-6 text-sm">
          {t("adminFlashSales.description")}
        </p>

        <div className="flex flex-wrap items-center gap-2 mb-6">
          {TABS.map((tabOption) => (
            <Button
              key={tabOption.key}
              variant={tab === tabOption.key ? "primary" : "outline"}
              size="sm"
              onClick={() => setTab(tabOption.key)}
            >
              {t(tabOption.labelKey)}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="animate-spin text-blue-600" size={28} />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Zap}
            title={t("adminFlashSales.emptyTitle")}
            description={t("adminFlashSales.emptyDescription")}
          />
        ) : (
          <div className="space-y-3">
            {items.map((r) => {
              const cfg = STATUS_CFG[r.status];
              const sellingPct = r.saleStock
                ? (r.soldCount / r.saleStock) * 100
                : 0;
              return (
                <div
                  key={r.registrationId}
                  className="bg-white rounded-md border border-gray-400 p-5"
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono text-xs text-gray-500">
                          {r.registrationId}
                        </span>
                        <Badge variant={cfg.variant}>{t(cfg.labelKey)}</Badge>
                      </div>
                      <p className="text-sm text-gray-700">
                        Campaign{" "}
                        <span className="font-mono">{r.campaignId}</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Merchant{" "}
                        <span className="font-mono">{r.merchantId}</span> ·
                        Product <span className="font-mono">{r.productId}</span>{" "}
                        · SKU <span className="font-mono">{r.skuId}</span>
                      </p>
                      <p className="text-sm text-gray-700 mt-2">
                        {t("adminFlashSales.salePrice")}:{" "}
                        <span className="font-medium">
                          {formatCurrency(r.salePrice, r.currency, locale)}
                        </span>{" "}
                        · Stock{" "}
                        <span className="font-medium">{r.saleStock}</span>
                        {r.soldCount > 0 && (
                          <>
                            {" "}
                            ·{" "}
                            {t("adminFlashSales.sold", {
                              count: r.soldCount,
                              percent: sellingPct.toFixed(1),
                            })}
                          </>
                        )}
                      </p>
                      {r.rejectReason && (
                        <p className="text-sm text-red-600 mt-1">
                          {t("adminFlashSales.rejectReason", {
                            reason: r.rejectReason,
                          })}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        {t("adminFlashSales.submittedAt", {
                          date: formatDateTime(r.submittedAt, locale),
                        })}
                        {r.decidedAt && (
                          <>
                            {" "}
                            ·{" "}
                            {t("adminFlashSales.decidedAt", {
                              date: formatDateTime(r.decidedAt, locale),
                            })}
                            {r.decidedBy &&
                              ` ${t("adminFlashSales.by", { actor: r.decidedBy })}`}
                          </>
                        )}
                      </p>
                    </div>

                    {r.status === "PENDING" && (
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          loading={
                            approveMu.isPending &&
                            approveMu.variables === r.registrationId
                          }
                          onClick={() => approveMu.mutate(r.registrationId)}
                        >
                          <CheckCircle2 size={14} className="mr-1" />{" "}
                          {t("common.approved")}
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => {
                            setReason("");
                            setRejectTarget(r);
                          }}
                        >
                          <XCircle size={14} className="mr-1" />{" "}
                          {t("common.rejected")}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        isOpen={rejectTarget !== null}
        onClose={() => setRejectTarget(null)}
        title={t("adminFlashSales.rejectTitle")}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {t("adminFlashSales.rejectHelp")}
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            placeholder={t("adminFlashSales.reasonPlaceholder")}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setRejectTarget(null)}
              disabled={rejectMu.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="danger"
              onClick={submitReject}
              loading={rejectMu.isPending}
            >
              {t("common.rejected")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function AdminFlashSalesPage() {
  return (
    <AuthGuard requiredRoles={["SYSTEM_ADMIN"]}>
      <AdminFlashSalesInner />
    </AuthGuard>
  );
}
