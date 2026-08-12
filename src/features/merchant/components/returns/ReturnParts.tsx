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
  REQUESTED: "merchant.returns.statusRequested",
  APPROVED: "merchant.returns.statusApproved",
  ITEM_RECEIVED: "merchant.returns.statusReceived",
  REJECTED: "merchant.returns.statusRejected",
  REFUNDED: "merchant.returns.statusRefunded",
  CANCELLED: "merchant.returns.statusCancelled",
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
    <div className="bg-white rounded-md border border-gray-400 overflow-hidden">
      <div className="p-5 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant={variant}>{statusLabel}</Badge>
            <span className="text-xs text-gray-400">
              {formatDateTime(rtn.createdAt)}
            </span>
          </div>
          <p className="text-xs text-gray-500 font-mono mb-2">
            {t("merchant.returns.returnLabel")}: {rtn.returnId}
          </p>
          <p className="text-sm text-gray-900 mb-2">
            <span className="text-gray-500">
              {t("merchant.returns.customerReason")}
            </span>{" "}
            {rtn.reason}
          </p>
          {rtn.evidenceUrl && (
            <a
              href={rtn.evidenceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 mb-2"
            >
              {t("merchant.returns.viewEvidence")}
              <ExternalLink size={12} />
            </a>
          )}
          {rtn.rejectReason && (
            <p className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2 mt-2">
              <span className="font-medium">
                {t("merchant.returns.rejectReasonLabel")}
              </span>{" "}
              {rtn.rejectReason}
            </p>
          )}
          {rtn.refundAmount != null && rtn.currency && (
            <p className="text-sm text-gray-700 mt-2">
              {t("merchant.returns.refundAmountLabel")}{" "}
              <span className="font-medium">
                {formatCurrency(rtn.refundAmount, rtn.currency)}
              </span>
            </p>
          )}
          {rtn.itemCondition && (
            <p className="text-sm text-gray-700 mt-2">
              <span className="text-gray-500">
                {t("merchant.returns.itemConditionLabel")}
              </span>{" "}
              {rtn.itemCondition}
            </p>
          )}
          <p className="text-xs text-gray-500 mt-3 font-mono">
            {t("merchant.returns.orderLabel")}: {rtn.orderId}
          </p>
        </div>
        <div className="flex flex-col gap-2 flex-shrink-0">
          {rtn.status === "REQUESTED" && (
            <>
              <Button size="sm" onClick={onApprove}>
                <CheckCircle2 size={14} className="mr-1.5" />
                {t("merchant.returns.btnApprove")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onReject}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <XCircle size={14} className="mr-1.5" />
                {t("merchant.returns.btnReject")}
              </Button>
            </>
          )}
          {rtn.status === "APPROVED" && (
            <Button size="sm" onClick={onReceive}>
              <PackageCheck size={14} className="mr-1.5" />
              {t("merchant.returns.btnItemReceived")}
            </Button>
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
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:outline-none"
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
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm uppercase focus:border-blue-500 focus:outline-none"
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
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:outline-none"
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
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:outline-none"
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
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:outline-none"
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
