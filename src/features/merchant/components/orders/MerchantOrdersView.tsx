"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X, Eye, Loader2, Package, Truck, Search } from "lucide-react";
import toast from "react-hot-toast";
import { Button, Badge, EmptyState, PeriodDropdown } from "@/shared/ui";
import AuthGuard from "@/components/auth/AuthGuard";
import { orderService } from "@/lib/services";
import { qk } from "@/lib/query-keys";
import { getOrderStatus } from "@/lib/domain/status/order";
import { formatCurrency } from "@/shared/lib/utils";
import { getErrorMessage } from "@/shared/lib/errors";
import { useTranslation } from "@/hooks";
import type { Order } from "@/types";
import { filterMerchantOrders } from "@/lib/domain/merchant-orders";

const TAB_KEYS = [
  "all",
  "PLACED",
  "PREPARING",
  "SHIPPED",
  "COMPLETED",
  "CANCELLED",
] as const;

function MerchantOrdersInner() {
  const { t } = useTranslation();
  const tabs = TAB_KEYS.map((key) => ({
    key,
    label: t(
      `merchant.orders.tabs.${key === "all" ? "all" : key.toLowerCase()}`,
    ),
  }));
  const [activeTab, setActiveTab] = useState<(typeof TAB_KEYS)[number]>("all");
  const [search, setSearch] = useState("");
  const [year, setYear] = useState(0);
  const [month, setMonth] = useState(0);
  const [day, setDay] = useState(0);
  const qc = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [editingShipping, setEditingShipping] = useState<Order | null>(null);

  const { data: orders, isLoading } = useQuery({
    queryKey: qk.merchantOrders({ limit: 200 }),
    queryFn: () => orderService.listForMerchant({ limit: 200 }),
  });

  const years = useMemo(
    () =>
      Array.from(
        new Set(
          (orders ?? []).map((order) =>
            new Date(order.createdAt).getFullYear(),
          ),
        ),
      ).sort((a, b) => b - a),
    [orders],
  );
  const daysInMonth = year && month ? new Date(year, month, 0).getDate() : 31;
  const visibleOrders = useMemo(
    () =>
      filterMerchantOrders(
        orders,
        activeTab === "all" ? null : [activeTab],
        search,
        { year: year || null, month: month || null, day: day || null },
      ),
    [activeTab, day, month, orders, search, year],
  );

  const confirmMutation = useMutation({
    mutationFn: (orderId: string) => orderService.confirmPreparation(orderId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success(t("merchant.orders.toastConfirmed"));
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const rejectMutation = useMutation({
    mutationFn: (orderId: string) =>
      orderService.rejectByMerchant(
        orderId,
        t("merchant.orders.rejectReasonDefault"),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success(t("merchant.orders.toastRejected"));
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {t("merchant.orders.title")}
        </h1>

        <div className="flex overflow-x-auto gap-1 mb-6 bg-white rounded-md border border-gray-400 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.key
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-6">
          <div className="relative min-w-64 flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={17}
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("merchant.orders.searchPlaceholder")}
              className="w-full rounded-xl border border-gray-400 bg-white py-2.5 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <PeriodDropdown
            label={t("merchant.orders.filterYearAll")}
            value={year}
            options={[
              { value: 0, label: t("merchant.orders.filterYearAll") },
              ...years.map((value) => ({ value, label: String(value) })),
            ]}
            onChange={(value) => {
              setYear(value);
              setMonth(0);
              setDay(0);
            }}
          />
          <PeriodDropdown
            label={t("merchant.orders.filterMonthAll")}
            value={month}
            disabled={!year}
            options={[
              { value: 0, label: t("merchant.orders.filterMonthAll") },
              ...Array.from({ length: 12 }, (_, index) => ({
                value: index + 1,
                label: t("merchant.orders.monthFormat", { month: index + 1 }),
              })),
            ]}
            onChange={(value) => {
              setMonth(value);
              setDay(0);
            }}
          />
          <PeriodDropdown
            label={t("merchant.orders.filterDayAll")}
            value={day}
            disabled={!month}
            options={[
              { value: 0, label: t("merchant.orders.filterDayAll") },
              ...Array.from({ length: daysInMonth }, (_, index) => ({
                value: index + 1,
                label: String(index + 1),
              })),
            ]}
            onChange={setDay}
          />
        </div>

        {isLoading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="animate-spin text-blue-600" size={28} />
          </div>
        ) : visibleOrders.length === 0 ? (
          <EmptyState
            icon={Package}
            title={t("merchant.orders.emptyTitle")}
            description={t("merchant.orders.emptyDesc")}
          />
        ) : (
          <div className="bg-white rounded-md border border-gray-400 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-400 bg-gray-50">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    {t("merchant.orders.tableOrder")}
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    {t("merchant.orders.tableCustomer")}
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    {t("merchant.orders.tableTotal")}
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    {t("merchant.orders.tableStatus")}
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    {t("merchant.orders.tableActions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleOrders.map((order) => {
                  const cfg = getOrderStatus(order.status);
                  const isPending =
                    confirmMutation.isPending || rejectMutation.isPending;
                  return (
                    <tr
                      key={order.orderId}
                      className="border-b border-gray-50 hover:bg-gray-50"
                    >
                      <td className="px-6 py-4">
                        <p className="text-sm font-mono font-medium text-gray-900">
                          #{order.orderId.slice(0, 8).toUpperCase()}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(order.createdAt).toLocaleDateString(
                            "vi-VN",
                          )}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 truncate max-w-[180px]">
                        {order.userId.slice(0, 8)}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">
                        {formatCurrency(order.totalAmount, order.currency)}
                      </td>
                      <td className="px-6 py-4">
                        {cfg && (
                          <Badge variant={cfg.variant}>{t(cfg.labelKey)}</Badge>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          {order.status === "PLACED" && (
                            <>
                              <Button
                                variant="secondary"
                                size="sm"
                                disabled={isPending}
                                onClick={() =>
                                  confirmMutation.mutate(order.orderId)
                                }
                              >
                                <Check size={14} className="mr-1" />
                                {t("merchant.orders.btnConfirm")}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={isPending}
                                onClick={() =>
                                  rejectMutation.mutate(order.orderId)
                                }
                              >
                                <X size={14} />
                              </Button>
                            </>
                          )}
                          {(order.status === "PLACED" ||
                            order.status === "PREPARING") && (
                            <button
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
                              title={t("merchant.orders.btnEditShipping")}
                              onClick={() => setEditingShipping(order)}
                            >
                              <Truck size={16} />
                            </button>
                          )}
                          <button
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
                            title={t("merchant.orders.btnDetail")}
                            onClick={() => setSelectedOrder(order)}
                          >
                            <Eye size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
      {editingShipping && (
        <EditShippingModal
          order={editingShipping}
          onClose={() => setEditingShipping(null)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ["orders"] });
            setEditingShipping(null);
          }}
        />
      )}
    </div>
  );
}
import { OrderDetailModal } from "./OrderDetailModal";
import { EditShippingModal } from "./EditShippingModal";

export default function MerchantOrdersPage() {
  return (
    <AuthGuard requiredRoles={["MERCHANT"]}>
      <MerchantOrdersInner />
    </AuthGuard>
  );
}
