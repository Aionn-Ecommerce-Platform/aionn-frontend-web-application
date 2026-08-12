"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Package, Search } from "lucide-react";
import { Button, EmptyState } from "@/shared/ui";
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
      className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
        active
          ? "text-blue-600 border-blue-600"
          : "text-gray-500 border-transparent hover:text-gray-700"
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
      <EmptyState
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
    queryFn: () => inventoryService.listByWarehouse(submittedId, page, size),
    enabled: submittedId.length > 0,
  });

  const items = data?.content ?? [];
  const totalElements = data?.totalElements ?? items.length;
  const hasMore = items.length === size;

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Warehouse ID (WH_...)"
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && warehouseId.trim()) {
                setSubmittedId(warehouseId.trim());
                setPage(0);
              }
            }}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <Button
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
        <EmptyState
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
    queryFn: () => inventoryService.listBySku(submittedSkuId),
    enabled: submittedSkuId.length > 0,
  });

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            placeholder="SKU ID..."
            value={skuId}
            onChange={(e) => setSkuId(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && skuId.trim()) {
                setSubmittedSkuId(skuId.trim());
              }
            }}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <Button
          onClick={() => setSubmittedSkuId(skuId.trim())}
          disabled={!skuId.trim()}
        >
          {t("common.lookup")}
        </Button>
      </div>

      {!submittedSkuId ? (
        <EmptyState
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
