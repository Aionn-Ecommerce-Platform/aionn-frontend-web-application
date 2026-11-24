"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Coins, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { Badge, Button, Input, Modal } from "@/shared/ui";
import AuthGuard from "@/components/auth/AuthGuard";
import { useTranslation } from "@/hooks";
import {
  adminCodReconciliationService,
  type CodReconciliation,
  type CodReconciliationStatus,
} from "@/lib/services/payout.service";
import { getErrorMessage } from "@/shared/lib/errors";
import { formatCurrency, formatDateTime } from "@/shared/lib/utils";

const TABS: Array<CodReconciliationStatus | "ALL"> = [
  "PENDING",
  "MISMATCH",
  "REMITTED",
  "ALL",
];

function statusVariant(status: CodReconciliationStatus) {
  if (status === "REMITTED") return "success";
  if (status === "MISMATCH") return "danger";
  return "warning";
}

function statusLabelKey(status: CodReconciliationStatus) {
  if (status === "REMITTED") return "adminCod.statusRemitted";
  if (status === "MISMATCH") return "adminCod.statusMismatch";
  return "adminCod.statusPending";
}

function AdminCodInner() {
  const { t, locale } = useTranslation();
  const qc = useQueryClient();
  const [tab, setTab] = useState<CodReconciliationStatus | "ALL">("PENDING");
  const [target, setTarget] = useState<CodReconciliation | null>(null);
  const [collected, setCollected] = useState("");
  const [carrierFee, setCarrierFee] = useState("");
  const [remittanceRef, setRemittanceRef] = useState("");
  const [note, setNote] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-cod-reconciliations", tab],
    queryFn: () =>
      adminCodReconciliationService.list(tab === "ALL" ? undefined : tab),
  });

  const mutation = useMutation({
    mutationFn: () =>
      adminCodReconciliationService.reconcile(target!.codId, {
        collectedAmount: Number(collected),
        carrierFee: carrierFee ? Number(carrierFee) : undefined,
        remittanceRef: remittanceRef.trim() || undefined,
        note: note.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success(t("adminCod.reconcileSuccess"));
      setTarget(null);
      setCollected("");
      setCarrierFee("");
      setRemittanceRef("");
      setNote("");
      qc.invalidateQueries({ queryKey: ["admin-cod-reconciliations"] });
      qc.invalidateQueries({ queryKey: ["admin-payouts"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  function openReconcile(row: CodReconciliation) {
    setTarget(row);
    setCollected(String(row.expectedAmount));
    setCarrierFee(row.carrierFee != null ? String(row.carrierFee) : "");
    setRemittanceRef(row.remittanceRef ?? "");
    setNote(row.note ?? "");
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
            <Coins size={22} className="text-blue-600" />
            {t("adminCod.title")}
          </h1>
          <p className="text-sm text-gray-500">{t("adminCod.description")}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-1 inline-flex flex-wrap">
          {TABS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === key
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {key === "ALL"
                ? t("adminCod.statusAll")
                : t(statusLabelKey(key))}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="py-16 flex justify-center">
              <Loader2 className="animate-spin text-blue-600" size={28} />
            </div>
          ) : !data || data.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400">
              {t("adminCod.empty")}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {data.map((row) => (
                <div
                  key={row.codId}
                  className="px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={statusVariant(row.status)}>
                        {t(statusLabelKey(row.status))}
                      </Badge>
                      <span className="font-mono text-xs text-gray-500">
                        {row.orderId}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">
                      {t("adminCod.merchant")}:{" "}
                      <span className="font-mono">{row.merchantId}</span>
                    </p>
                    {row.trackingCode && (
                      <p className="text-xs text-gray-500">
                        {t("adminCod.tracking")}: {row.trackingCode}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      {t("adminCod.expected")}:{" "}
                      {formatCurrency(
                        row.expectedAmount,
                        row.currency,
                        locale,
                      )}
                      {row.collectedAmount != null && (
                        <>
                          {" · "}
                          {t("adminCod.collected")}:{" "}
                          {formatCurrency(
                            row.collectedAmount,
                            row.currency,
                            locale,
                          )}
                        </>
                      )}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatDateTime(row.createdAt, locale)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openReconcile(row)}
                    >
                      {t("adminCod.reconcileAction")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={target !== null}
        onClose={() => setTarget(null)}
        title={t("adminCod.modalTitle")}
        size="md"
      >
        <div className="space-y-4">
          {target && (
            <div className="rounded-lg bg-gray-50 p-3 text-sm space-y-1">
              <p className="font-mono text-xs text-gray-500">
                {target.orderId}
              </p>
              <p>
                <span className="text-gray-500">
                  {t("adminCod.expected")}:
                </span>{" "}
                <strong>
                  {formatCurrency(
                    target.expectedAmount,
                    target.currency,
                    locale,
                  )}
                </strong>
              </p>
            </div>
          )}
          <Input
            label={t("adminCod.collectedLabel")}
            type="number"
            min="0"
            value={collected}
            onChange={(e) => setCollected(e.target.value)}
          />
          <Input
            label={t("adminCod.feeLabel")}
            type="number"
            min="0"
            value={carrierFee}
            onChange={(e) => setCarrierFee(e.target.value)}
          />
          <Input
            label={t("adminCod.remittanceRefLabel")}
            value={remittanceRef}
            onChange={(e) => setRemittanceRef(e.target.value)}
          />
          <Input
            label={t("adminCod.noteLabel")}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setTarget(null)}>
              {t("adminCod.cancel")}
            </Button>
            <Button
              loading={mutation.isPending}
              disabled={!collected || Number(collected) < 0}
              onClick={() => mutation.mutate()}
            >
              {t("adminCod.confirm")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function AdminCodReconciliationPage() {
  return (
    <AuthGuard requiredRoles={["SYSTEM_ADMIN"]}>
      <AdminCodInner />
    </AuthGuard>
  );
}
