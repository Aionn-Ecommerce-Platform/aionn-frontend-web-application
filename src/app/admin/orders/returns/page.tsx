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
import { Button, Modal } from "@/shared/ui";
import {
  AdminEmpty,
  AdminHeader,
  AdminPill,
  AdminSelect,
  AdminStats,
  AdminTable,
  AdminTabs,
  adminPrimaryClass,
  adminRow,
  adminTd,
  adminTh,
} from "@/features/admin";
import AuthGuard from "@/components/auth/AuthGuard";
import { adminOrderReturnService } from "@/lib/services";
import { getErrorMessage } from "@/shared/lib/errors";
import { formatCurrency, formatDateTime } from "@/shared/lib/utils";
import type { OrderReturn, ReturnReasonType, ReturnStatus } from "@/types";
import { useTranslation } from "@/hooks";
import {
  RETURN_REASON_TYPES,
  returnReasonLabelKey,
} from "@/lib/domain/return-reasons";

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

const TONE = {
  default: "neutral",
  info: "info",
  success: "success",
  warning: "warning",
  danger: "danger",
} as const;

type DialogState =
  | { kind: "idle" }
  | { kind: "approve"; r: OrderReturn }
  | { kind: "reject"; r: OrderReturn }
  | { kind: "received"; r: OrderReturn };

