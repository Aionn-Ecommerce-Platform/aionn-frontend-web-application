"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import AuthGuard from "@/components/auth/AuthGuard";
import { useTranslation } from "@/hooks";

type Tab = "low-stock" | "by-warehouse" | "lookup";

function AdminInventoryInner() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("low-stock");

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {t("adminInventory.title")}
        </h1>
        <p className="text-gray-500 mb-6 text-sm">
          {t("adminInventory.description")}
        </p>

        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <TabButton
            active={tab === "low-stock"}
            onClick={() => setTab("low-stock")}
          >
            {t("adminInventory.lowStock")}
          </TabButton>
          <TabButton
            active={tab === "by-warehouse"}
            onClick={() => setTab("by-warehouse")}
          >
            {t("adminInventory.byWarehouse")}
          </TabButton>
          <TabButton active={tab === "lookup"} onClick={() => setTab("lookup")}>
            {t("adminInventory.lookupSku")}
          </TabButton>
        </div>

        {tab === "low-stock" && <LowStockTab qc={qc} />}
        {tab === "by-warehouse" && <ByWarehouseTab qc={qc} />}
        {tab === "lookup" && <LookupTab qc={qc} />}
      </div>
    </div>
  );
}
import {
  TabButton,
  LowStockTab,
  ByWarehouseTab,
  LookupTab,
} from "./AdminInventoryTabs";

export default function AdminInventoryPage() {
  return (
    <AuthGuard requiredRoles={["SYSTEM_ADMIN", "CS_ADMIN"]}>
      <AdminInventoryInner />
    </AuthGuard>
  );
}
