"use client";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Button, Modal, Select } from "@/shared/ui";
import { inventoryService } from "@/lib/services";
import { getErrorMessage } from "@/shared/lib/errors";
import { useTranslation } from "@/hooks";
import type { InventoryItem } from "@/types";
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t("merchant.inventory.adjustTypeLabel")}
            </label>
            <Select
              value={type}
              onChange={setType}
              options={[
                {
                  value: "INBOUND",
                  label: t("merchant.inventory.adjustInbound"),
                },
                {
                  value: "OUTBOUND",
                  label: t("merchant.inventory.adjustOutbound"),
                },
                {
                  value: "DAMAGED",
                  label: t("merchant.inventory.adjustDamaged"),
                },
                { value: "LOST", label: t("merchant.inventory.adjustLost") },
                {
                  value: "RETURN_RESTOCK",
                  label: t("merchant.inventory.adjustReturnRestock"),
                },
              ]}
            />
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
              className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
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
            className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
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
            className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
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
