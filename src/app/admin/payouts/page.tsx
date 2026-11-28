"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Wallet, Loader2, CheckCircle2, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { Button, Modal, Input } from "@/shared/ui";
import {
  AdminEmpty,
  AdminHeader,
  AdminPill,
  AdminStats,
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
  adminPayoutService,
  type MerchantPayout,
  type PayoutStatus,
} from "@/lib/services/payout.service";
import { getErrorMessage } from "@/shared/lib/errors";
import { merchantService } from "@/lib/services";
import { getPayoutStatus } from "@/lib/domain/status/payout";
import { formatCurrency, formatDateTime } from "@/shared/lib/utils";

const TABS: PayoutStatus[] = ["PENDING", "PROCESSING", "COMPLETED", "FAILED"];

function payoutTone(status: PayoutStatus) {
  const variant = getPayoutStatus(status).variant;
  return variant === "default" ? "neutral" : variant;
}

function AdminPayoutsInner() {
  const { t, locale } = useTranslation();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<PayoutStatus>("PENDING");
  const [completeTarget, setCompleteTarget] = useState<MerchantPayout | null>(
    null,
  );
  const [externalRef, setExternalRef] = useState("");
  const [failTarget, setFailTarget] = useState<MerchantPayout | null>(null);
  const [failReason, setFailReason] = useState("");

  const { data: payouts, isLoading } = useQuery({
    queryKey: ["admin-payouts", activeTab],
    queryFn: () => adminPayoutService.list(activeTab, 100),
  });

  const merchantIds = useMemo(
    () => [...new Set((payouts ?? []).map((item) => item.merchantId))],
    [payouts],
  );
  const { data: storeNames } = useQuery({
    queryKey: ["admin-payout-stores", merchantIds.join(",")],
    queryFn: async () => {
      const rows = await Promise.all(
        merchantIds.map((id) => merchantService.get(id).catch(() => null)),
      );
      return new Map(
        rows
          .filter((row): row is NonNullable<typeof row> => row !== null)
          .map((row) => [row.merchantId, row.name]),
      );
    },
    enabled: merchantIds.length > 0,
  });

  const { data: payoutCounts } = useQuery({
    queryKey: ["admin-payout-counts"],
    queryFn: async () => {
      const lists = await Promise.all(
        TABS.map((status) => adminPayoutService.list(status, 100)),
      );
      return TABS.reduce<Record<string, number>>((acc, status, index) => {
        acc[status] = lists[index]?.length ?? 0;
        return acc;
      }, {});
    },
  });

  const completeMutation = useMutation({
    mutationFn: ({ id, ref }: { id: string; ref: string }) =>
      adminPayoutService.complete(id, ref),
    onSuccess: () => {
      toast.success(t("adminPayouts.completedToast"));
      setCompleteTarget(null);
      setExternalRef("");
      qc.invalidateQueries({ queryKey: ["admin-payouts"] });
      qc.invalidateQueries({ queryKey: ["admin-payout-counts"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const failMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminPayoutService.fail(id, reason),
    onSuccess: () => {
      toast.success(t("adminPayouts.failedToast"));
      setFailTarget(null);
      setFailReason("");
      qc.invalidateQueries({ queryKey: ["admin-payouts"] });
      qc.invalidateQueries({ queryKey: ["admin-payout-counts"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <div className="min-h-screen">
      <AdminHeader
        icon={Wallet}
        title={t("adminPayouts.title")}
        description={t("adminPayouts.description")}
      />

      <AdminStats
        stats={TABS.map((status) => ({
          label: t(getPayoutStatus(status).labelKey),
          value: payoutCounts?.[status] ?? 0,
          icon:
            status === "COMPLETED"
              ? CheckCircle2
              : status === "FAILED"
                ? XCircle
                : Wallet,
          iconClass:
            status === "COMPLETED"
              ? "text-emerald-300"
              : status === "FAILED"
                ? "text-rose-300"
                : status === "PROCESSING"
                  ? "text-sky-300"
                  : "text-amber-300",
        }))}
      />

      <AdminTabs
        tabs={TABS.map((status) => ({
          value: status,
          label: t(getPayoutStatus(status).labelKey),
        }))}
        value={activeTab}
        onChange={setActiveTab}
      />

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-purple-300" size={28} />
        </div>
      ) : !payouts || payouts.length === 0 ? (
        <AdminEmpty
          icon={Wallet}
          title={t("adminPayouts.empty", {
            status: t(getPayoutStatus(activeTab).labelKey),
          })}
          description={t("adminPayouts.description")}
        />
      ) : (
        <AdminTable>
          <thead>
            <tr className="border-b border-slate-600/60 bg-white/[0.03]">
              <th className={adminTh}>{t("common.details")}</th>
              <th className={adminTh}>{t("adminPayouts.amount")}</th>
              <th className={adminTh}>{t("common.status")}</th>
              <th className={`${adminTh} text-right`}>{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {payouts.map((p) => (
              <tr key={p.payoutId} className={adminRow}>
                <td className={adminTd}>
                  <p className="truncate font-mono text-xs text-slate-400">
                    {p.payoutId}
                  </p>
                  <p className="mt-1 text-sm text-slate-200">
                    {t("adminPayouts.store", {
                      name: storeNames?.get(p.merchantId) ?? p.merchantId,
                    })}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-300">
                    {p.bankName} · {p.bankAccountNo} · {p.bankAccountName}
                  </p>
                  {p.note && (
                    <p className="mt-0.5 text-xs text-slate-400">
                      {t("adminPayouts.note", { note: p.note })}
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-slate-500">
                    {t("adminPayouts.requestedAt", {
                      date: formatDateTime(p.requestedAt, locale),
                    })}
                  </p>
                  {p.externalRef && (
                    <p className="mt-0.5 text-xs text-emerald-300">
                      {t("adminPayouts.transactionRef", {
                        ref: p.externalRef,
                      })}
                    </p>
                  )}
                  {p.failureReason && (
                    <p className="mt-0.5 text-xs text-rose-300">
                      {t("adminPayouts.failureReason", {
                        reason: p.failureReason,
                      })}
                    </p>
                  )}
                </td>
                <td
                  className={`${adminTd} whitespace-nowrap font-bold text-white`}
                >
                  {formatCurrency(p.amount, p.currency, locale)}
                </td>
                <td className={adminTd}>
                  <AdminPill tone={payoutTone(p.status)}>
                    {t(getPayoutStatus(p.status).labelKey)}
                  </AdminPill>
                </td>
                <td className={`${adminTd} text-right`}>
                  {(p.status === "PENDING" || p.status === "PROCESSING") && (
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        className={adminPrimaryClass}
                        onClick={() => setCompleteTarget(p)}
                      >
                        <CheckCircle2 size={14} />
                        {t("adminPayouts.complete")}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-rose-300 hover:bg-rose-500/10"
                        onClick={() => setFailTarget(p)}
                      >
                        <XCircle size={14} />
                        {t("adminPayouts.reject")}
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      )}

      <Modal
        isOpen={completeTarget !== null}
        onClose={() => {
          setCompleteTarget(null);
          setExternalRef("");
        }}
        title={t("adminPayouts.completeTitle")}
        size="md"
      >
        <div className="space-y-4">
          {completeTarget && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
              <p>
                <span className="text-gray-500">
                  {t("adminPayouts.amount")}
                </span>{" "}
                <strong>
                  {formatCurrency(
                    completeTarget.amount,
                    completeTarget.currency,
                    locale,
                  )}
                </strong>
              </p>
              <p>
                <span className="text-gray-500">{t("adminPayouts.bank")}</span>{" "}
                {completeTarget.bankName} · {completeTarget.bankAccountNo}
              </p>
              <p>
                <span className="text-gray-500">
                  {t("adminPayouts.accountName")}
                </span>{" "}
                {completeTarget.bankAccountName}
              </p>
            </div>
          )}
          <Input
            label={t("adminPayouts.bankReference")}
            value={externalRef}
            onChange={(e) => setExternalRef(e.target.value)}
            placeholder="FT24..."
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCompleteTarget(null)}>
              {t("adminPayouts.cancel")}
            </Button>
            <Button
              className={adminPrimaryClass}
              loading={completeMutation.isPending}
              disabled={!externalRef.trim()}
              onClick={() =>
                completeTarget &&
                completeMutation.mutate({
                  id: completeTarget.payoutId,
                  ref: externalRef.trim(),
                })
              }
            >
              {t("adminPayouts.confirmComplete")}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={failTarget !== null}
        onClose={() => {
          setFailTarget(null);
          setFailReason("");
        }}
        title={t("adminPayouts.failTitle")}
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900">
            {t("adminPayouts.failWarning")}
          </div>
          <Input
            label={t("adminPayouts.failureReasonLabel")}
            value={failReason}
            onChange={(e) => setFailReason(e.target.value)}
            placeholder={t("adminPayouts.failureReasonPlaceholder")}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setFailTarget(null)}>
              {t("adminPayouts.cancel")}
            </Button>
            <Button
              variant="danger"
              loading={failMutation.isPending}
              disabled={!failReason.trim()}
              onClick={() =>
                failTarget &&
                failMutation.mutate({
                  id: failTarget.payoutId,
                  reason: failReason.trim(),
                })
              }
            >
              {t("adminPayouts.confirmFailure")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function AdminPayoutsPage() {
  return (
    <AuthGuard requiredRoles={["SYSTEM_ADMIN"]}>
      <AdminPayoutsInner />
    </AuthGuard>
  );
}
