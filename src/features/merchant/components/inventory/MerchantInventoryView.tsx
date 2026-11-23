"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Warehouse as WarehouseIcon,
  Package,
  AlertTriangle,
  Loader2,
  Shield,
  CalendarClock,
  Sliders,
  ClipboardCheck,
  Plus,
  ArrowLeftRight,
} from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/shared/ui";
import AuthGuard from "@/components/auth/AuthGuard";
import { warehouseService, inventoryService } from "@/lib/services";
import type { InventoryItem } from "@/types";
import { useTranslation } from "@/hooks";
import { ConsolePanel } from "../shared/ConsoleShell";

type Action = "safety" | "batch" | "adjust" | "audit" | "init" | null;

function MerchantInventoryInner() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [activeWarehouseId, setActiveWarehouseId] = useState<string | null>(
    null,
  );
  const [action, setAction] = useState<{
    type: Action;
    item: InventoryItem | null;
  }>({ type: null, item: null });

  const { data: warehouses, isLoading: loadingWh } = useQuery({
    queryKey: ["merchant-warehouses"],
    queryFn: () => warehouseService.listMine(),
  });

  const effectiveWarehouseId =
    activeWarehouseId ??
    warehouses?.find((w) => w.status === "ACTIVE")?.warehouseId ??
    warehouses?.[0]?.warehouseId ??
    null;

  const { data: inventoryPage, isLoading: loadingInv } = useQuery({
    queryKey: ["merchant-inventory", effectiveWarehouseId],
    queryFn: () =>
      effectiveWarehouseId
        ? inventoryService.listByWarehouse(effectiveWarehouseId, 0, 100)
        : Promise.resolve(undefined),
    enabled: !!effectiveWarehouseId,
  });

  const inventory = inventoryPage?.content ?? [];

  function refresh() {
    qc.invalidateQueries({ queryKey: ["merchant-inventory"] });
  }

  function close() {
    setAction({ type: null, item: null });
  }

  return (
    <ConsolePanel>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
          <WarehouseIcon size={22} className="text-purple-300" />
          <span className="text-purple-300">
            {t("merchant.inventory.title")}
          </span>
        </h1>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/merchant/inventory/transfers"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-500 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-all hover:border-gray-400 hover:bg-white/10"
          >
            <ArrowLeftRight size={16} />
            {t("merchant.inventory.transferBtn")}
          </Link>
          <button
            type="button"
            onClick={() => setAction({ type: "init", item: null })}
            disabled={!effectiveWarehouseId}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-purple-900/40 transition-all hover:from-purple-500 hover:to-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={16} />
            {t("merchant.inventory.initSkuBtn")}
          </button>
        </div>
      </div>

      <section className="mb-8">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
          <WarehouseIcon size={18} className="text-purple-300" />
          {t("merchant.inventory.warehouseSectionTitle")}
        </h2>
        {loadingWh ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="animate-spin text-purple-400" size={24} />
          </div>
        ) : !warehouses || warehouses.length === 0 ? (
          <EmptyState
            icon={WarehouseIcon}
            title={t("merchant.inventory.noWarehouseTitle")}
            description={t("merchant.inventory.noWarehouseDescription")}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {warehouses.map((wh) => {
              const isActive = effectiveWarehouseId === wh.warehouseId;
              const statusLabel =
                wh.status === "ACTIVE"
                  ? t("merchant.inventory.statusActive")
                  : wh.status === "SUSPENDED"
                    ? t("merchant.inventory.statusSuspended")
                    : t("merchant.inventory.statusInactive");
              const statusClass =
                wh.status === "ACTIVE"
                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                  : wh.status === "SUSPENDED"
                    ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
                    : "border-slate-500/40 bg-white/5 text-slate-300";
              return (
                <button
                  key={wh.warehouseId}
                  type="button"
                  onClick={() => setActiveWarehouseId(wh.warehouseId)}
                  className={`rounded-2xl border p-4 text-left transition-all ${
                    isActive
                      ? "border-purple-500/70 bg-purple-500/10 ring-2 ring-purple-500/50"
                      : "border-gray-600 bg-white/[0.04] hover:border-gray-500 hover:bg-white/[0.07]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {wh.address ??
                          t("merchant.inventory.warehouseFallback", {
                            id: wh.warehouseId.slice(0, 6),
                          })}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {t("merchant.inventory.priorityLabel", {
                          value: wh.priorityLevel,
                        })}
                      </p>
                    </div>
                    <span
                      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusClass}`}
                    >
                      {statusLabel}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
          <Package size={18} className="text-purple-300" />
          {t("merchant.inventory.stockSectionTitle")}
          {effectiveWarehouseId && (
            <span className="font-mono text-xs font-normal text-slate-500">
              · {effectiveWarehouseId}
            </span>
          )}
        </h2>
        {!effectiveWarehouseId ? null : loadingInv ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="animate-spin text-purple-400" size={24} />
          </div>
        ) : inventory.length === 0 ? (
          <EmptyState
            icon={Package}
            title={t("merchant.inventory.emptyStockTitle")}
            description={t("merchant.inventory.emptyStockDescription")}
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-600 bg-white/[0.04]">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-600/60 bg-white/[0.03]">
                    <th className="whitespace-nowrap px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      SKU
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      {t("merchant.inventory.colPhysical")}
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      {t("merchant.inventory.colReserved")}
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      {t("merchant.inventory.colAvailable")}
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      {t("merchant.inventory.colSafety")}
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      {t("merchant.inventory.colBatch")}
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      {t("merchant.inventory.colStatus")}
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      {t("merchant.inventory.colActions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((item) => {
                    const lowStock =
                      item.availableQty <= item.safetyStockQty && !item.locked;
                    return (
                      <tr
                        key={`${item.skuId}-${item.warehouseId}`}
                        className="border-b border-slate-600/60 transition-colors last:border-0 hover:bg-white/[0.04]"
                      >
                        <td className="px-4 py-3 text-center">
                          <p className="truncate font-mono text-xs text-slate-200">
                            {item.skuId}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-slate-200">
                          {item.physicalQty}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-slate-300">
                          {item.reservedQty}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-center text-sm">
                          <span
                            className={`font-semibold ${
                              lowStock ? "text-rose-300" : "text-slate-200"
                            }`}
                          >
                            {item.availableQty}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-slate-300">
                          {item.safetyStockQty}
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-slate-400">
                          {item.batchNo || item.expiryDate ? (
                            <>
                              {item.batchNo && <p>{item.batchNo}</p>}
                              {item.expiryDate && (
                                <p className="text-slate-500">
                                  {item.expiryDate}
                                </p>
                              )}
                            </>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-center">
                          {item.locked ? (
                            <span className="inline-flex items-center whitespace-nowrap rounded-full border border-rose-400/30 bg-rose-400/10 px-3 py-1 text-xs font-semibold text-rose-300">
                              {t("merchant.inventory.lockedBadge")}
                            </span>
                          ) : lowStock ? (
                            <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-300">
                              <AlertTriangle size={11} />
                              {t("merchant.inventory.lowStockBadge")}
                            </span>
                          ) : (
                            <span className="inline-flex items-center whitespace-nowrap rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                              {t("merchant.inventory.normalBadge")}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <ActionBtn
                              title={t("merchant.inventory.actionSafety")}
                              onClick={() =>
                                setAction({ type: "safety", item })
                              }
                            >
                              <Shield size={14} />
                            </ActionBtn>
                            <ActionBtn
                              title={t("merchant.inventory.actionBatch")}
                              onClick={() => setAction({ type: "batch", item })}
                            >
                              <CalendarClock size={14} />
                            </ActionBtn>
                            <ActionBtn
                              title={t("merchant.inventory.actionAdjust")}
                              onClick={() =>
                                setAction({ type: "adjust", item })
                              }
                            >
                              <Sliders size={14} />
                            </ActionBtn>
                            <ActionBtn
                              title={t("merchant.inventory.actionAudit")}
                              onClick={() => setAction({ type: "audit", item })}
                            >
                              <ClipboardCheck size={14} />
                            </ActionBtn>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {action.type === "init" && effectiveWarehouseId && (
        <InitModal
          warehouseId={effectiveWarehouseId}
          onClose={close}
          onSuccess={() => {
            refresh();
            close();
          }}
        />
      )}
      {action.type === "safety" && action.item && (
        <SafetyStockModal
          item={action.item}
          onClose={close}
          onSuccess={() => {
            refresh();
            close();
          }}
        />
      )}
      {action.type === "batch" && action.item && (
        <BatchModal
          item={action.item}
          onClose={close}
          onSuccess={() => {
            refresh();
            close();
          }}
        />
      )}
      {action.type === "adjust" && action.item && (
        <AdjustModal
          item={action.item}
          onClose={close}
          onSuccess={() => {
            refresh();
            close();
          }}
        />
      )}
      {action.type === "audit" && action.item && (
        <AuditModal
          item={action.item}
          onClose={close}
          onSuccess={() => {
            refresh();
            close();
          }}
        />
      )}
    </ConsolePanel>
  );
}
import { ActionBtn } from "./InventoryControls";
import {
  InitModal,
  SafetyStockModal,
  BatchModal,
} from "./InventoryStockModals";
import { AdjustModal, AuditModal } from "./InventoryAuditModals";

export default function MerchantInventoryPage() {
  return (
    <AuthGuard requiredRoles={["MERCHANT"]}>
      <MerchantInventoryInner />
    </AuthGuard>
  );
}
