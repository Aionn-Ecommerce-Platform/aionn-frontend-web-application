"use client";

import { useState } from "react";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Warehouse as WarehouseIcon,
  Package,
  Boxes,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Shield,
  Sliders,
  ClipboardCheck,
  Plus,
  ArrowLeftRight,
  Search,
} from "lucide-react";
import Link from "next/link";
import { Pagination } from "@/shared/ui";
import AuthGuard from "@/components/auth/AuthGuard";
import { warehouseService, inventoryService } from "@/lib/services";
import type { InventoryItem } from "@/types";
import { useTranslation } from "@/hooks";
import { ConsolePanel, ConsoleEmptyState } from "../shared/ConsoleShell";
import { ConsoleFilterDropdown } from "../shared/ConsoleFilterDropdown";
import { ConsoleStatGrid } from "../shared/ConsoleStatGrid";

type Action = "safety" | "batch" | "adjust" | "audit" | "init" | null;

function MerchantInventoryInner() {
  const { t, locale } = useTranslation();
  const qc = useQueryClient();
  const [activeWarehouseId, setActiveWarehouseId] = useState<string | null>(
    null,
  );
  const [stockSearch, setStockSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "locked">(
    "all",
  );
  const [stockPage, setStockPage] = useState(1);
  const INVENTORY_PAGE_SIZE = 30;
  const [action, setAction] = useState<{
    type: Action;
    item: InventoryItem | null;
  }>({ type: null, item: null });

  const { data: warehousePage, isLoading: loadingWh } = useQuery({
    queryKey: ["merchant-warehouses"],
    queryFn: () => warehouseService.listMine({ limit: 100 }),
  });
  const warehouses = warehousePage?.content ?? [];
  const activeWarehouses = warehouses.filter((w) => w.status === "ACTIVE");

  // Pick a warehouse that actually has stock so the page does not look empty
  // just because the first active warehouse happens to be unused.
  const stockProbes = useQueries({
    queries: activeWarehouses.map((warehouse) => ({
      queryKey: ["merchant-inventory-probe", warehouse.warehouseId],
      queryFn: () =>
        inventoryService.listByWarehouse(warehouse.warehouseId, {
          page: 0,
          size: 1,
        }),
      enabled: !activeWarehouseId && warehouses.length > 0,
      staleTime: 30_000,
    })),
  });
  const warehouseWithStockId = activeWarehouses.find(
    (_warehouse, index) =>
      (stockProbes[index]?.data?.totalElements ?? 0) > 0,
  )?.warehouseId;
  const resolvingWarehouse =
    !activeWarehouseId &&
    warehouses.length > 0 &&
    stockProbes.some((probe) => probe.isPending);

  const effectiveWarehouseId = activeWarehouseId
    ? activeWarehouseId
    : resolvingWarehouse
      ? null
      : (warehouseWithStockId ??
        activeWarehouses[0]?.warehouseId ??
        warehouses[0]?.warehouseId ??
        null);

  const { data: inventoryPage, isLoading: loadingInv } = useQuery({
    queryKey: [
      "merchant-inventory",
      effectiveWarehouseId,
      stockPage,
      stockSearch.trim(),
      stockFilter,
    ],
    queryFn: () =>
      effectiveWarehouseId
        ? inventoryService.listByWarehouse(effectiveWarehouseId, {
            page: stockPage - 1,
            size: INVENTORY_PAGE_SIZE,
            search: stockSearch.trim() || undefined,
            stockStatus: stockFilter === "all" ? undefined : stockFilter,
          })
        : Promise.resolve(undefined),
    enabled: !!effectiveWarehouseId,
  });

  const { data: inventoryStats } = useQuery({
    queryKey: ["merchant-inventory-stats", effectiveWarehouseId],
    queryFn: () =>
      effectiveWarehouseId
        ? inventoryService.statsByWarehouse(effectiveWarehouseId)
        : Promise.resolve(undefined),
    enabled: !!effectiveWarehouseId,
  });

  const inventory = inventoryPage?.content ?? [];
  const inventoryTotalPages = Math.max(1, inventoryPage?.totalPages ?? 1);
  const safeStockPage = Math.min(stockPage, inventoryTotalPages);
  if (inventoryPage && stockPage > safeStockPage) {
    setStockPage(safeStockPage);
  }

  function refresh() {
    qc.invalidateQueries({ queryKey: ["merchant-inventory"] });
    qc.invalidateQueries({ queryKey: ["merchant-inventory-stats"] });
  }

  function close() {
    setAction({ type: null, item: null });
  }

  const numberFormat = new Intl.NumberFormat(
    locale === "vi" ? "vi-VN" : "en-US",
  );
  const formatStat = (value: number | undefined) =>
    value == null ? "—" : numberFormat.format(value);
  const inventorySummary = [
    {
      label: t("merchant.inventory.stats.skus"),
      value: formatStat(inventoryStats?.totalSkus),
      icon: Package,
      iconClass: "text-purple-300",
    },
    {
      label: t("merchant.inventory.stats.physical"),
      value: formatStat(inventoryStats?.physicalQty),
      icon: Boxes,
      iconClass: "text-sky-300",
    },
    {
      label: t("merchant.inventory.stats.available"),
      value: formatStat(inventoryStats?.availableQty),
      icon: CheckCircle2,
      iconClass: "text-emerald-300",
    },
    {
      label: t("merchant.inventory.stats.lowStock"),
      value: formatStat(inventoryStats?.lowStockSkus),
      icon: AlertTriangle,
      iconClass: "text-amber-300",
    },
  ];

  return (
    <ConsolePanel>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
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

      {effectiveWarehouseId && (
        <ConsoleStatGrid
          stats={inventorySummary}
          columnsClassName="lg:grid-cols-4"
        />
      )}

      <section>
        {loadingWh || resolvingWarehouse ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="animate-spin text-purple-400" size={24} />
          </div>
        ) : warehouses.length === 0 ? (
          <ConsoleEmptyState
            icon={WarehouseIcon}
            title={t("merchant.inventory.noWarehouseTitle")}
            description={t("merchant.inventory.noWarehouseDescription")}
          />
        ) : !effectiveWarehouseId ? null : (
          <>
            <div className="relative z-30 mb-2 flex flex-wrap items-center gap-2">
              <div className="relative min-w-64 flex-1">
                <Search
                  size={17}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  value={stockSearch}
                  onChange={(event) => {
                    setStockSearch(event.target.value);
                    setStockPage(1);
                  }}
                  placeholder={t("merchant.inventory.searchPlaceholder")}
                  className="w-full rounded-xl border border-gray-500 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 shadow-sm focus:border-purple-400/70 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                />
              </div>
              <ConsoleFilterDropdown
                label={t("merchant.inventory.stockStatusLabel")}
                value={stockFilter}
                options={[
                  {
                    value: "all",
                    label: t("merchant.inventory.stockStatusAll"),
                  },
                  {
                    value: "low",
                    label: t("merchant.inventory.lowStockBadge"),
                  },
                  {
                    value: "locked",
                    label: t("merchant.inventory.lockedBadge"),
                  },
                ]}
                onChange={(value) => {
                  setStockFilter(value);
                  setStockPage(1);
                }}
              />
            </div>
            <div className="relative z-20 mb-4">
              <ConsoleFilterDropdown
                label={t("merchant.inventory.warehouseDropdownLabel")}
                value={effectiveWarehouseId}
                options={warehouses.map((wh) => ({
                  value: wh.warehouseId,
                  label:
                    wh.address ||
                    t("merchant.inventory.warehouseFallback", {
                      id: wh.warehouseId.slice(0, 6),
                    }),
                }))}
                onChange={(value) => {
                  setActiveWarehouseId(value);
                  setStockPage(1);
                }}
                menuClassName="w-80"
              />
            </div>
          </>
        )}
        {!effectiveWarehouseId ? null : loadingInv ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="animate-spin text-purple-400" size={24} />
          </div>
        ) : inventory.length === 0 ? (
          <ConsoleEmptyState
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
                          <p
                            className="max-w-[220px] truncate font-mono text-xs text-slate-200"
                            title={item.skuId}
                          >
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
                              tone="amber"
                              onClick={() =>
                                setAction({ type: "safety", item })
                              }
                            >
                              <Shield size={14} />
                            </ActionBtn>
                            <ActionBtn
                              title={t("merchant.inventory.actionAdjust")}
                              tone="sky"
                              onClick={() =>
                                setAction({ type: "adjust", item })
                              }
                            >
                              <Sliders size={14} />
                            </ActionBtn>
                            <ActionBtn
                              title={t("merchant.inventory.actionAudit")}
                              tone="purple"
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
        <Pagination
          currentPage={safeStockPage}
          totalPages={inventoryTotalPages}
          onPageChange={setStockPage}
        />
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
