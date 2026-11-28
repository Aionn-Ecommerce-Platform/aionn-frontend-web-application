"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Package, Search } from "lucide-react";
import { Button } from "@/shared/ui";
import { AdminEmpty } from "@/features/admin";
import { inventoryService } from "@/lib/services";
import { isNotImplemented } from "@/shared/lib/errors";
import { useTranslation } from "@/hooks";
import { InventoryTable } from "./InventoryTable";
export function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors ${
        active
          ? "border-purple-400/50 bg-purple-600 text-white shadow-md shadow-purple-900/40"
          : "border-gray-500 bg-white/[0.03] text-slate-300 hover:border-white/30 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

export function LowStockTab({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const size = 20;

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-inventory-low-stock", page],
    queryFn: () => inventoryService.listLowStock(page, size),
  });

  const items = data?.content ?? [];
  const totalElements = data?.totalElements ?? items.length;
  const hasMore = items.length === size;

  if (isNotImplemented(error)) {
    return (
      <AdminEmpty
        icon={AlertTriangle}
        title={t("adminInventory.lowStockUnavailable")}
        description={t("adminInventory.lowStockUnavailableDescription")}
      />
    );
  }

  return (
    <InventoryTable
      items={items}
      isLoading={isLoading}
      page={page}
      hasMore={hasMore}
      totalElements={totalElements}
      onPageChange={setPage}
      qc={qc}
      emptyHint={t("adminInventory.allAboveSafety")}
    />
  );
}

export function ByWarehouseTab({
  qc,
}: {
  qc: ReturnType<typeof useQueryClient>;
}) {
  const { t } = useTranslation();
  const [warehouseId, setWarehouseId] = useState("");
  const [submittedId, setSubmittedId] = useState("");
  const [page, setPage] = useState(0);
  const size = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-inventory-by-warehouse", submittedId, page],
    queryFn: () =>
      inventoryService.listByWarehouse(submittedId, { page, size }),
    enabled: submittedId.length > 0,
  });

  const items = data?.content ?? [];
  const totalElements = data?.totalElements ?? items.length;
  const hasMore = items.length === size;

  return (
    <div>
      <div className="mb-4 flex gap-3">
        <div className="relative max-w-md flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            size={18}
          />
          <input
            type="text"
            placeholder={t("adminInventory.enterWarehouseId")}
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && warehouseId.trim()) {
                setSubmittedId(warehouseId.trim());
                setPage(0);
              }
            }}
            className="w-full rounded-xl border border-gray-500 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>
        <Button
          variant="outline"
          className="border-white/20 text-slate-200 hover:bg-white/10"
          onClick={() => {
            setSubmittedId(warehouseId.trim());
            setPage(0);
          }}
          disabled={!warehouseId.trim()}
        >
          {t("adminInventory.load")}
        </Button>
      </div>

      {!submittedId ? (
        <AdminEmpty
          icon={Package}
          title={t("adminInventory.enterWarehouseId")}
          description={t("adminInventory.warehouseHelp")}
        />
      ) : (
        <InventoryTable
          items={items}
          isLoading={isLoading}
          page={page}
          hasMore={hasMore}
          totalElements={totalElements}
          onPageChange={setPage}
          qc={qc}
        />
      )}
    </div>
  );
}

export function LookupTab({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
  const { t } = useTranslation();
  const [skuId, setSkuId] = useState("");
  const [submittedSkuId, setSubmittedSkuId] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-inventory-by-sku", submittedSkuId],
    queryFn: () => inventoryService.adminListBySku(submittedSkuId),
    enabled: submittedSkuId.length > 0,
  });

  return (
    <div>
      <div className="mb-4 flex gap-3">
        <div className="relative max-w-md flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            size={18}
          />
          <input
            type="text"
            placeholder={t("adminInventory.enterSkuId")}
            value={skuId}
            onChange={(e) => setSkuId(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && skuId.trim()) {
                setSubmittedSkuId(skuId.trim());
              }
            }}
            className="w-full rounded-xl border border-gray-500 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>
        <Button
          variant="outline"
          className="border-white/20 text-slate-200 hover:bg-white/10"
          onClick={() => setSubmittedSkuId(skuId.trim())}
          disabled={!skuId.trim()}
        >
          {t("common.lookup")}
        </Button>
      </div>

      {!submittedSkuId ? (
        <AdminEmpty
          icon={Package}
          title={t("adminInventory.enterSkuId")}
          description={t("adminInventory.skuHelp")}
        />
      ) : (
        <InventoryTable
          items={data ?? []}
          isLoading={isLoading}
          page={0}
          hasMore={false}
          totalElements={data?.length ?? 0}
          onPageChange={() => {}}
          qc={qc}
        />
      )}
    </div>
  );
}