function AdminOrderReturnsInner() {
  const { t, locale } = useTranslation();
  const qc = useQueryClient();
  const [tab, setTab] = useState<ReturnStatus>("REQUESTED");
  const [reasonFilter, setReasonFilter] = useState<"all" | ReturnReasonType>(
    "all",
  );
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
  const items = (data ?? []).filter(
    (item) => reasonFilter === "all" || item.reasonType === reasonFilter,
  );

  const { data: returnCounts } = useQuery({
    queryKey: ["admin-return-counts"],
    queryFn: async () => {
      const lists = await Promise.all(
        TABS.map((entry) =>
          adminOrderReturnService.listByStatus(entry.key, 100),
        ),
      );
      return TABS.reduce<Record<string, number>>((acc, entry, index) => {
        acc[entry.key] = lists[index]?.length ?? 0;
        return acc;
      }, {});
    },
  });

  function refresh() {
    qc.invalidateQueries({ queryKey: ["admin-returns"] });
    qc.invalidateQueries({ queryKey: ["admin-return-counts"] });
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
    <div className="min-h-screen">
      <AdminHeader
        icon={PackageX}
        title={t("adminReturns.title")}
        description={t("adminReturns.description")}
      />

      <AdminStats
        stats={TABS.map((entry) => ({
          label: t(entry.labelKey),
          value: returnCounts?.[entry.key] ?? 0,
          icon:
            entry.key === "ITEM_RECEIVED"
              ? PackageCheck
              : entry.key === "REJECTED"
                ? XCircle
                : entry.key === "APPROVED"
                  ? CheckCircle2
                  : PackageX,
          iconClass:
            entry.key === "ITEM_RECEIVED"
              ? "text-emerald-300"
              : entry.key === "REJECTED"
                ? "text-rose-300"
                : entry.key === "APPROVED"
                  ? "text-sky-300"
                  : "text-amber-300",
        }))}
      />

      <div className="flex flex-wrap items-start gap-3">
        <AdminTabs
          value={tab}
          onChange={setTab}
          tabs={TABS.map((tabOption) => ({
            value: tabOption.key,
            label: t(tabOption.labelKey),
          }))}
        />
        <AdminSelect
          value={reasonFilter}
          onChange={(value) =>
            setReasonFilter(value as "all" | ReturnReasonType)
          }
          ariaLabel={t("orders.returns.reasonType")}
          className="sm:ml-auto"
        >
          <option value="all">{t("orders.returns.allReasonTypes")}</option>
          {RETURN_REASON_TYPES.map((type) => (
            <option key={type} value={type}>
              {t(returnReasonLabelKey(type))}
            </option>
          ))}
        </AdminSelect>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-purple-300" size={28} />
        </div>
      ) : items.length === 0 ? (
        <AdminEmpty
          icon={PackageX}
          title={t("adminReturns.emptyTitle")}
          description={t("adminReturns.emptyDescription")}
        />
      ) : (
        <AdminTable>
          <thead>
            <tr className="border-b border-slate-600/60 bg-white/[0.03]">
              <th className={adminTh}>{t("common.info")}</th>
              <th className={adminTh}>{t("common.status")}</th>
              <th className={`${adminTh} text-right`}>{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => {
              const cfg = STATUS_CFG[r.status];
              return (
                <tr key={r.returnId} className={adminRow}>
                  <td className={adminTd}>
                    <span className="text-sm font-semibold text-white">
                      {r.returnId}
                    </span>
                    <p className="mb-2 mt-1 text-xs text-slate-400">
                      Order <span className="font-mono">{r.orderId}</span> ·
                      Buyer <span className="font-mono">{r.userId}</span> ·
                      Merchant <span className="font-mono">{r.merchantId}</span>
                    </p>
                    <div className="mb-1.5">
                      <AdminPill tone="info">
                        {t(returnReasonLabelKey(r.reasonType))}
                      </AdminPill>
                    </div>
                    <p className="text-sm text-slate-300">
                      {t("adminReturns.reason")}:{" "}
                      <span className="font-medium text-white">{r.reason}</span>
                    </p>
                    {r.refundAmount != null && r.currency && (
                      <p className="mt-1 text-sm text-slate-300">
                        {t("adminReturns.refund")}:{" "}
                        <span className="font-medium text-white">
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
                      <p className="mt-1 text-sm text-slate-300">
                        {t("adminReturns.itemCondition")}:{" "}
                        <span className="font-medium text-white">
                          {r.itemCondition}
                        </span>
                      </p>
                    )}
                    {r.rejectionReason && (
                      <p className="mt-1 text-sm text-rose-300">
                        {t("adminReturns.rejectReason", {
                          reason: r.rejectionReason,
                        })}
                      </p>
                    )}
                    {(r.evidenceUrls?.length
                      ? r.evidenceUrls
                      : r.evidenceUrl
                        ? [r.evidenceUrl]
                        : []
                    ).map((url, index) => (
                      <a
                        key={`${url}-${index}`}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mr-3 mt-2 inline-flex items-center gap-1 text-xs text-purple-300 hover:underline"
                      >
                        <ExternalLink size={12} />{" "}
                        {t("adminReturns.viewEvidence")}
                      </a>
                    ))}
                    <p className="mt-2 text-xs text-slate-400">
                      {t("adminReturns.createdAt", {
                        date: formatDateTime(r.requestedAt, locale),
                      })}
                    </p>
                  </td>
                  <td className={adminTd}>
                    <AdminPill tone={TONE[cfg.variant]}>
                      {t(cfg.labelKey)}
                    </AdminPill>
                  </td>
                  <td className={`${adminTd} text-right`}>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {r.status === "REQUESTED" && (
                        <>
                          <Button
                            size="sm"
                            className={adminPrimaryClass}
                            onClick={() => openDialog({ kind: "approve", r })}
                          >
                            <CheckCircle2 size={14} /> {t("common.approved")}
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
                            className={adminPrimaryClass}
                            onClick={() => openDialog({ kind: "received", r })}
                          >
                            <PackageCheck size={14} />{" "}
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
                  </td>
                </tr>
              );
            })}
          </tbody>
        </AdminTable>
      )}

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
                  <label className="mb-1 block text-sm font-medium text-gray-700">
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
                    className="w-full rounded-lg border border-gray-400 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    {t("adminReturns.currency")}
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full rounded-lg border border-gray-400 bg-white px-3 py-2 text-sm"
                  >
                    <option value="VND">VND</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {t("adminReturns.warehouseOptional")}
                </label>
                <input
                  type="text"
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  className="w-full rounded-lg border border-gray-400 px-3 py-2 text-sm"
                />
              </div>
            </>
          )}

          {dialog.kind === "reject" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t("adminReturns.rejectReasonRequired")}
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-gray-400 px-3 py-2 text-sm"
              />
            </div>
          )}

          {dialog.kind === "received" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t("adminReturns.conditionRequiredLabel")}
              </label>
              <textarea
                value={itemCondition}
                onChange={(e) => setItemCondition(e.target.value)}
                rows={3}
                placeholder={t("adminReturns.conditionPlaceholder")}
                className="w-full rounded-lg border border-gray-400 px-3 py-2 text-sm"
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
              className={
                dialog.kind === "reject" ? undefined : adminPrimaryClass
              }
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
