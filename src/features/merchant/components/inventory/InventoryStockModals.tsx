"use client";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Button, Modal } from "@/shared/ui";
import { inventoryService } from "@/lib/services";
import { getErrorMessage } from "@/shared/lib/errors";
import { useTranslation } from "@/hooks";
import type { InventoryItem } from "@/types";
import { ItemHeader } from "./InventoryControls";
export function InitModal({
  warehouseId,
  onClose,
  onSuccess,
}: {
  warehouseId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const [skuId, setSkuId] = useState("");
  const [initialQty, setInitialQty] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      inventoryService.initialize({
        skuId: skuId.trim(),
        warehouseId,
        initialQty: Number(initialQty),
      }),
    onSuccess: () => {
      toast.success(t("merchant.inventory.toastInitSuccess"));
      onSuccess();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={t("merchant.inventory.initModalTitle")}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            {t("merchant.inventory.skuIdLabel")}
          </label>
          <input
            type="text"
            value={skuId}
            onChange={(e) => setSkuId(e.target.value)}
            placeholder="SKU_..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            {t("merchant.inventory.initialQtyLabel")}
          </label>
          <input
            type="number"
            min="0"
            value={initialQty}
            onChange={(e) => setInitialQty(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            {t("merchant.inventory.cancelBtn")}
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={!skuId.trim() || initialQty === ""}
          >
            {t("merchant.inventory.initBtn")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function SafetyStockModal({
  item,
  onClose,
  onSuccess,
}: {
  item: InventoryItem;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const [value, setValue] = useState(String(item.safetyStockQty));
  const mutation = useMutation({
    mutationFn: () =>
      inventoryService.configureSafetyStock(item.skuId, item.warehouseId, {
        safetyStockQty: Number(value),
      }),
    onSuccess: () => {
      toast.success(t("merchant.inventory.toastSafetyUpdated"));
      onSuccess();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={t("merchant.inventory.safetyModalTitle")}
    >
      <div className="space-y-4">
        <ItemHeader item={item} />
        <p className="text-xs text-gray-500">
          {t("merchant.inventory.safetyHelp")}
        </p>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            {t("merchant.inventory.safetyLabel")}
          </label>
          <input
            type="number"
            min="0"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            {t("merchant.inventory.cancelBtn")}
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={Number(value) < 0}
          >
            {t("merchant.inventory.saveBtn")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function BatchModal({
  item,
  onClose,
  onSuccess,
}: {
  item: InventoryItem;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const [batchNo, setBatchNo] = useState(item.batchNo ?? "");
  const [expiryDate, setExpiryDate] = useState(item.expiryDate ?? "");
  const mutation = useMutation({
    mutationFn: () =>
      inventoryService.trackBatchAndExpiry(item.skuId, item.warehouseId, {
        batchNo: batchNo.trim(),
        expiryDate,
      }),
    onSuccess: () => {
      toast.success(t("merchant.inventory.toastBatchUpdated"));
      onSuccess();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={t("merchant.inventory.batchModalTitle")}
    >
      <div className="space-y-4">
        <ItemHeader item={item} />
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            {t("merchant.inventory.batchNoLabel")}
          </label>
          <input
            type="text"
            value={batchNo}
            onChange={(e) => setBatchNo(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            {t("merchant.inventory.expiryLabel")}
          </label>
          <input
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            {t("merchant.inventory.cancelBtn")}
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={!batchNo.trim() || !expiryDate}
          >
            {t("merchant.inventory.saveBtn")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
