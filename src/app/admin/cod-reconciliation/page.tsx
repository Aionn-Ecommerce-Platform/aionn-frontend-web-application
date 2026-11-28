"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Coins, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button, Input, Modal } from "@/shared/ui";
import {
  AdminEmpty,
  AdminHeader,
  AdminPill,
  AdminTable,
  AdminTabs,
  adminPrimaryClass,
  adminRow,
  adminTd,
  adminTh,
} from "@/features/admin";
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
    <div className="min-h-screen">
      <AdminHeader
        icon={Coins}
        title={t("adminCod.title")}
        description={t("adminCod.description")}
      />

      <AdminTabs
        tabs={TABS.map((key) => ({
          value: key,
          label:
            key === "ALL" ? t("adminCod.statusAll") : t(statusLabelKey(key)),
        }))}
        value={tab}
        onChange={setTab}
      />

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-purple-300" size={28} />
        </div>
      ) : !data || data.length === 0 ? (
        <AdminEmpty
          icon={Coins}
          title={t("adminCod.empty")}
          description={t("adminCod.description")}
        />
      ) : (
        <AdminTable>
          <thead>
            <tr className="border-b border-slate-600/60 bg-white/[0.03]">
              <th className={adminTh}>{t("common.details")}</th>
              <th className={adminTh}>{t("adminCod.expected")}</th>
              <th className={adminTh}>{t("common.status")}</th>
              <th className={`${adminTh} text-right`}>{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.codId} className={adminRow}>
                <td className={adminTd}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-slate-400">
                      {row.orderId}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-200">
                    {t("adminCod.merchant")}:{" "}
                    <span className="font-mono">{row.merchantId}</span>
                  </p>
                  {row.trackingCode && (
                    <p className="mt-0.5 text-xs text-slate-400">
                      {t("adminCod.tracking")}: {row.trackingCode}
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-slate-500">
                    {formatDateTime(row.createdAt, locale)}
                  </p>
                </td>
                <td className={`${adminTd} whitespace-nowrap`}>
                  <p className="text-sm font-semibold text-white">
                    {formatCurrency(row.expectedAmount, row.currency, locale)}
                  </p>
                  {row.collectedAmount != null && (
                    <p className="mt-0.5 text-xs text-slate-400">
                      {t("adminCod.collected")}:{" "}
                      {formatCurrency(
                        row.collectedAmount,
                        row.currency,
                        locale,
                      )}
                    </p>
                  )}
                </td>
                <td className={adminTd}>
                  <AdminPill tone={statusVariant(row.status)}>
                    {t(statusLabelKey(row.status))}
                  </AdminPill>
                </td>
                <td className={`${adminTd} text-right`}>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/20 text-slate-200 hover:bg-white/10"
                    onClick={() => openReconcile(row)}
                  >
                    {t("adminCod.reconcileAction")}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      )}

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
                <span className="text-gray-500">{t("adminCod.expected")}:</span>{" "}
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
              className={adminPrimaryClass}
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
