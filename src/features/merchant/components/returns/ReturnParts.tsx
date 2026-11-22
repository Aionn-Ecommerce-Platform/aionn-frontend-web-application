"use client";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  CheckCircle2,
  XCircle,
  PackageCheck,
  ExternalLink,
} from "lucide-react";
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
import type { OrderReturn, ReturnStatus } from "@/types";

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

const statusLabelKey: Record<ReturnStatus, string> = {
  REQUESTED: "merchant.returns.status.requested",
  APPROVED: "merchant.returns.status.approved",
  ITEM_RECEIVED: "merchant.returns.status.itemReceived",
  REJECTED: "merchant.returns.status.rejected",
  REFUNDED: "merchant.returns.status.refunded",
  CANCELLED: "merchant.returns.status.cancelled",
};
export function ReturnCard({
  rtn,
  onApprove,
  onReject,
  onReceive,
}: {
  rtn: OrderReturn;
  onApprove: () => void;
  onReject: () => void;
  onReceive: () => void;
}) {
  const { t } = useTranslation();
  const variant = statusVariant[rtn.status];
  const statusLabel = t(statusLabelKey[rtn.status]);

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-600 bg-white/[0.04]">
      <div className="flex items-start justify-between gap-4 p-5">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center gap-2">
            <Badge variant={variant}>{statusLabel}</Badge>
            <span className="text-xs text-slate-400">
              {formatDateTime(rtn.requestedAt)}
            </span>
          </div>
          <p className="mb-2 font-mono text-xs text-slate-400">
            {t("merchant.returns.returnLabel")}: {rtn.returnId}
          </p>
          <div className="mb-1.5">
            <Badge
              variant="info"
              className={returnReasonBadgeClass(rtn.reasonType)}
            >
              {t(returnReasonLabelKey(rtn.reasonType))}
            </Badge>
          </div>
          <p className="mb-2 text-sm text-slate-200">
            <span className="text-slate-400">
              {t("merchant.returns.customerReason")}
            </span>{" "}
            {rtn.reason}
          </p>
          {(rtn.evidenceUrls?.length
            ? rtn.evidenceUrls
            : rtn.evidenceUrl
              ? [rtn.evidenceUrl]
              : []
          ).map((url, index) => (
            <a
              key={`${url}-${index}`}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="mr-3 mb-2 inline-flex items-center gap-1 text-xs text-purple-300 hover:underline"
            >
              {t("merchant.returns.viewEvidence")}
              <ExternalLink size={12} />
            </a>
          ))}
          {rtn.rejectionReason && (
            <p className="mt-2 rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
              <span className="font-medium">
                {t("merchant.returns.rejectReasonLabel")}
              </span>{" "}
              {rtn.rejectionReason}
            </p>
          )}
          {rtn.refundAmount != null && rtn.currency && (
            <p className="mt-2 text-sm text-slate-300">
              {t("merchant.returns.refundAmountLabel")}{" "}
              <span className="font-semibold text-white">
                {formatCurrency(rtn.refundAmount, rtn.currency)}
              </span>
            </p>
          )}
          {rtn.itemCondition && (
            <p className="mt-2 text-sm text-slate-300">
              <span className="text-slate-400">
                {t("merchant.returns.itemConditionLabel")}
              </span>{" "}
              {rtn.itemCondition}
            </p>
          )}
          <p className="mt-3 font-mono text-xs text-slate-400">
            {t("merchant.returns.orderLabel")}: {rtn.orderId}
          </p>
        </div>
        <div className="flex flex-shrink-0 flex-col gap-2">
          {rtn.status === "REQUESTED" && (
            <>
              <button
                type="button"
                onClick={onApprove}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-purple-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-purple-500"
              >
                <CheckCircle2 size={14} />
                {t("merchant.returns.btnApprove")}
              </button>
              <button
                type="button"
                onClick={onReject}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-400/30 px-3 py-2 text-xs font-semibold text-rose-300 transition-colors hover:bg-rose-500/10"
              >
                <XCircle size={14} />
                {t("merchant.returns.btnReject")}
              </button>
            </>
          )}
          {rtn.status === "APPROVED" && (
            <button
              type="button"
              onClick={onReceive}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-purple-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-purple-500"
            >
              <PackageCheck size={14} />
              {t("merchant.returns.btnItemReceived")}
            </button>
          )}
        </div>
      </div>
    </div>
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
