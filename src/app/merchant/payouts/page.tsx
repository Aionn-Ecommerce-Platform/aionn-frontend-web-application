"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Wallet,
  Loader2,
  Plus,
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { Badge, Button, Input, Modal, Pagination } from "@/shared/ui";
import AuthGuard from "@/components/auth/AuthGuard";
import { useTranslation } from "@/hooks";
import {
  merchantPayoutService,
  type MerchantPayout,
  type PayoutStatus,
} from "@/lib/services/payout.service";
import { getErrorMessage } from "@/shared/lib/errors";
import { getPayoutStatus } from "@/lib/domain/status/payout";
import { formatCurrency, formatDateTime } from "@/shared/lib/utils";
import {
  ConsoleEmptyState,
  ConsolePanel,
  ConsoleStatGrid,
} from "@/features/merchant";

const PAYOUT_PAGE_SIZE = 10;

const PAYOUT_BADGE_CLASS: Record<PayoutStatus, string> = {
  PENDING: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  PROCESSING: "border-sky-400/30 bg-sky-400/10 text-sky-300",
  COMPLETED: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  FAILED: "border-rose-400/30 bg-rose-400/10 text-rose-300",
  CANCELLED: "border-slate-500/40 bg-white/5 text-slate-300",
};

function MerchantPayoutsInner() {
  const { t, locale } = useTranslation();
  const qc = useQueryClient();
  const [requestOpen, setRequestOpen] = useState(false);
  const [detailPayout, setDetailPayout] = useState<MerchantPayout | null>(null);
  const [cancellingPayout, setCancellingPayout] =
    useState<MerchantPayout | null>(null);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({
    amount: "",
    bankName: "",
    bankAccountNo: "",
    bankAccountName: "",
    note: "",
  });

  const { data: balance, isLoading: loadingBalance } = useQuery({
    queryKey: ["merchant-balance", "VND"],
    queryFn: () => merchantPayoutService.getBalance("VND"),
  });

  const { data: payouts, isLoading: loadingPayouts } = useQuery({
    queryKey: ["merchant-payouts"],
    queryFn: () => merchantPayoutService.listMine(50),
  });

  const requestMutation = useMutation({
    mutationFn: () =>
      merchantPayoutService.request({
        amount: Number(form.amount),
        bankName: form.bankName.trim(),
        bankAccountNo: form.bankAccountNo.trim(),
        bankAccountName: form.bankAccountName.trim(),
        note: form.note.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success(t("merchant.payouts.toastRequested"));
      setRequestOpen(false);
      setForm({
        amount: "",
        bankName: "",
        bankAccountNo: "",
        bankAccountName: "",
        note: "",
      });
      setPage(1);
      qc.invalidateQueries({ queryKey: ["merchant-balance"] });
      qc.invalidateQueries({ queryKey: ["merchant-payouts"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const cancelMutation = useMutation({
    mutationFn: (payoutId: string) => merchantPayoutService.cancel(payoutId),
    onSuccess: () => {
      toast.success(t("merchant.payouts.toastCancelled"));
      setCancellingPayout(null);
      qc.invalidateQueries({ queryKey: ["merchant-balance"] });
      qc.invalidateQueries({ queryKey: ["merchant-payouts"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const available = balance?.available ?? 0;
  const pending = balance?.pending ?? 0;
  const canRequest =
    available > 0 &&
    Number(form.amount) > 0 &&
    Number(form.amount) <= available &&
    form.bankName.trim() &&
    form.bankAccountNo.trim() &&
    form.bankAccountName.trim();

  const currency = balance?.currency ?? "VND";
  const payoutStats = [
    {
      label: t("merchant.payouts.pendingLabel"),
      value: loadingBalance ? "…" : formatCurrency(pending, currency),
      icon: Clock,
      iconClass: "text-amber-300",
    },
    {
      label: t("merchant.payouts.availableLabel"),
      value: loadingBalance ? "…" : formatCurrency(available, currency),
      icon: CheckCircle2,
      iconClass: "text-emerald-300",
    },
  ];

  const totalPages = Math.max(
    1,
    Math.ceil((payouts?.length ?? 0) / PAYOUT_PAGE_SIZE),
  );
  const safePage = Math.min(page, totalPages);
  if (payouts && page > safePage) {
    setPage(safePage);
  }
  const visiblePayouts = (payouts ?? []).slice(
    (safePage - 1) * PAYOUT_PAGE_SIZE,
    safePage * PAYOUT_PAGE_SIZE,
  );

  return (
    <ConsolePanel>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
          <Wallet size={22} className="text-purple-300" />
          <span className="text-purple-300">{t("merchant.payouts.title")}</span>
        </h1>
        <button
          type="button"
          onClick={() => setRequestOpen(true)}
          disabled={available <= 0}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-purple-900/40 transition-all hover:from-purple-500 hover:to-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={16} />
          {t("merchant.payouts.requestButton")}
        </button>
      </div>

      <ConsoleStatGrid stats={payoutStats} columnsClassName="lg:grid-cols-2" />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-300">
          {t("merchant.payouts.historyTitle")}
        </p>
      </div>

      {loadingPayouts ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-purple-400" size={28} />
        </div>
      ) : visiblePayouts.length === 0 ? (
        <ConsoleEmptyState
          icon={Wallet}
          title={t("merchant.payouts.emptyHistory")}
          description={t("merchant.payouts.emptyHistoryDescription")}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-600 bg-white/[0.04]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-600/60 bg-white/[0.03]">
                  {[
                    "merchant.payouts.colPayout",
                    "merchant.payouts.colBank",
                    "merchant.payouts.colAmount",
                    "merchant.payouts.colStatus",
                    "merchant.payouts.colRequestedAt",
                    "merchant.payouts.colActions",
                  ].map((key) => (
                    <th
                      key={key}
                      className="whitespace-nowrap px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                    >
                      {t(key)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visiblePayouts.map((payout) => {
                  const config = getPayoutStatus(payout.status);
                  return (
                    <tr
                      key={payout.payoutId}
                      className="border-b border-slate-600/60 transition-colors last:border-0 hover:bg-white/[0.04]"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-center">
                        <p className="font-mono text-[13px] font-semibold text-white">
                          {payout.payoutId}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <p className="text-sm font-semibold text-slate-100">
                          {payout.bankName ?? "—"}
                        </p>
                        <p className="text-xs text-slate-400">
                          {payout.bankAccountNo
                            ? `****${payout.bankAccountNo.slice(-4)}`
                            : "—"}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center">
                        <p className="text-sm font-bold text-white">
                          {formatCurrency(payout.amount, payout.currency)}
                        </p>
                        {payout.failureReason && (
                          <p className="text-xs text-rose-300">
                            {payout.failureReason}
                          </p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold ${PAYOUT_BADGE_CLASS[payout.status]}`}
                        >
                          {t(config.labelKey)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center text-xs text-slate-300">
                        <p>{formatDateTime(payout.requestedAt, locale)}</p>
                        {payout.completedAt && (
                          <p className="text-slate-500">
                            {formatDateTime(payout.completedAt, locale)}
                          </p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center justify-center">
                          <button
                            type="button"
                            title={t("merchant.payouts.viewDetail")}
                            aria-label={t("merchant.payouts.viewDetail")}
                            onClick={() => setDetailPayout(payout)}
                            className="rounded-lg p-1.5 text-sky-300 transition-colors hover:text-sky-200"
                          >
                            <Eye size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination
        currentPage={safePage}
        totalPages={totalPages}
        onPageChange={setPage}
      />

      <Modal
        isOpen={requestOpen}
        onClose={() => setRequestOpen(false)}
        title={t("merchant.payouts.modalTitle")}
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-lg border border-brand/30 bg-brand/10 p-3">
            <AlertCircle size={14} className="mt-0.5 shrink-0 text-brand" />
            <p className="text-xs text-brand-strong">
              {t("merchant.payouts.availableNote", {
                amount: formatCurrency(available, "VND"),
              })}
            </p>
          </div>
          <Input
            type="number"
            label={t("merchant.payouts.amountLabel")}
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            placeholder="100000"
            min={0}
            max={available}
          />
          <Input
            label={t("merchant.payouts.bankNameLabel")}
            value={form.bankName}
            onChange={(e) => setForm({ ...form, bankName: e.target.value })}
            placeholder={t("merchant.payouts.bankNamePlaceholder")}
          />
          <Input
            label={t("merchant.payouts.accountNoLabel")}
            value={form.bankAccountNo}
            onChange={(e) =>
              setForm({ ...form, bankAccountNo: e.target.value })
            }
            placeholder="0123456789"
          />
          <Input
            label={t("merchant.payouts.accountNameLabel")}
            value={form.bankAccountName}
            onChange={(e) =>
              setForm({ ...form, bankAccountName: e.target.value })
            }
            placeholder="NGUYEN VAN A"
          />
          <Input
            label={t("merchant.payouts.noteLabel")}
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            placeholder={t("merchant.payouts.notePlaceholder")}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setRequestOpen(false)}>
              {t("merchant.payouts.cancel")}
            </Button>
            <Button
              loading={requestMutation.isPending}
              disabled={!canRequest}
              onClick={() => requestMutation.mutate()}
            >
              {t("merchant.payouts.submit")}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={cancellingPayout !== null}
        onClose={() => setCancellingPayout(null)}
        title={t("merchant.payouts.cancelModalTitle")}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {t("merchant.payouts.cancelModalConfirm")}
          </p>
          {cancellingPayout && (
            <div className="space-y-1 rounded-lg bg-gray-50 p-3 text-xs">
              <p>
                <span className="text-gray-500">
                  {t("merchant.payouts.colPayout")}:
                </span>{" "}
                <span className="font-mono">{cancellingPayout.payoutId}</span>
              </p>
              <p>
                <span className="text-gray-500">
                  {t("merchant.payouts.detailAmount")}:
                </span>{" "}
                <span className="font-semibold">
                  {formatCurrency(
                    cancellingPayout.amount,
                    cancellingPayout.currency,
                    locale,
                  )}
                </span>
              </p>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setCancellingPayout(null)}
              disabled={cancelMutation.isPending}
            >
              {t("merchant.payouts.cancelModalBack")}
            </Button>
            <Button
              onClick={() =>
                cancellingPayout &&
                cancelMutation.mutate(cancellingPayout.payoutId)
              }
              loading={cancelMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {t("merchant.payouts.cancelModalConfirmButton")}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={detailPayout !== null}
        onClose={() => setDetailPayout(null)}
        title={t("merchant.payouts.detailTitle")}
        size="full"
      >
        {detailPayout && (
          <div className="max-h-[80vh] space-y-6 overflow-y-auto pr-2 text-sm">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-gray-500">
                  {t("merchant.payouts.colPayout")}
                </p>
                <p className="mt-1 break-all font-mono text-sm font-semibold text-gray-900">
                  {detailPayout.payoutId}
                </p>
              </div>
              <div>
                <p className="text-gray-500">
                  {t("merchant.payouts.detailRequestedAt")}
                </p>
                <p className="mt-1 font-medium text-gray-900">
                  {formatDateTime(detailPayout.requestedAt, locale)}
                </p>
              </div>
              <div>
                <p className="text-gray-500">
                  {t("merchant.payouts.detailBank")}
                </p>
                <p className="mt-1 font-semibold text-gray-900">
                  {detailPayout.bankName ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-gray-500">
                  {t("merchant.payouts.detailAccountNo")}
                </p>
                <p className="mt-1 font-mono text-sm text-gray-900">
                  {detailPayout.bankAccountNo ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-gray-500">
                  {t("merchant.payouts.detailStatus")}
                </p>
                <Badge
                  variant={getPayoutStatus(detailPayout.status).variant}
                  className="!mt-1 !rounded-full !px-3 !py-1 !text-xs"
                >
                  {t(getPayoutStatus(detailPayout.status).labelKey)}
                </Badge>
              </div>
              <div>
                <p className="text-gray-500">
                  {t("merchant.payouts.detailAccountName")}
                </p>
                <p className="mt-1 font-medium text-gray-900">
                  {detailPayout.bankAccountName ?? "—"}
                </p>
              </div>
              {detailPayout.externalRef && (
                <div>
                  <p className="text-gray-500">
                    {t("merchant.payouts.detailExternalRef")}
                  </p>
                  <p className="mt-1 break-all font-mono text-sm text-gray-900">
                    {detailPayout.externalRef}
                  </p>
                </div>
              )}
              {detailPayout.completedAt && (
                <div>
                  <p className="text-gray-500">
                    {t("merchant.payouts.detailCompletedAt")}
                  </p>
                  <p className="mt-1 font-medium text-gray-900">
                    {formatDateTime(detailPayout.completedAt, locale)}
                  </p>
                </div>
              )}
              {detailPayout.failedAt && (
                <div>
                  <p className="text-gray-500">
                    {t("merchant.payouts.detailFailedAt")}
                  </p>
                  <p className="mt-1 font-medium text-gray-900">
                    {formatDateTime(detailPayout.failedAt, locale)}
                  </p>
                </div>
              )}
            </div>

            {detailPayout.note && (
              <div>
                <p className="mb-1 text-sm text-gray-500">
                  {t("merchant.payouts.detailNote")}
                </p>
                <p className="whitespace-pre-wrap text-sm text-gray-700">
                  {detailPayout.note}
                </p>
              </div>
            )}

            {detailPayout.failureReason && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                <span className="font-semibold">
                  {t("merchant.payouts.detailFailureReason")}:
                </span>{" "}
                {detailPayout.failureReason}
              </div>
            )}

            <div className="flex items-center justify-between border-t border-gray-300 pt-4">
              <span className="text-base font-bold text-gray-900">
                {t("merchant.payouts.detailAmount")}
              </span>
              <span className="text-base font-bold text-brand">
                {formatCurrency(
                  detailPayout.amount,
                  detailPayout.currency,
                  locale,
                )}
              </span>
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-gray-300 pt-4">
              {detailPayout.status === "PENDING" && (
                <Button
                  variant="danger"
                  onClick={() => {
                    setCancellingPayout(detailPayout);
                    setDetailPayout(null);
                  }}
                >
                  <XCircle size={14} className="mr-1.5" />
                  {t("merchant.payouts.cancelRequest")}
                </Button>
              )}
              <Button variant="outline" onClick={() => setDetailPayout(null)}>
                {t("merchant.payouts.close")}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </ConsolePanel>
  );
}

export default function MerchantPayoutsPage() {
  return (
    <AuthGuard requiredRoles={["MERCHANT"]}>
      <MerchantPayoutsInner />
    </AuthGuard>
  );
}
