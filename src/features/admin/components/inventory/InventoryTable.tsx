"use client";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Package, Lock, Unlock } from "lucide-react";
import toast from "react-hot-toast";
import { Button, Modal } from "@/shared/ui";
import {
  AdminEmpty,
  AdminPill,
  AdminTable,
  adminRow,
  adminTd,
  adminTh,
} from "@/features/admin";
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
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-purple-300" size={28} />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <AdminEmpty
        icon={Package}
        title={t("adminInventory.emptyTitle")}
        description={emptyHint ?? t("adminInventory.emptyDescription")}
      />
    );
  }

  return (
    <>
      <AdminTable>
        <thead>
          <tr className="border-b border-slate-600/60 bg-white/[0.03]">
            <th className={adminTh}>{t("merchant.inventory.colSku")}</th>
            <th className={`${adminTh} text-right`}>
              {t("adminInventory.physical")}
            </th>
            <th className={`${adminTh} text-right`}>
              {t("adminInventory.available")}
            </th>
            <th className={`${adminTh} text-right`}>
              {t("adminInventory.reserved")}
            </th>
            <th className={`${adminTh} text-right`}>
              {t("merchant.inventory.colSafety")}
            </th>
            <th className={adminTh}>{t("common.status")}</th>
            <th className={`${adminTh} text-right`}>{t("common.actions")}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => {
            const lowStock = it.availableQty <= it.safetyStockQty;
            return (
              <tr key={`${it.skuId}-${it.warehouseId}`} className={adminRow}>
                <td className={adminTd}>
                  <p className="font-mono text-xs text-slate-300">{it.skuId}</p>
                  <p className="font-mono text-xs text-slate-500">
                    {it.warehouseId}
                  </p>
                </td>
                <td className={`${adminTd} text-right`}>{it.physicalQty}</td>
                <td className={`${adminTd} text-right`}>
                  <span
                    className={
                      lowStock
                        ? "font-semibold text-rose-300"
                        : "text-slate-200"
                    }
                  >
                    {it.availableQty}
                  </span>
                </td>
                <td className={`${adminTd} text-right text-slate-400`}>
                  {it.reservedQty}
                </td>
                <td className={`${adminTd} text-right text-slate-400`}>
                  {it.safetyStockQty}
                </td>
                <td className={adminTd}>
                  <div className="flex items-center gap-2">
                    {it.locked ? (
                      <AdminPill tone="danger">
                        {t("merchant.inventory.lockedBadge")}
                      </AdminPill>
                    ) : lowStock ? (
                      <AdminPill tone="warning">
                        {t("adminInventory.runningLow")}
                      </AdminPill>
                    ) : (
                      <AdminPill tone="success">
                        {t("merchant.inventory.normalBadge")}
                      </AdminPill>
                    )}
                    {it.expiryDate && (
                      <span className="text-[11px] text-slate-500">
                        {t("adminInventory.expiry", {
                          date: formatDateTime(it.expiryDate, locale),
                        })}
                      </span>
                    )}
                  </div>
                </td>
                <td className={`${adminTd} text-right`}>
                  {it.locked ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-white/20 text-slate-200 hover:bg-white/10"
                      loading={
                        unlockMutation.isPending &&
                        unlockMutation.variables?.skuId === it.skuId &&
                        unlockMutation.variables?.warehouseId === it.warehouseId
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
                      className="border-rose-400/40 text-rose-300 hover:bg-rose-500/10"
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
      </AdminTable>

      {(page > 0 || hasMore) && (
        <div className="mt-3 flex items-center justify-between rounded-2xl border border-slate-600/60 bg-white/[0.04] px-6 py-3">
          <p className="text-xs text-slate-400">
            {t("adminInventory.pagination", {
              count: totalElements,
              page: page + 1,
            })}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              aria-disabled={page <= 0 || undefined}
              className={
                page <= 0
                  ? "cursor-default border-slate-600/60 text-slate-500 hover:bg-transparent"
                  : "border-white/20 text-slate-200 hover:bg-white/10"
              }
              onClick={() => page > 0 && onPageChange(Math.max(0, page - 1))}
            >
              {t("common.previous")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              aria-disabled={!hasMore || undefined}
              className={
                !hasMore
                  ? "cursor-default border-slate-600/60 text-slate-500 hover:bg-transparent"
                  : "border-white/20 text-slate-200 hover:bg-white/10"
              }
              onClick={() => hasMore && onPageChange(page + 1)}
            >
              {t("common.next")}
            </Button>
          </div>
        </div>
      )}

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
                <span className="text-gray-500">
                  {t("merchant.inventory.colSku")}:
                </span>{" "}
                <span className="font-mono">{target.skuId}</span>
              </p>
              <p>
                <span className="text-gray-500">
                  {t("merchant.inventory.warehouseDropdownLabel")}:
                </span>{" "}
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
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none"
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
