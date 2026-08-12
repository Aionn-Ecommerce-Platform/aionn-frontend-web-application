"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Package } from "lucide-react";
import AuthGuard from "@/components/auth/AuthGuard";
import { qk } from "@/lib/query-keys";
import { merchantAnalyticsService } from "@/lib/services";
import { useTranslation } from "@/hooks";

function LowStockInner() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: qk.merchantLowStock,
    queryFn: () => merchantAnalyticsService.lowStock(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-blue-600" size={28} />
      </div>
    );
  }

  const alerts = data ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-orange-50 text-orange-600 rounded-md">
            <AlertTriangle size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {t("merchant.lowStock.title")}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {alerts.length === 0
                ? t("merchant.lowStock.allSafe")
                : t("merchant.lowStock.countBelow", { count: alerts.length })}
            </p>
          </div>
        </div>

        {alerts.length === 0 ? (
          <div className="bg-white rounded-md border border-gray-300 py-16 px-4 text-center">
            <Package className="mx-auto text-gray-400 mb-3" size={40} />
            <p className="text-gray-700 font-medium">
              {t("merchant.lowStock.noAlerts")}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {t("merchant.lowStock.allSafeDescription")}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-md border border-gray-300 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">
                    {t("merchant.lowStock.tableSku")}
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">
                    {t("merchant.lowStock.tableWarehouse")}
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700">
                    {t("merchant.lowStock.tablePhysical")}
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700">
                    {t("merchant.lowStock.tableAvailable")}
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700">
                    {t("merchant.lowStock.tableSafety")}
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700">
                    {t("merchant.lowStock.tableDeficit")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {alerts.map((a) => {
                  const deficit = a.safetyStockQty - a.availableQty;
                  return (
                    <tr
                      key={`${a.skuId}-${a.warehouseId}`}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 text-sm font-mono text-gray-900">
                        {a.skuId}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {a.warehouseId}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">
                        {a.physicalQty}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">
                        {a.availableQty}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600">
                        {a.safetyStockQty}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-orange-600">
                        −{deficit}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MerchantLowStockPage() {
  return (
    <AuthGuard requiredRoles={["MERCHANT"]}>
      <LowStockInner />
    </AuthGuard>
  );
}
