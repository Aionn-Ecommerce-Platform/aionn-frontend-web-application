"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  PackageX,
  CheckCircle2,
  XCircle,
  PackageCheck,
  ExternalLink,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button, Badge, EmptyState, Modal } from "@/shared/ui";
import AuthGuard from "@/components/auth/AuthGuard";
import { adminOrderReturnService } from "@/lib/services";
import { getErrorMessage } from "@/shared/lib/errors";
import { formatCurrency, formatDateTime } from "@/shared/lib/utils";
import type { OrderReturn, ReturnStatus } from "@/types";
import { useTranslation } from "@/hooks";

const TABS: Array<{ key: ReturnStatus; labelKey: string }> = [
  { key: "REQUESTED", labelKey: "statuses.return.REQUESTED" },
  { key: "APPROVED", labelKey: "statuses.return.APPROVED" },
  { key: "ITEM_RECEIVED", labelKey: "statuses.return.ITEM_RECEIVED" },
  { key: "REJECTED", labelKey: "statuses.return.REJECTED" },
];

const STATUS_CFG: Record<
  ReturnStatus,
  {
    labelKey: string;
    variant: "default" | "info" | "success" | "warning" | "danger";
  }
> = {
  REQUESTED: { labelKey: "statuses.return.REQUESTED", variant: "warning" },
  APPROVED: { labelKey: "statuses.return.APPROVED", variant: "info" },
  ITEM_RECEIVED: {
    labelKey: "statuses.return.ITEM_RECEIVED",
    variant: "success",
  },
  REJECTED: { labelKey: "statuses.return.REJECTED", variant: "danger" },
  REFUNDED: { labelKey: "statuses.return.REFUNDED", variant: "success" },
  CANCELLED: { labelKey: "statuses.return.CANCELLED", variant: "default" },
};

type DialogState =
  | { kind: "idle" }
  | { kind: "approve"; r: OrderReturn }
  | { kind: "reject"; r: OrderReturn }
  | { kind: "received"; r: OrderReturn };

