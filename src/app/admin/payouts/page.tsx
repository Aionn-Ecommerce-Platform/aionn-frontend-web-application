"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Wallet, Loader2, CheckCircle2, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { Button, Modal, Input, Badge } from "@/shared/ui";
import AuthGuard from "@/components/auth/AuthGuard";
import { useTranslation } from "@/hooks";
import {
  adminPayoutService,
  type MerchantPayout,
  type PayoutStatus,
} from "@/lib/services/payout.service";
import { getErrorMessage } from "@/shared/lib/errors";
import { getPayoutStatus } from "@/lib/domain/status/payout";
import { formatCurrency, formatDateTime } from "@/shared/lib/utils";

const TABS: PayoutStatus[] = ["PENDING", "PROCESSING", "COMPLETED", "FAILED"];

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

  const completeMutation = useMutation({
    mutationFn: ({ id, ref }: { id: string; ref: string }) =>
      adminPayoutService.complete(id, ref),
    onSuccess: () => {
      toast.success(t("adminPayouts.completedToast"));
      setCompleteTarget(null);
      setExternalRef("");
      qc.invalidateQueries({ queryKey: ["admin-payouts"] });
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
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
            <Wallet size={22} className="text-blue-600" />
            {t("adminPayouts.title")}
          </h1>
          <p className="text-sm text-gray-500">
            {t("adminPayouts.description")}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-1 inline-flex">
          {TABS.map((s) => (
            <button
              key={s}
              onClick={() => setActiveTab(s)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === s
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {t(getPayoutStatus(s).labelKey)}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-200">
          {isLoading ? (
            <div className="py-16 flex justify-center">
              <Loader2 className="animate-spin text-blue-600" size={28} />
            </div>
          ) : !payouts || payouts.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400">
              {t("adminPayouts.empty", {
                status: t(getPayoutStatus(activeTab).labelKey),
              })}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {payouts.map((p) => (
                <div
                  key={p.payoutId}
                  className="px-6 py-4 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-mono text-xs text-gray-500 truncate">
                        {p.payoutId}
                      </p>
                      <Badge variant={getPayoutStatus(p.status).variant}>
                        {t(getPayoutStatus(p.status).labelKey)}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-700">
                      {t("adminPayouts.merchant", { id: p.merchantId })}
                    </p>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {p.bankName} · {p.bankAccountNo} · {p.bankAccountName}
                    </p>
                    {p.note && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {t("adminPayouts.note", { note: p.note })}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {t("adminPayouts.requestedAt", {
                        date: formatDateTime(p.requestedAt, locale),
                      })}
                    </p>
                    {p.externalRef && (
                      <p className="text-xs text-green-600 mt-0.5">
                        {t("adminPayouts.transactionRef", {
                          ref: p.externalRef,
                        })}
                      </p>
                    )}
                    {p.failureReason && (
                      <p className="text-xs text-red-600 mt-0.5">
                        {t("adminPayouts.failureReason", {
                          reason: p.failureReason,
                        })}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-bold text-lg text-gray-900">
                      {formatCurrency(p.amount, p.currency, locale)}
                    </span>
                    {(p.status === "PENDING" || p.status === "PROCESSING") && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => setCompleteTarget(p)}
                        >
                          <CheckCircle2 size={14} className="mr-1" />
                          {t("adminPayouts.complete")}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setFailTarget(p)}
                        >
                          <XCircle size={14} className="mr-1 text-red-600" />
                          <span className="text-red-600">
                            {t("adminPayouts.reject")}
                          </span>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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
