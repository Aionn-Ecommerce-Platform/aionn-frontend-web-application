"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Wallet,
  CreditCard,
  Loader2,
  Plus,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button, Modal, Input, Badge } from "@/shared/ui";
import AuthGuard from "@/components/auth/AuthGuard";
import { useTranslation } from "@/hooks";
import {
  merchantPayoutService,
  stripeConnectService,
  type MerchantPayout,
  type PayoutStatus,
} from "@/lib/services/payout.service";
import { merchantService } from "@/lib/services";
import { getErrorMessage } from "@/shared/lib/errors";
import { getPayoutStatus } from "@/lib/domain/status/payout";
import { formatCurrency, formatDateTime } from "@/shared/lib/utils";

const PAYOUT_STATUS_ICON: Record<PayoutStatus, typeof Clock> = {
  PENDING: Clock,
  PROCESSING: Loader2,
  COMPLETED: CheckCircle2,
  FAILED: XCircle,
};

function MerchantPayoutsInner() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [requestOpen, setRequestOpen] = useState(false);
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

  const { data: merchant } = useQuery({
    queryKey: ["merchant", "me"],
    queryFn: () => merchantService.getMine(),
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
      qc.invalidateQueries({ queryKey: ["merchant-balance"] });
      qc.invalidateQueries({ queryKey: ["merchant-payouts"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const stripeOnboardMutation = useMutation({
    mutationFn: () => stripeConnectService.getOnboardingLink(),
    onSuccess: (res) => {
      window.location.href = res.url;
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

  const merchantWithStripe = merchant as typeof merchant & {
    stripeAccountId?: string | null;
    stripeChargesEnabled?: boolean;
    stripePayoutsEnabled?: boolean;
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
            <Wallet size={22} className="text-blue-600" />
            {t("merchant.payouts.title")}
          </h1>
          <p className="text-sm text-gray-500">
            {t("merchant.payouts.description")}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <Clock size={14} />
              {t("merchant.payouts.pendingLabel")}
            </div>
            {loadingBalance ? (
              <Loader2 className="animate-spin text-gray-400" size={20} />
            ) : (
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(pending, balance?.currency ?? "VND")}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              {t("merchant.payouts.pendingHint")}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-6">
            <div className="flex items-center gap-2 text-sm text-green-700 mb-2">
              <CheckCircle2 size={14} />
              {t("merchant.payouts.availableLabel")}
            </div>
            {loadingBalance ? (
              <Loader2 className="animate-spin text-gray-400" size={20} />
            ) : (
              <p className="text-2xl font-bold text-green-700">
                {formatCurrency(available, balance?.currency ?? "VND")}
              </p>
            )}
            <p className="text-xs text-green-700/70 mt-1">
              {t("merchant.payouts.availableHint")}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                {t("merchant.payouts.stripeTitle")}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {t("merchant.payouts.stripeDesc")}
              </p>
            </div>
            {merchantWithStripe?.stripeAccountId ? (
              merchantWithStripe.stripeChargesEnabled &&
              merchantWithStripe.stripePayoutsEnabled ? (
                <Badge variant="success">
                  {t("merchant.payouts.stripeActive")}
                </Badge>
              ) : (
                <Badge variant="warning">
                  {t("merchant.payouts.stripeIncomplete")}
                </Badge>
              )
            ) : (
              <Badge variant="default">
                {t("merchant.payouts.stripeUnlinked")}
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => stripeOnboardMutation.mutate()}
            loading={stripeOnboardMutation.isPending}
          >
            <ExternalLink size={14} className="mr-1" />
            {merchantWithStripe?.stripeAccountId
              ? t("merchant.payouts.openStripeDashboard")
              : t("merchant.payouts.linkStripe")}
          </Button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <CreditCard size={16} className="text-blue-600" />
              {t("merchant.payouts.historyTitle")}
            </h2>
            <Button
              size="sm"
              onClick={() => setRequestOpen(true)}
              disabled={available <= 0}
            >
              <Plus size={14} className="mr-1" />
              {t("merchant.payouts.requestButton")}
            </Button>
          </div>

          {loadingPayouts ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="animate-spin text-blue-600" size={24} />
            </div>
          ) : !payouts || payouts.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">
              {t("merchant.payouts.emptyHistory")}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {payouts.map((p) => (
                <PayoutRow key={p.payoutId} payout={p} />
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={requestOpen}
        onClose={() => setRequestOpen(false)}
        title={t("merchant.payouts.modalTitle")}
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle size={14} className="text-blue-600 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-900">
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
    </div>
  );
}

function PayoutRow({ payout }: { payout: MerchantPayout }) {
  const { t } = useTranslation();
  const config = getPayoutStatus(payout.status);
  const Icon = PAYOUT_STATUS_ICON[payout.status];
  return (
    <div className="px-6 py-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 shrink-0">
          <Icon
            size={18}
            className={payout.status === "PROCESSING" ? "animate-spin" : ""}
          />
        </div>
        <div className="min-w-0">
          <p className="font-mono text-xs text-gray-500 truncate">
            {payout.payoutId}
          </p>
          <p className="text-sm text-gray-700 mt-0.5">
            {payout.bankName} · ****{payout.bankAccountNo?.slice(-4) ?? "—"}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {formatDateTime(payout.requestedAt, "vi-VN")}
          </p>
          {payout.failureReason && (
            <p className="text-xs text-red-600 mt-0.5">
              {payout.failureReason}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="font-bold text-gray-900">
          {formatCurrency(payout.amount, payout.currency)}
        </span>
        <Badge variant={config.variant}>{t(config.labelKey)}</Badge>
      </div>
    </div>
  );
}

export default function MerchantPayoutsPage() {
  return (
    <AuthGuard requiredRoles={["MERCHANT"]}>
      <MerchantPayoutsInner />
    </AuthGuard>
  );
}