function AdminOrderReturnsInner() {
  const { t, locale } = useTranslation();
  const qc = useQueryClient();
  const [tab, setTab] = useState<ReturnStatus>("REQUESTED");
  const [dialog, setDialog] = useState<DialogState>({ kind: "idle" });
  const [refundAmount, setRefundAmount] = useState<number | "">("");
  const [currency, setCurrency] = useState("VND");
  const [warehouseId, setWarehouseId] = useState("");
  const [reason, setReason] = useState("");
  const [itemCondition, setItemCondition] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-returns", tab],
    queryFn: () => adminOrderReturnService.listByStatus(tab, 100),
  });
  const items = data ?? [];

  function refresh() {
    qc.invalidateQueries({ queryKey: ["admin-returns"] });
  }

  const approveMu = useMutation({
    mutationFn: (vars: {
      returnId: string;
      refundAmount?: number;
      currency?: string;
      returnWarehouseId?: string | null;
    }) =>
      adminOrderReturnService.approve(vars.returnId, {
        refundAmount: vars.refundAmount,
        currency: vars.currency,
        returnWarehouseId: vars.returnWarehouseId,
      }),
    onSuccess: () => {
      toast.success(t("adminReturns.approveSuccess"));
      closeDialog();
      refresh();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const rejectMu = useMutation({
    mutationFn: (vars: { returnId: string; reason: string }) =>
      adminOrderReturnService.reject(vars.returnId, vars.reason),
    onSuccess: () => {
      toast.success(t("adminReturns.rejectSuccess"));
      closeDialog();
      refresh();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const receivedMu = useMutation({
    mutationFn: (vars: { returnId: string; itemCondition: string }) =>
      adminOrderReturnService.confirmItemReceived(
        vars.returnId,
        vars.itemCondition,
      ),
    onSuccess: () => {
      toast.success(t("adminReturns.receivedSuccess"));
      closeDialog();
      refresh();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  function openDialog(s: DialogState) {
    setDialog(s);
    if (s.kind === "approve") {
      setRefundAmount("");
      setCurrency("VND");
      setWarehouseId("");
    } else if (s.kind === "reject") {
      setReason("");
    } else if (s.kind === "received") {
      setItemCondition("");
    }
  }

  function closeDialog() {
    setDialog({ kind: "idle" });
    setRefundAmount("");
    setCurrency("VND");
    setWarehouseId("");
    setReason("");
    setItemCondition("");
  }

  function submitDialog() {
    if (dialog.kind === "approve") {
      approveMu.mutate({
        returnId: dialog.r.returnId,
        refundAmount: refundAmount === "" ? undefined : Number(refundAmount),
        currency: refundAmount === "" ? undefined : currency,
        returnWarehouseId: warehouseId || null,
      });
    } else if (dialog.kind === "reject") {
      if (!reason.trim()) {
        toast.error(t("adminReturns.reasonRequired"));
        return;
      }
      rejectMu.mutate({ returnId: dialog.r.returnId, reason: reason.trim() });
    } else if (dialog.kind === "received") {
      if (!itemCondition.trim()) {
        toast.error(t("adminReturns.conditionRequired"));
        return;
      }
      receivedMu.mutate({
        returnId: dialog.r.returnId,
        itemCondition: itemCondition.trim(),
      });
    }
  }

  const isMutating =
    approveMu.isPending || rejectMu.isPending || receivedMu.isPending;

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {t("adminReturns.title")}
        </h1>
        <p className="text-gray-500 mb-6 text-sm">
          {t("adminReturns.description")}
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
            icon={PackageX}
            title={t("adminReturns.emptyTitle")}
            description={t("adminReturns.emptyDescription")}
          />
        ) : (
          <div className="space-y-3">
            {items.map((r) => {
              const cfg = STATUS_CFG[r.status];
              return (
                <div
                  key={r.returnId}
                  className="bg-white rounded-md border border-gray-400 p-5"
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-gray-900 text-sm">
                          {r.returnId}
                        </span>
                        <Badge variant={cfg.variant}>{t(cfg.labelKey)}</Badge>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">
                        Order <span className="font-mono">{r.orderId}</span> ·
                        Buyer <span className="font-mono">{r.userId}</span> ·
                        Merchant{" "}
                        <span className="font-mono">{r.merchantId}</span>
                      </p>
                      <p className="text-sm text-gray-700">
                        {t("adminReturns.reason")}:{" "}
                        <span className="font-medium">{r.reason}</span>
                      </p>
                      {r.refundAmount != null && r.currency && (
                        <p className="text-sm text-gray-700 mt-1">
                          {t("adminReturns.refund")}:{" "}
                          <span className="font-medium">
                            {formatCurrency(r.refundAmount, r.currency, locale)}
                          </span>
                          {r.returnWarehouseId && (
                            <>
                              {" "}
                              · Kho:{" "}
                              <span className="font-mono">
                                {r.returnWarehouseId}
                              </span>
                            </>
                          )}
                        </p>
                      )}
                      {r.itemCondition && (
                        <p className="text-sm text-gray-700 mt-1">
                          {t("adminReturns.itemCondition")}:{" "}
                          <span className="font-medium">{r.itemCondition}</span>
                        </p>
                      )}
                      {r.rejectReason && (
                        <p className="text-sm text-red-600 mt-1">
                          {t("adminReturns.rejectReason", {
                            reason: r.rejectReason,
                          })}
                        </p>
                      )}
                      {r.evidenceUrl && (
                        <a
                          href={r.evidenceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-2"
                        >
                          <ExternalLink size={12} />{" "}
                          {t("adminReturns.viewEvidence")}
                        </a>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        {t("adminReturns.createdAt", {
                          date: formatDateTime(r.createdAt, locale),
                        })}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {r.status === "REQUESTED" && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => openDialog({ kind: "approve", r })}
                          >
                            <CheckCircle2 size={14} className="mr-1" />{" "}
                            {t("common.approved")}
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => openDialog({ kind: "reject", r })}
                          >
                            <XCircle size={14} className="mr-1" />{" "}
                            {t("common.rejected")}
                          </Button>
                        </>
                      )}
                      {r.status === "APPROVED" && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => openDialog({ kind: "received", r })}
                          >
                            <PackageCheck size={14} className="mr-1" />{" "}
                            {t("adminReturns.confirmReceived")}
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => openDialog({ kind: "reject", r })}
                          >
                            <XCircle size={14} className="mr-1" />{" "}
                            {t("common.rejected")}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        isOpen={dialog.kind !== "idle"}
        onClose={closeDialog}
        title={
          dialog.kind === "approve"
            ? t("adminReturns.approveTitle")
            : dialog.kind === "reject"
              ? t("adminReturns.rejectTitle")
              : dialog.kind === "received"
                ? t("adminReturns.receivedTitle")
                : ""
        }
      >
        <div className="space-y-4">
          {dialog.kind === "approve" && (
            <>
              <p className="text-sm text-gray-600">
                {t("adminReturns.refundHelp")}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("adminReturns.refundAmount")}
                  </label>
                  <input
                    type="number"
                    value={refundAmount}
                    onChange={(e) =>
                      setRefundAmount(
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                    min={0}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("adminReturns.currency")}
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
                  >
                    <option value="VND">VND</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("adminReturns.warehouseOptional")}
                </label>
                <input
                  type="text"
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </>
          )}

          {dialog.kind === "reject" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("adminReturns.rejectReasonRequired")}
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          )}

          {dialog.kind === "received" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("adminReturns.conditionRequiredLabel")}
              </label>
              <textarea
                value={itemCondition}
                onChange={(e) => setItemCondition(e.target.value)}
                rows={3}
                placeholder={t("adminReturns.conditionPlaceholder")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={closeDialog}
              disabled={isMutating}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant={dialog.kind === "reject" ? "danger" : "primary"}
              onClick={submitDialog}
              loading={isMutating}
            >
              {t("common.confirm")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function AdminOrderReturnsPage() {
  return (
    <AuthGuard requiredRoles={["SYSTEM_ADMIN", "CS_ADMIN"]}>
      <AdminOrderReturnsInner />
    </AuthGuard>
  );
}
