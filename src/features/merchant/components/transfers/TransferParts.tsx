"use client";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Button, Modal } from "@/shared/ui";
import { stockTransferService } from "@/lib/services";
import { getErrorMessage } from "@/shared/lib/errors";
import { useTranslation } from "@/hooks";
import type { StockTransfer } from "@/types";
export function CreateTransferModal({
  warehouses,
  onClose,
  onSuccess,
}: {
  warehouses: { warehouseId: string; address: string | null }[];
  onClose: () => void;
  onSuccess: (saved: StockTransfer) => void;
}) {
  const { t } = useTranslation();
  const [fromWarehouseId, setFromWarehouseId] = useState("");
  const [toWarehouseId, setToWarehouseId] = useState("");
  const [skuId, setSkuId] = useState("");
  const [qty, setQty] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      stockTransferService.initiate({
        fromWarehouseId,
        toWarehouseId,
        skuId: skuId.trim(),
        qty: Number(qty),
      }),
    onSuccess: (saved) => {
      toast.success(t("merchant.transfers.toastCreated"));
      onSuccess(saved);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const submit = () => {
    if (!fromWarehouseId || !toWarehouseId) {
      toast.error(t("merchant.transfers.errorChooseWarehouses"));
      return;
    }
    if (fromWarehouseId === toWarehouseId) {
      toast.error(t("merchant.transfers.errorSameWarehouse"));
      return;
    }
    if (!skuId.trim()) {
      toast.error(t("merchant.transfers.errorSkuRequired"));
      return;
    }
    if (!qty || Number(qty) <= 0) {
      toast.error(t("merchant.transfers.errorQtyPositive"));
      return;
    }
    mutation.mutate();
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={t("merchant.transfers.createModalTitle")}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t("merchant.transfers.fromWarehouseLabel")}
            </label>
            <select
              value={fromWarehouseId}
              onChange={(e) => setFromWarehouseId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            >
              <option value="">
                {t("merchant.transfers.warehouseSelectPlaceholder")}
              </option>
              {warehouses.map((w) => (
                <option key={w.warehouseId} value={w.warehouseId}>
                  {w.address ?? w.warehouseId}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t("merchant.transfers.toWarehouseLabel")}
            </label>
            <select
              value={toWarehouseId}
              onChange={(e) => setToWarehouseId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            >
              <option value="">
                {t("merchant.transfers.warehouseSelectPlaceholder")}
              </option>
              {warehouses.map((w) => (
                <option key={w.warehouseId} value={w.warehouseId}>
                  {w.address ?? w.warehouseId}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            {t("merchant.transfers.skuLabel")}
          </label>
          <input
            type="text"
            value={skuId}
            onChange={(e) => setSkuId(e.target.value)}
            placeholder="SKU_..."
            className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm font-mono focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            {t("merchant.transfers.qtyLabel")}
          </label>
          <input
            type="number"
            min="1"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
          <p className="text-xs text-gray-400 mt-1">
            {t("merchant.transfers.qtyHelp")}
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            {t("merchant.transfers.cancelBtn")}
          </Button>
          <Button onClick={submit} loading={mutation.isPending}>
            {t("merchant.transfers.submitCreateBtn")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function CompleteModal({
  transfer,
  onClose,
  onSuccess,
}: {
  transfer: StockTransfer;
  onClose: () => void;
  onSuccess: (saved: StockTransfer) => void;
}) {
  const { t } = useTranslation();
  const [receivedQty, setReceivedQty] = useState(String(transfer.qty));

  const mutation = useMutation({
    mutationFn: () =>
      stockTransferService.complete(transfer.transferId, {
        receivedQty: Number(receivedQty),
      }),
    onSuccess: (saved) => {
      toast.success(t("merchant.transfers.toastCompleted"));
      onSuccess(saved);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const diff = Number(receivedQty) - transfer.qty;

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={t("merchant.transfers.completeModalTitle")}
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          {t("merchant.transfers.completeHelp", { qty: transfer.qty })}
        </p>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            {t("merchant.transfers.receivedQtyLabel")}
          </label>
          <input
            type="number"
            min="0"
            value={receivedQty}
            onChange={(e) => setReceivedQty(e.target.value)}
            className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
          {receivedQty !== "" && diff !== 0 && (
            <p
              className={`text-xs mt-1 ${
                diff > 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {t("merchant.transfers.differenceLabel")} {diff > 0 ? "+" : ""}
              {diff}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            {t("merchant.transfers.cancelBtn")}
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={!receivedQty || Number(receivedQty) < 0}
          >
            {t("merchant.transfers.completeBtn")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function CancelModal({
  transfer,
  onClose,
  onSuccess,
}: {
  transfer: StockTransfer;
  onClose: () => void;
  onSuccess: (saved: StockTransfer) => void;
}) {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      stockTransferService.cancel(transfer.transferId, {
        reason: reason.trim(),
      }),
    onSuccess: (saved) => {
      toast.success(t("merchant.transfers.toastCancelled"));
      onSuccess(saved);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={t("merchant.transfers.cancelModalTitle")}
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          {t("merchant.transfers.cancelHelp")}
        </p>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            {t("merchant.transfers.cancelReasonLabel")}
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            {t("merchant.transfers.backBtn")}
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={!reason.trim()}
            className="bg-red-600 hover:bg-red-700"
          >
            {t("merchant.transfers.cancelTransferBtn")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
