"use client";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Check, Eye, ExternalLink, PackageCheck, X } from "lucide-react";
import toast from "react-hot-toast";
import { Button, Badge, Modal } from "@/shared/ui";
import { orderReturnService } from "@/lib/services";
import { getErrorMessage } from "@/shared/lib/errors";
import { formatDateTime, formatCurrency } from "@/shared/lib/utils";
import { useTranslation } from "@/hooks";
import {
  returnReasonBadgeClass,
  returnReasonLabelKey,
} from "@/lib/domain/return-reasons";
import type { OrderReturn, ReturnReasonType, ReturnStatus } from "@/types";

const statusVariant: Record<
  ReturnStatus,
  "default" | "info" | "success" | "warning" | "danger"
> = {
  REQUESTED: "warning",
  APPROVED: "info",
  ITEM_RECEIVED: "success",
  REJECTED: "danger",
  REFUNDED: "success",
  CANCELLED: "default",
};

const statusBadgeClass: Record<ReturnStatus, string> = {
  REQUESTED: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  APPROVED: "border-sky-400/30 bg-sky-400/10 text-sky-300",
  ITEM_RECEIVED: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  REJECTED: "border-rose-400/30 bg-rose-400/10 text-rose-300",
  REFUNDED: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  CANCELLED: "border-slate-500/40 bg-white/5 text-slate-300",
};

const reasonBadgeClass: Record<ReturnReasonType, string> = {
  WRONG_ITEM: "border-blue-400/30 bg-blue-400/10 text-blue-300",
  DAMAGED: "border-rose-400/30 bg-rose-400/10 text-rose-300",
  DEFECTIVE: "border-rose-400/30 bg-rose-400/10 text-rose-300",
  NOT_AS_DESCRIBED: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  MISSING_PARTS: "border-purple-400/30 bg-purple-400/10 text-purple-300",
  WRONG_SIZE: "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
  LATE_DELIVERY: "border-orange-400/30 bg-orange-400/10 text-orange-300",
  CHANGED_MIND: "border-slate-500/40 bg-white/5 text-slate-300",
  OTHER: "border-slate-500/40 bg-white/5 text-slate-300",
};

