"use client";

import { useState, type ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  CreditCard,
  Search,
  Loader2,
  RefreshCcw,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button, Modal } from "@/shared/ui";
import { AdminEmpty, AdminHeader, AdminPill } from "@/features/admin";
import AuthGuard from "@/components/auth/AuthGuard";
import { paymentService } from "@/lib/services";
import { getPaymentStatus } from "@/lib/domain/status/payment";
import { getErrorMessage } from "@/shared/lib/errors";
import { formatDateTime, formatNumber } from "@/shared/lib/utils";
import { useTranslation } from "@/hooks";
import type { Payment } from "@/types";

const PAYMENT_TONE = {
  default: "neutral",
  info: "info",
  success: "success",
  warning: "warning",
  danger: "danger",
} as const;

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-3 items-center gap-4 px-6 py-3">
      <dt className="text-xs uppercase text-slate-400">{label}</dt>
      <dd
        className={`col-span-2 text-sm text-slate-200 ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}

function AdminPaymentsInner() {
  const { t } = useTranslation();
  const [paymentId, setPaymentId] = useState("");
  const [orderId, setOrderId] = useState("");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [refundTarget, setRefundTarget] = useState<Payment | null>(null);

  const lookupByIdMutation = useMutation({
    mutationFn: (id: string) => paymentService.get(id.trim()),
    onSuccess: (data) => setPayments([data]),
    onError: (err) => {
      setPayments([]);
      toast.error(getErrorMessage(err));
    },
  });

  const lookupByOrderMutation = useMutation({
    mutationFn: (id: string) => paymentService.listByOrder(id.trim()),
    onSuccess: (data) => setPayments(data),
    onError: (err) => {
      setPayments([]);
      toast.error(getErrorMessage(err));
    },
  });

  return (
    <div className="min-h-screen">
      <AdminHeader
        icon={CreditCard}
        title={t("adminPayments.title")}
        description={t("adminPayments.description")}
      />

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-600/60 bg-white/[0.04] p-5">
          <label className="mb-2 block text-sm font-medium text-slate-300">
            {t("adminPayments.lookupPaymentId")}
          </label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                size={18}
              />
              <input
                type="text"
                placeholder="PAY_..."
                value={paymentId}
                onChange={(e) => setPaymentId(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && paymentId.trim()) {
                    lookupByIdMutation.mutate(paymentId);
                  }
                }}
                className="w-full rounded-xl border border-gray-500 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <Button
              onClick={() => lookupByIdMutation.mutate(paymentId)}
              loading={lookupByIdMutation.isPending}
              disabled={!paymentId.trim()}
            >
              {t("adminPayments.search")}
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-600/60 bg-white/[0.04] p-5">
          <label className="mb-2 block text-sm font-medium text-slate-300">
            {t("adminPayments.lookupOrderId")}
          </label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                size={18}
              />
              <input
                type="text"
                placeholder="ORD_..."
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && orderId.trim()) {
                    lookupByOrderMutation.mutate(orderId);
                  }
                }}
                className="w-full rounded-xl border border-gray-500 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <Button
              onClick={() => lookupByOrderMutation.mutate(orderId)}
              loading={lookupByOrderMutation.isPending}
              disabled={!orderId.trim()}
            >
              {t("adminPayments.search")}
            </Button>
          </div>
        </div>
      </div>

      {lookupByIdMutation.isPending || lookupByOrderMutation.isPending ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-purple-300" size={28} />
        </div>
      ) : payments.length === 0 ? (
        <AdminEmpty
          icon={CreditCard}
          title={t("adminPayments.emptyTitle")}
          description={t("adminPayments.emptyDescription")}
        />
      ) : (
        <div className="space-y-4">
          {payments.map((p) => (
            <PaymentCard
              key={p.paymentId}
              payment={p}
              onRefund={() => setRefundTarget(p)}
            />
          ))}
        </div>
      )}

      {refundTarget && (
        <RefundModal
          payment={refundTarget}
          onClose={() => setRefundTarget(null)}
          onSuccess={(updated) => {
            setPayments((prev) =>
              prev.map((p) =>
                p.paymentId === updated.paymentId ? updated : p,
              ),
            );
            setRefundTarget(null);
          }}
        />
      )}
    </div>
  );
}

function PaymentCard({
  payment,
  onRefund,
}: {
  payment: Payment;
  onRefund: () => void;
}) {
  const { t, locale } = useTranslation();
  const status = getPaymentStatus(payment.status);
  const refundable = payment.amount - payment.refundedAmount;
  const canRefund = payment.status === "PAID" && refundable > 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-600/60 bg-white/[0.04]">
      <div className="flex items-start justify-between gap-4 border-b border-slate-600/60 px-6 py-4">
        <div>
          <p className="mb-1 font-mono text-xs text-slate-400">
            {payment.paymentId}
          </p>
          <h3 className="text-base font-semibold text-white">
            {formatNumber(payment.amount, locale)} {payment.currency}
            <span className="ml-2 text-xs text-slate-400">
              {t("adminPayments.viaGateway", { gateway: payment.gateway })}
            </span>
          </h3>
          {payment.refundedAmount > 0 && (
            <p className="mt-1 text-xs text-amber-300">
              {t("adminPayments.refunded", {
                amount: `${formatNumber(payment.refundedAmount, locale)} ${payment.currency}`,
              })}
            </p>
          )}
        </div>
        <AdminPill tone={PAYMENT_TONE[status.variant]}>
          {t(status.labelKey)}
        </AdminPill>
      </div>

      <dl className="divide-y divide-white/5">
        <DetailRow label="Order ID" value={payment.orderId} mono />
        <DetailRow label="User ID" value={payment.userId} mono />
        <DetailRow
          label={t("adminPayments.transaction")}
          value={payment.transactionNo ?? "—"}
          mono
        />
        <DetailRow
          label={t("adminPayments.createdAt")}
          value={formatDateTime(payment.createdAt, locale)}
        />
        {payment.paidAt && (
          <DetailRow
            label={t("adminPayments.paidAt")}
            value={formatDateTime(payment.paidAt, locale)}
          />
        )}
        {payment.errorReason && (
          <DetailRow
            label={t("adminPayments.error")}
            value={
              <span className="text-rose-300">
                {payment.errorCode ? `[${payment.errorCode}] ` : ""}
                {payment.errorReason}
              </span>
            }
          />
        )}
      </dl>

      {canRefund && (
        <div className="flex justify-end border-t border-slate-600/60 px-6 py-4">
          <Button variant="outline" size="sm" onClick={onRefund}>
            <RefreshCcw size={14} className="mr-1.5" />
            {t("adminPayments.refundRemaining", {
              amount: `${formatNumber(refundable, locale)} ${payment.currency}`,
            })}
          </Button>
        </div>
      )}
    </div>
  );
}

function RefundModal({
  payment,
  onClose,
  onSuccess,
}: {
  payment: Payment;
  onClose: () => void;
  onSuccess: (updated: Payment) => void;
}) {
  const { t, locale } = useTranslation();
  const refundable = payment.amount - payment.refundedAmount;
  const [amount, setAmount] = useState(String(refundable));
  const [reason, setReason] = useState("");

  const refundMutation = useMutation({
    mutationFn: () =>
      paymentService.refund(payment.paymentId, {
        amount: Number(amount),
        currency: payment.currency,
        reason: reason.trim(),
      }),
    onSuccess: (data) => {
      toast.success(t("adminPayments.refundSuccess"));
      onSuccess(data);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const submit = () => {
    const n = Number(amount);
    if (Number.isNaN(n) || n <= 0) {
      toast.error(t("adminPayments.invalidAmount"));
      return;
    }
    if (n > refundable) {
      toast.error(t("adminPayments.exceedsRefundable"));
      return;
    }
    if (!reason.trim()) {
      toast.error(t("adminPayments.reasonRequired"));
      return;
    }
    refundMutation.mutate();
  };

  return (
    <Modal isOpen onClose={onClose} title={t("adminPayments.refundTitle")}>
      <div className="space-y-4">
        <div className="space-y-1 rounded-xl border border-slate-600/60 bg-white/[0.04] p-3 text-xs text-slate-300">
          <p>
            <span className="text-slate-400">Payment:</span>{" "}
            <span className="font-mono">{payment.paymentId}</span>
          </p>
          <p>
            {t("adminPayments.paidAmount", {
              amount: `${formatNumber(payment.amount, locale)} ${payment.currency}`,
            })}
          </p>
          <p>
            {t("adminPayments.refunded", {
              amount: `${formatNumber(payment.refundedAmount, locale)} ${payment.currency}`,
            })}
          </p>
          <p className="font-medium text-white">
            {t("adminPayments.refundableAmount", {
              amount: `${formatNumber(refundable, locale)} ${payment.currency}`,
            })}
          </p>
        </div>

        <div className="flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-200">
          <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
          <p>{t("adminPayments.warning")}</p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-300">
            {t("adminPayments.refundAmount", {
              currency: payment.currency,
            })}
          </label>
          <input
            type="number"
            min="0"
            max={refundable}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-xl border border-gray-500 bg-white/5 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-300">
            {t("adminPayments.reason")}
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder={t("adminPayments.reasonPlaceholder")}
            className="w-full rounded-xl border border-gray-500 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={refundMutation.isPending}
          >
            {t("adminPayments.cancel")}
          </Button>
          <Button
            onClick={submit}
            loading={refundMutation.isPending}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {t("adminPayments.confirm")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default function AdminPaymentsPage() {
  return (
    <AuthGuard requiredRoles={["SYSTEM_ADMIN", "CS_ADMIN"]}>
      <AdminPaymentsInner />
    </AuthGuard>
  );
}
