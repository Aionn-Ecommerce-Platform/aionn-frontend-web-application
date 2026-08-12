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
export function AdjustModal({
  item,
  onClose,
  onSuccess,
}: {
  item: InventoryItem;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const [qty, setQty] = useState("");
  const [type, setType] = useState("INBOUND");
  const [reason, setReason] = useState("");
  const mutation = useMutation({
    mutationFn: () =>
      inventoryService.manualAdjustment(item.skuId, item.warehouseId, {
        qty: Number(qty),
        type,
        reason: reason.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success(t("merchant.inventory.toastAdjustSuccess"));
      onSuccess();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={t("merchant.inventory.adjustModalTitle")}
    >
      <div className="space-y-4">
        <ItemHeader item={item} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t("merchant.inventory.adjustTypeLabel")}
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:border-blue-500 focus:outline-none"
            >
              <option value="INBOUND">
                {t("merchant.inventory.adjustInbound")}
              </option>
              <option value="OUTBOUND">
                {t("merchant.inventory.adjustOutbound")}
              </option>
              <option value="DAMAGED">
                {t("merchant.inventory.adjustDamaged")}
              </option>
              <option value="LOST">{t("merchant.inventory.adjustLost")}</option>
              <option value="RETURN_RESTOCK">
                {t("merchant.inventory.adjustReturnRestock")}
              </option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t("merchant.inventory.qtyLabel")}
            </label>
            <input
              type="number"
              min="1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            {t("merchant.inventory.reasonLabel")}
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder={t("merchant.inventory.reasonPlaceholder")}
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
            disabled={!qty || Number(qty) <= 0}
          >
            {t("merchant.inventory.applyBtn")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function AuditModal({
  item,
  onClose,
  onSuccess,
}: {
  item: InventoryItem;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const [actualQty, setActualQty] = useState(String(item.physicalQty));
  const mutation = useMutation({
    mutationFn: () =>
      inventoryService.auditInventory(item.skuId, item.warehouseId, {
        actualQty: Number(actualQty),
      }),
    onSuccess: () => {
      toast.success(t("merchant.inventory.toastAuditSuccess"));
      onSuccess();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const diff = Number(actualQty) - item.physicalQty;

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={t("merchant.inventory.auditModalTitle")}
    >
      <div className="space-y-4">
        <ItemHeader item={item} />
        <p className="text-xs text-gray-500">
          {t("merchant.inventory.auditHelp")}
        </p>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            {t("merchant.inventory.actualQtyLabel")}
          </label>
          <input
            type="number"
            min="0"
            value={actualQty}
            onChange={(e) => setActualQty(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:outline-none"
          />
          {actualQty !== "" && (
            <p
              className={`text-xs mt-1 ${
                diff === 0
                  ? "text-gray-500"
                  : diff > 0
                    ? "text-green-600"
                    : "text-red-600"
              }`}
            >
              {t("merchant.inventory.differenceLabel")} {diff > 0 ? "+" : ""}
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
            {t("merchant.inventory.cancelBtn")}
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={actualQty === ""}
          >
            {t("merchant.inventory.reconcileBtn")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