const statusLabelKey: Record<ReturnStatus, string> = {
  REQUESTED: "merchant.returns.status.requested",
  APPROVED: "merchant.returns.status.approved",
  ITEM_RECEIVED: "merchant.returns.status.itemReceived",
  REJECTED: "merchant.returns.status.rejected",
  REFUNDED: "merchant.returns.status.refunded",
  CANCELLED: "merchant.returns.status.cancelled",
};
export function ReturnRow({
  rtn,
  onApprove,
  onReject,
  onReceive,
  onDetail,
}: {
  rtn: OrderReturn;
  onApprove: () => void;
  onReject: () => void;
  onReceive: () => void;
  onDetail: () => void;
}) {
  const { t, locale } = useTranslation();
  const statusLabel = t(statusLabelKey[rtn.status]);

  return (
    <tr className="border-b border-slate-600/60 transition-colors last:border-0 hover:bg-white/[0.04]">
      <td className="px-4 py-3 text-center">
        <p className="font-mono text-xs font-semibold text-slate-200">
          {rtn.returnId}
        </p>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-center text-xs text-slate-300">
        {formatDateTime(rtn.requestedAt, locale)}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-center">
        <span
          className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${reasonBadgeClass[rtn.reasonType]}`}
        >
          {t(returnReasonLabelKey(rtn.reasonType))}
        </span>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-center text-sm font-semibold text-white">
        {rtn.refundAmount != null && rtn.currency
          ? formatCurrency(rtn.refundAmount, rtn.currency, locale)
          : "—"}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-center">
        <span
          className={`inline-flex items-center whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold ${statusBadgeClass[rtn.status]}`}
        >
          {statusLabel}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-center gap-1">
          {rtn.status === "REQUESTED" && (
            <>
              <button
                type="button"
                onClick={onApprove}
                className="rounded-lg p-1.5 text-emerald-400 transition-colors hover:bg-emerald-500/10 hover:text-emerald-300"
                title={t("merchant.returns.btnApprove")}
                aria-label={t("merchant.returns.btnApprove")}
              >
                <Check size={15} />
              </button>
              <button
                type="button"
                onClick={onReject}
                className="rounded-lg p-1.5 text-rose-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
                title={t("merchant.returns.btnReject")}
                aria-label={t("merchant.returns.btnReject")}
              >
                <X size={15} />
              </button>
            </>
          )}
          {rtn.status === "APPROVED" && (
            <button
              type="button"
              onClick={onReceive}
              className="rounded-lg p-1.5 text-emerald-400 transition-colors hover:bg-emerald-500/10 hover:text-emerald-300"
              title={t("merchant.returns.btnItemReceived")}
              aria-label={t("merchant.returns.btnItemReceived")}
            >
              <PackageCheck size={15} />
            </button>
          )}
          <button
            type="button"
            onClick={onDetail}
            className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
            title={t("merchant.returns.btnDetail")}
            aria-label={t("merchant.returns.btnDetail")}
          >
            <Eye size={15} />
          </button>
        </div>
      </td>
    </tr>
  );
}

export function ReturnDetailModal({
  rtn,
  onClose,
}: {
  rtn: OrderReturn;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const evidence = rtn.evidenceUrls?.length
    ? rtn.evidenceUrls
    : rtn.evidenceUrl
      ? [rtn.evidenceUrl]
      : [];

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={t("merchant.returns.detailTitle")}
      size="lg"
    >
      <div className="space-y-4 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={statusVariant[rtn.status]}>
            {t(statusLabelKey[rtn.status])}
          </Badge>
          <span className="text-xs text-gray-500">
            {formatDateTime(rtn.requestedAt)}
          </span>
        </div>

        <div className="space-y-2 rounded-lg bg-gray-50 p-4">
          <div className="flex justify-between gap-3">
            <span className="text-gray-500">
              {t("merchant.returns.returnLabel")}
            </span>
            <span className="break-all text-right font-mono text-xs text-gray-900">
              {rtn.returnId}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-gray-500">
              {t("merchant.returns.orderLabel")}
            </span>
            <span className="break-all text-right font-mono text-xs text-gray-900">
              {rtn.orderId}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-gray-500">
              {t("merchant.returns.detailCustomer")}
            </span>
            <span className="break-all text-right font-mono text-xs text-gray-900">
              {rtn.userId}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-gray-500">
              {t("merchant.returns.detailReasonType")}
            </span>
            <Badge
              variant="info"
              className={returnReasonBadgeClass(rtn.reasonType)}
            >
              {t(returnReasonLabelKey(rtn.reasonType))}
            </Badge>
          </div>
          <div>
            <p className="text-gray-500">
              {t("merchant.returns.customerReason")}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-gray-900">
              {rtn.reason}
            </p>
          </div>
          {evidence.length > 0 && (
            <div>
              <p className="text-gray-500">
                {t("merchant.returns.detailEvidence")}
              </p>
              <div className="mt-1 flex flex-wrap gap-3">
                {evidence.map((url, index) => (
                  <a
                    key={`${url}-${index}`}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
                  >
                    {t("merchant.returns.viewEvidence")}
                    <ExternalLink size={12} />
                  </a>
                ))}
              </div>
            </div>
          )}
          {rtn.refundAmount != null && rtn.currency && (
            <div className="flex justify-between gap-3">
              <span className="text-gray-500">
                {t("merchant.returns.refundAmountLabel")}
              </span>
              <span className="font-semibold text-gray-900">
                {formatCurrency(rtn.refundAmount, rtn.currency)}
              </span>
            </div>
          )}
          {rtn.itemCondition && (
            <div>
              <p className="text-gray-500">
                {t("merchant.returns.itemConditionLabel")}
              </p>
              <p className="mt-1 text-gray-900">{rtn.itemCondition}</p>
            </div>
          )}
          {rtn.rejectionReason && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-800">
              <span className="font-medium">
                {t("merchant.returns.rejectReasonLabel")}
              </span>{" "}
              {rtn.rejectionReason}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            {t("merchant.returns.btnCancel")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function ApproveModal({
  rtn,
  onClose,
  onSuccess,
}: {
  rtn: OrderReturn;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const [refundAmount, setRefundAmount] = useState("");
  const [currency, setCurrency] = useState("VND");
  const [warehouseId, setWarehouseId] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      orderReturnService.approve(rtn.returnId, {
        refundAmount: Number(refundAmount),
        currency,
        returnWarehouseId: warehouseId.trim() || null,
      }),
    onSuccess: () => {
      toast.success(t("merchant.returns.toastApproved"));
      onSuccess();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={t("merchant.returns.approveModalTitle")}
    >
      <div className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-1">
          <div>
            <Badge
              variant="info"
              className={returnReasonBadgeClass(rtn.reasonType)}
            >
              {t(returnReasonLabelKey(rtn.reasonType))}
            </Badge>
          </div>
          <p className="text-gray-700">
            <span className="text-gray-500">
              {t("merchant.returns.reasonLabel")}
            </span>{" "}
            {rtn.reason}
          </p>
          <p className="text-gray-700">
            <span className="text-gray-500">
              {t("merchant.returns.orderLabel")}:
            </span>{" "}
            <span className="font-mono">{rtn.orderId}</span>
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t("merchant.returns.fieldRefundAmount")}
            </label>
            <input
              type="number"
              min="0"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t("merchant.returns.fieldCurrency")}
            </label>
            <input
              type="text"
              maxLength={3}
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm uppercase focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            {t("merchant.returns.fieldWarehouse")}
          </label>
          <input
            type="text"
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            placeholder="WH_..."
            className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
          <p className="text-xs text-gray-400 mt-1">
            {t("merchant.returns.warehouseHint")}
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            {t("merchant.returns.btnCancel")}
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={!refundAmount || Number(refundAmount) < 0}
          >
            {t("merchant.returns.btnApprove")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function RejectModal({
  rtn,
  onClose,
  onSuccess,
}: {
  rtn: OrderReturn;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");

  const mutation = useMutation({
    mutationFn: () => orderReturnService.reject(rtn.returnId, reason.trim()),
    onSuccess: () => {
      toast.success(t("merchant.returns.toastRejected"));
      onSuccess();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={t("merchant.returns.rejectModalTitle")}
    >
      <div className="space-y-4">
        <p className="text-xs text-gray-600">
          {t("merchant.returns.rejectHint")}
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          placeholder={t("merchant.returns.rejectPlaceholder")}
          className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            {t("merchant.returns.btnCancel")}
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={!reason.trim()}
            className="bg-red-600 hover:bg-red-700"
          >
            {t("merchant.returns.btnReject")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function ReceiveModal({
  rtn,
  onClose,
  onSuccess,
}: {
  rtn: OrderReturn;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const [condition, setCondition] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      orderReturnService.confirmItemReceived(rtn.returnId, condition.trim()),
    onSuccess: () => {
      toast.success(t("merchant.returns.toastReceived"));
      onSuccess();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={t("merchant.returns.receiveModalTitle")}
    >
      <div className="space-y-4">
        <p className="text-xs text-gray-600">
          {t("merchant.returns.receiveHint")}
        </p>
        <textarea
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
          rows={4}
          placeholder={t("merchant.returns.receivePlaceholder")}
          className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            {t("merchant.returns.btnCancel")}
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={!condition.trim()}
          >
            {t("merchant.returns.btnConfirm")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
