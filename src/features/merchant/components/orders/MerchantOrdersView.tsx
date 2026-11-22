"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Eye,
  Loader2,
  Package,
  Search,
  ShoppingBag,
  Truck,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/shared/ui";
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
    queryKey: qk.merchantOrders({ limit: 100 }),
    queryFn: () => orderService.listForMerchant({ limit: 100 }),
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
    <div className="relative rounded-2xl bg-console-panel p-4 text-white shadow-2xl shadow-purple-950/30 sm:p-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
        <div className="absolute -left-28 -top-28 h-80 w-80 rounded-full bg-purple-600/20 blur-3xl" />
        <div className="absolute -right-24 top-1/4 h-72 w-72 rounded-full bg-fuchsia-600/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
            backgroundSize: "36px 36px",
          }}
        />
      </div>

      <div className="relative">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
              <ShoppingBag size={22} className="text-purple-300" />
              <span className="text-purple-300">
                {t("merchant.orders.title")}
              </span>
            </h1>
          </div>
          <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-300">
            {t("merchant.orders.resultCount", {
              count: visibleOrders.length,
            })}
          </span>
        </div>

        <div className="mb-5 flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-semibold transition-all duration-150 sm:text-sm ${
                activeTab === tab.key
                  ? "border-purple-500 bg-purple-600 text-white shadow-md shadow-purple-900/40"
                  : "border-gray-600 bg-white/5 text-slate-300 hover:border-gray-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative z-30 mb-5 flex flex-wrap items-center gap-2">
          <div className="relative min-w-64 flex-1">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
              size={17}
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("merchant.orders.searchPlaceholder")}
              className="w-full rounded-xl border border-gray-500 bg-white/5 py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-purple-400/70 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
            />
          </div>
          <select
            value={year}
            onChange={(event) => {
              setYear(Number(event.target.value));
              setMonth(0);
              setDay(0);
            }}
            aria-label={t("merchant.orders.filterYearAll")}
            className="rounded-xl border border-gray-500 bg-white/5 px-3 py-2.5 text-sm text-slate-200 focus:border-purple-400/70 focus:outline-none focus:ring-2 focus:ring-purple-500/30 [&>option]:bg-console-panel-raised [&>option]:text-white"
          >
            <option value={0}>{t("merchant.orders.filterYearAll")}</option>
            {years.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <select
            value={month}
            disabled={!year}
            onChange={(event) => {
              setMonth(Number(event.target.value));
              setDay(0);
            }}
            aria-label={t("merchant.orders.filterMonthAll")}
            className="rounded-xl border border-gray-500 bg-white/5 px-3 py-2.5 text-sm text-slate-200 focus:border-purple-400/70 focus:outline-none focus:ring-2 focus:ring-purple-500/30 disabled:cursor-not-allowed disabled:opacity-40 [&>option]:bg-console-panel-raised [&>option]:text-white"
          >
            <option value={0}>{t("merchant.orders.filterMonthAll")}</option>
            {Array.from({ length: 12 }, (_, index) => (
              <option key={index + 1} value={index + 1}>
                {t("merchant.orders.monthFormat", { month: index + 1 })}
              </option>
            ))}
          </select>
          <select
            value={day}
            disabled={!month}
            onChange={(event) => setDay(Number(event.target.value))}
            aria-label={t("merchant.orders.filterDayAll")}
            className="rounded-xl border border-gray-500 bg-white/5 px-3 py-2.5 text-sm text-slate-200 focus:border-purple-400/70 focus:outline-none focus:ring-2 focus:ring-purple-500/30 disabled:cursor-not-allowed disabled:opacity-40 [&>option]:bg-console-panel-raised [&>option]:text-white"
          >
            <option value={0}>{t("merchant.orders.filterDayAll")}</option>
            {Array.from({ length: daysInMonth }, (_, index) => (
              <option key={index + 1} value={index + 1}>
                {index + 1}
              </option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-purple-400" size={28} />
          </div>
        ) : visibleOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-600 bg-white/[0.03] px-6 py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/15 text-purple-300">
              <Package size={34} />
            </div>
            <h3 className="text-lg font-semibold text-white">
              {t("merchant.orders.emptyTitle")}
            </h3>
            <p className="mt-1 max-w-sm text-sm text-slate-400">
              {t("merchant.orders.emptyDesc")}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-600 bg-white/[0.04]">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.03]">
                    <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      {t("merchant.orders.tableOrder")}
                    </th>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      {t("merchant.orders.tableCustomer")}
                    </th>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      {t("merchant.orders.tableTotal")}
                    </th>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      {t("merchant.orders.tableStatus")}
                    </th>
                    <th className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">
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
                        className="border-b border-white/5 transition-colors last:border-0 hover:bg-white/[0.04]"
                      >
                        <td className="px-6 py-4">
                          <p className="font-mono text-sm font-semibold text-white">
                            #{order.orderId.slice(0, 8).toUpperCase()}
                          </p>
                          <p className="text-xs text-slate-400">
                            {new Date(order.createdAt).toLocaleDateString(
                              "vi-VN",
                            )}
                          </p>
                        </td>
                        <td className="max-w-[180px] truncate px-6 py-4 text-sm text-slate-300">
                          {order.userId.slice(0, 8)}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-white">
                          {formatCurrency(order.totalAmount, order.currency)}
                        </td>
                        <td className="px-6 py-4">
                          {cfg && (
                            <Badge
                              variant={cfg.variant}
                              className="!rounded-full !px-2.5 !py-0.5 !text-[11px]"
                            >
                              {t(cfg.labelKey)}
                            </Badge>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1.5">
                            {order.status === "PLACED" && (
                              <>
                                <button
                                  type="button"
                                  disabled={isPending}
                                  onClick={() =>
                                    confirmMutation.mutate(order.orderId)
                                  }
                                  className="inline-flex items-center gap-1 rounded-lg bg-purple-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <Check size={13} />
                                  {t("merchant.orders.btnConfirm")}
                                </button>
                                <button
                                  type="button"
                                  disabled={isPending}
                                  aria-label={t("merchant.orders.btnReject")}
                                  onClick={() =>
                                    rejectMutation.mutate(order.orderId)
                                  }
                                  className="inline-flex items-center gap-1 rounded-lg border border-rose-400/30 px-2.5 py-1.5 text-xs font-semibold text-rose-300 transition-colors hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <X size={13} />
                                </button>
                              </>
                            )}
                            {(order.status === "PLACED" ||
                              order.status === "PREPARING") && (
                              <button
                                type="button"
                                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                                title={t("merchant.orders.btnEditShipping")}
                                onClick={() => setEditingShipping(order)}
                              >
                                <Truck size={16} />
                              </button>
                            )}
                            <button
                              type="button"
                              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
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
