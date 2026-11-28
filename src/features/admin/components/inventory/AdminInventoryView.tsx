"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Package } from "lucide-react";
import AuthGuard from "@/components/auth/AuthGuard";
import { AdminHeader, AdminTabs } from "@/features/admin";
import { useTranslation } from "@/hooks";
import { LowStockTab, ByWarehouseTab, LookupTab } from "./AdminInventoryTabs";

type Tab = "low-stock" | "by-warehouse" | "lookup";

const TABS: Array<{ value: Tab; labelKey: string }> = [
  { value: "low-stock", labelKey: "adminInventory.lowStock" },
  { value: "by-warehouse", labelKey: "adminInventory.byWarehouse" },
  { value: "lookup", labelKey: "adminInventory.lookupSku" },
];

function AdminInventoryInner() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("low-stock");

  return (
    <div className="min-h-screen">
      <AdminHeader
        icon={Package}
        title={t("adminInventory.title")}
        description={t("adminInventory.description")}
      />

      <AdminTabs
        tabs={TABS.map((item) => ({
          value: item.value,
          label: t(item.labelKey),
        }))}
        value={tab}
        onChange={setTab}
      />

      {tab === "low-stock" && <LowStockTab qc={qc} />}
      {tab === "by-warehouse" && <ByWarehouseTab qc={qc} />}
      {tab === "lookup" && <LookupTab qc={qc} />}
    </div>
  );
}

export default function AdminInventoryPage() {
  return (
    <AuthGuard requiredRoles={["SYSTEM_ADMIN", "CS_ADMIN"]}>
      <AdminInventoryInner />
    </AuthGuard>
  );
}
