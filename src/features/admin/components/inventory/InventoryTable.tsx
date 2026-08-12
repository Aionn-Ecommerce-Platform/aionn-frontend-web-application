"use client";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Package, Lock, Unlock } from "lucide-react";
import toast from "react-hot-toast";
import { Button, Badge, EmptyState, Modal } from "@/shared/ui";
import { inventoryService } from "@/lib/services";
import { getErrorMessage } from "@/shared/lib/errors";
import { formatDateTime } from "@/shared/lib/utils";
import type { InventoryItem } from "@/types";
import { useTranslation } from "@/hooks";
export function InventoryTable({
  items,
  isLoading,
  page,
  hasMore,
  totalElements,
  onPageChange,
  qc,
  emptyHint,
}: {
  items: InventoryItem[];
  isLoading: boolean;
  page: number;
  hasMore: boolean;
  totalElements: number;
  onPageChange: (p: number) => void;
  qc: ReturnType<typeof useQueryClient>;
  emptyHint?: string;
}) {
  const { t, locale } = useTranslation();
  const [target, setTarget] = useState<InventoryItem | null>(null);
  const [reason, setReason] = useState("");

  const lockMutation = useMutation({
    mutationFn: (item: InventoryItem) =>
      inventoryService.emergencyLock(item.skuId, item.warehouseId, {
        reason: reason.trim(),
      }),
    onSuccess: () => {
      toast.success(t("adminInventory.lockSuccess"));
      qc.invalidateQueries({ queryKey: ["admin-inventory-low-stock"] });
      qc.invalidateQueries({ queryKey: ["admin-inventory-by-warehouse"] });
      qc.invalidateQueries({ queryKey: ["admin-inventory-by-sku"] });
      setTarget(null);
      setReason("");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const unlockMutation = useMutation({
    mutationFn: (item: InventoryItem) =>
      inventoryService.emergencyUnlock(item.skuId, item.warehouseId),
    onSuccess: () => {
      toast.success(t("adminInventory.unlockSuccess"));
      qc.invalidateQueries({ queryKey: ["admin-inventory-low-stock"] });
      qc.invalidateQueries({ queryKey: ["admin-inventory-by-warehouse"] });
      qc.invalidateQueries({ queryKey: ["admin-inventory-by-sku"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  if (isLoading) {
    return (
      <div className="py-20 flex justify-center">
        <Loader2 className="animate-spin text-blue-600" size={28} />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title={t("adminInventory.emptyTitle")}
        description={emptyHint ?? t("adminInventory.emptyDescription")}
      />
    );
  }

  return (
    <>
      <div className="bg-white rounded-md border border-gray-400 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-400 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                  SKU / Kho
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                  {t("adminInventory.physical")}
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                  {t("adminInventory.available")}
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                  {t("adminInventory.reserved")}
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                  Safety
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                  {t("common.status")}
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                  {t("common.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const lowStock = it.availableQty <= it.safetyStockQty;
                return (
                  <tr
                    key={`${it.skuId}-${it.warehouseId}`}
                    className="border-b border-gray-50 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3">
                      <p className="text-xs font-mono text-gray-900">
                        {it.skuId}
                      </p>
                      <p className="text-xs text-gray-500 font-mono">
                        {it.warehouseId}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900">
                      {it.physicalQty}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      <span
                        className={
                          lowStock
                            ? "text-red-600 font-medium"
                            : "text-gray-900"
                        }
                      >
                        {it.availableQty}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600">
                      {it.reservedQty}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600">
                      {it.safetyStockQty}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {it.locked ? (
                          <Badge variant="danger">Locked</Badge>
                        ) : lowStock ? (
                          <Badge variant="warning">
                            {t("adminInventory.runningLow")}
                          </Badge>
                        ) : (
                          <Badge variant="success">OK</Badge>
                        )}
                        {it.expiryDate && (
                          <span className="text-[11px] text-gray-500">
                            {t("adminInventory.expiry", {
                              date: formatDateTime(it.expiryDate, locale),
                            })}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {it.locked ? (
                        <Button
                          variant="outline"
                          size="sm"
                          loading={
                            unlockMutation.isPending &&
                            unlockMutation.variables?.skuId === it.skuId &&
                            unlockMutation.variables?.warehouseId ===
                              it.warehouseId
                          }
                          onClick={() => unlockMutation.mutate(it)}
                        >
                          <Unlock size={14} className="mr-1" />
                          {t("adminInventory.unlock")}
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setTarget(it)}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <Lock size={14} className="mr-1" />
                          {t("adminInventory.lock")}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {(page > 0 || hasMore) && (
          <div className="border-t border-gray-400 px-6 py-3 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {t("adminInventory.pagination", {
                count: totalElements,
                page: page + 1,
              })}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => onPageChange(Math.max(0, page - 1))}
              >
                {t("common.previous")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!hasMore}
                onClick={() => onPageChange(page + 1)}
              >
                {t("common.next")}
              </Button>
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={target !== null}
        onClose={() => {
          setTarget(null);
          setReason("");
        }}
        title={t("adminInventory.lockTitle")}
      >
        <div className="space-y-4">
          {target && (
            <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-1">
              <p>
                <span className="text-gray-500">SKU:</span>{" "}
                <span className="font-mono">{target.skuId}</span>
              </p>
              <p>
                <span className="text-gray-500">Kho:</span>{" "}
                <span className="font-mono">{target.warehouseId}</span>
              </p>
            </div>
          )}
          <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 p-3 rounded-lg">
            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
            <p>{t("adminInventory.lockWarning")}</p>
          </div>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("adminInventory.reasonPlaceholder")}
            rows={3}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setTarget(null);
                setReason("");
              }}
              disabled={lockMutation.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              loading={lockMutation.isPending}
              disabled={!reason.trim()}
              onClick={() => target && lockMutation.mutate(target)}
              className="bg-red-600 hover:bg-red-700"
            >
              {t("adminInventory.lockSku")}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
