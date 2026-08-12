"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  CreditCard,
  Search,
  Loader2,
  RefreshCcw,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  Button,
  Badge,
  EmptyState,
  Modal,
  DefinitionRow as Row,
} from "@/shared/ui";
import AuthGuard from "@/components/auth/AuthGuard";
import { paymentService } from "@/lib/services";
import { getPaymentStatus } from "@/lib/domain/status/payment";
import { getErrorMessage } from "@/shared/lib/errors";
import { formatDateTime, formatNumber } from "@/shared/lib/utils";
import { useTranslation } from "@/hooks";
import type { Payment } from "@/types";

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
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {t("adminPayments.title")}
        </h1>
        <p className="text-gray-500 text-sm mb-6">
          {t("adminPayments.description")}
        </p>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-md border border-gray-400 p-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("adminPayments.lookupPaymentId")}
            </label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
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
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:border-blue-500 focus:outline-none"
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

          <div className="bg-white rounded-md border border-gray-400 p-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("adminPayments.lookupOrderId")}
            </label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
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
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:border-blue-500 focus:outline-none"
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
          <div className="py-20 flex justify-center">
            <Loader2 className="animate-spin text-blue-600" size={28} />
          </div>
        ) : payments.length === 0 ? (
          <EmptyState
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
      </div>

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
    <div className="bg-white rounded-md border border-gray-400 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-400 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-gray-500 font-mono mb-1">
            {payment.paymentId}
          </p>
          <h3 className="text-base font-semibold text-gray-900">
            {formatNumber(payment.amount, locale)} {payment.currency}
            <span className="text-xs text-gray-500 ml-2">
              {t("adminPayments.viaGateway", { gateway: payment.gateway })}
            </span>
          </h3>
          {payment.refundedAmount > 0 && (
            <p className="text-xs text-amber-600 mt-1">
              {t("adminPayments.refunded", {
                amount: `${formatNumber(payment.refundedAmount, locale)} ${payment.currency}`,
              })}
            </p>
          )}
        </div>
        <Badge variant={status.variant}>{t(status.labelKey)}</Badge>
      </div>

      <dl className="divide-y divide-gray-50">
        <Row label="Order ID" value={payment.orderId} mono />
        <Row label="User ID" value={payment.userId} mono />
        <Row
          label={t("adminPayments.transaction")}
          value={payment.transactionNo ?? "—"}
          mono
        />
        <Row
          label={t("adminPayments.createdAt")}
          value={formatDateTime(payment.createdAt, locale)}
        />
        {payment.paidAt && (
          <Row
            label={t("adminPayments.paidAt")}
            value={formatDateTime(payment.paidAt, locale)}
          />
        )}
        {payment.errorReason && (
          <Row
            label={t("adminPayments.error")}
            value={
              <span className="text-red-600">
                {payment.errorCode ? `[${payment.errorCode}] ` : ""}
                {payment.errorReason}
              </span>
            }
          />
        )}
      </dl>

      {canRefund && (
        <div className="px-6 py-4 border-t border-gray-400 bg-gray-50 flex justify-end">
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
        <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-1">
          <p>
            <span className="text-gray-500">Payment:</span>{" "}
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
          <p className="font-medium text-gray-900">
            {t("adminPayments.refundableAmount", {
              amount: `${formatNumber(refundable, locale)} ${payment.currency}`,
            })}
          </p>
        </div>

        <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 p-3 rounded-lg">
          <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
          <p>{t("adminPayments.warning")}</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
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
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            {t("adminPayments.reason")}
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder={t("adminPayments.reasonPlaceholder")}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
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
