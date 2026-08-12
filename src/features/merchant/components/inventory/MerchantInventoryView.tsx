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
import { Button, Badge, Card, EmptyState } from "@/shared/ui";
import AuthGuard from "@/components/auth/AuthGuard";
import { warehouseService, inventoryService } from "@/lib/services";
import type { InventoryItem } from "@/types";
import { useTranslation } from "@/hooks";

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
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {t("merchant.inventory.title")}
          </h1>
          <div className="flex gap-2">
            <Link href="/merchant/inventory/transfers">
              <Button variant="outline" size="sm">
                <ArrowLeftRight size={14} className="mr-1.5" />
                {t("merchant.inventory.transferBtn")}
              </Button>
            </Link>
            <Button
              size="sm"
              onClick={() => setAction({ type: "init", item: null })}
              disabled={!effectiveWarehouseId}
            >
              <Plus size={14} className="mr-1.5" />
              {t("merchant.inventory.initSkuBtn")}
            </Button>
          </div>
        </div>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <WarehouseIcon size={20} className="text-blue-600" />
            {t("merchant.inventory.warehouseSectionTitle")}
          </h2>
          {loadingWh ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="animate-spin text-blue-600" size={24} />
            </div>
          ) : !warehouses || warehouses.length === 0 ? (
            <EmptyState
              icon={WarehouseIcon}
              title={t("merchant.inventory.noWarehouseTitle")}
              description={t("merchant.inventory.noWarehouseDescription")}
            />
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {warehouses.map((wh) => {
                const isActive = effectiveWarehouseId === wh.warehouseId;
                return (
                  <button
                    key={wh.warehouseId}
                    onClick={() => setActiveWarehouseId(wh.warehouseId)}
                    className={`text-left transition-all ${
                      isActive
                        ? "ring-2 ring-blue-500 ring-offset-2 rounded-md"
                        : ""
                    }`}
                  >
                    <Card>
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {wh.address ??
                              t("merchant.inventory.warehouseFallback", {
                                id: wh.warehouseId.slice(0, 6),
                              })}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {t("merchant.inventory.priorityLabel")}:{" "}
                            {wh.priorityLevel}
                          </p>
                        </div>
                        <Badge
                          variant={
                            wh.status === "ACTIVE"
                              ? "success"
                              : wh.status === "SUSPENDED"
                                ? "warning"
                                : "default"
                          }
                        >
                          {wh.status === "ACTIVE"
                            ? t("merchant.inventory.statusActive")
                            : wh.status === "SUSPENDED"
                              ? t("merchant.inventory.statusSuspended")
                              : wh.status}
                        </Badge>
                      </div>
                    </Card>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Package size={20} className="text-blue-600" />
            {t("merchant.inventory.stockSectionTitle")}
            {effectiveWarehouseId && (
              <span className="text-xs text-gray-400 font-normal font-mono">
                · {effectiveWarehouseId}
              </span>
            )}
          </h2>
          {!effectiveWarehouseId ? null : loadingInv ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="animate-spin text-blue-600" size={24} />
            </div>
          ) : inventory.length === 0 ? (
            <EmptyState
              icon={Package}
              title={t("merchant.inventory.emptyStockTitle")}
              description={t("merchant.inventory.emptyStockDescription")}
            />
          ) : (
            <div className="bg-white rounded-md border border-gray-400 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-400 bg-gray-50">
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                        SKU
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                        {t("merchant.inventory.colPhysical")}
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                        {t("merchant.inventory.colReserved")}
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                        {t("merchant.inventory.colAvailable")}
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                        {t("merchant.inventory.colSafety")}
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                        {t("merchant.inventory.colBatch")}
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                        {t("merchant.inventory.colStatus")}
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                        {t("merchant.inventory.colActions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map((item) => {
                      const lowStock =
                        item.availableQty <= item.safetyStockQty &&
                        !item.locked;
                      return (
                        <tr
                          key={`${item.skuId}-${item.warehouseId}`}
                          className="border-b border-gray-50 hover:bg-gray-50"
                        >
                          <td className="px-4 py-3">
                            <p className="text-xs text-gray-900 font-mono truncate">
                              {item.skuId}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900">
                            {item.physicalQty}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-600">
                            {item.reservedQty}
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            <span
                              className={`font-medium ${
                                lowStock ? "text-red-600" : "text-gray-900"
                              }`}
                            >
                              {item.availableQty}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-600">
                            {item.safetyStockQty}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600">
                            {item.batchNo || item.expiryDate ? (
                              <>
                                {item.batchNo && <p>{item.batchNo}</p>}
                                {item.expiryDate && (
                                  <p className="text-gray-400">
                                    {item.expiryDate}
                                  </p>
                                )}
                              </>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {item.locked ? (
                              <Badge variant="danger">
                                {t("merchant.inventory.lockedBadge")}
                              </Badge>
                            ) : lowStock ? (
                              <Badge variant="warning">
                                <AlertTriangle size={10} className="mr-1" />
                                {t("merchant.inventory.lowStockBadge")}
                              </Badge>
                            ) : (
                              <Badge variant="success">
                                {t("merchant.inventory.normalBadge")}
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
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
                                onClick={() =>
                                  setAction({ type: "batch", item })
                                }
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
                                onClick={() =>
                                  setAction({ type: "audit", item })
                                }
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
      </div>

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
    </div>
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
