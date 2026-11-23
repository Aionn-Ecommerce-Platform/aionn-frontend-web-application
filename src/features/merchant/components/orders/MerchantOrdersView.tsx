"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Eye,
  Loader2,
  Package,
  Search,
  ShoppingBag,
  Truck,
  X,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { Pagination } from "@/shared/ui";
import AuthGuard from "@/components/auth/AuthGuard";
import { orderService } from "@/lib/services";
import { qk } from "@/lib/query-keys";
import { getOrderStatus } from "@/lib/domain/status/order";
import { formatCurrency } from "@/shared/lib/utils";
import { getErrorMessage } from "@/shared/lib/errors";
import { useTranslation } from "@/hooks";
import type { Order } from "@/types";

const ORDER_FILTERS = [
  { key: "all", statuses: null },
  { key: "placed", statuses: ["PENDING", "APPROVED"] },
  { key: "preparing", statuses: ["PREPARING"] },
  { key: "shipped", statuses: ["SHIPPED"] },
  { key: "completed", statuses: ["COMPLETED"] },
  { key: "cancelled", statuses: ["CANCELLED", "REJECTED"] },
] as const;

type OrderFilterKey = (typeof ORDER_FILTERS)[number]["key"];

function statusesForFilter(key: OrderFilterKey): string[] | null {
  const statuses = ORDER_FILTERS.find((filter) => filter.key === key)?.statuses;
  return statuses ? [...statuses] : null;
}

function filterLabelKey(key: OrderFilterKey) {
  return `merchant.orders.tabs.${key}`;
}

function OrderStatusDropdown({
  value,
  onChange,
}: {
  value: OrderFilterKey;
  onChange: (value: OrderFilterKey) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 rounded-xl border border-gray-500 bg-white/5 px-3.5 py-2.5 text-sm font-medium text-slate-200 shadow-sm transition-all hover:border-gray-400 hover:bg-white/10 focus:border-purple-400/70 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
        aria-expanded={open}
      >
        <span className="text-slate-400">
          {t("merchant.orders.statusFilterLabel")}:
        </span>
        <span>{t(filterLabelKey(value))}</span>
        <ChevronDown
          size={14}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-2 w-52 overflow-hidden rounded-xl border border-gray-500 bg-console-panel-raised py-1 shadow-2xl shadow-black/40">
          {ORDER_FILTERS.map((filter) => {
            const active = value === filter.key;
            return (
              <button
                key={filter.key}
                type="button"
                onClick={() => {
                  onChange(filter.key);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-purple-500/20 font-semibold text-purple-200"
                    : "text-slate-300 hover:bg-white/5"
                }`}
              >
                <span className="truncate">
                  {t(filterLabelKey(filter.key))}
                </span>
                {active && (
                  <Check size={14} className="ml-2 shrink-0 text-purple-300" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterDropdown({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const current =
    options.find((option) => option.value === value) ?? options[0];

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 rounded-xl border border-gray-500 bg-white/5 px-3.5 py-2.5 text-sm font-medium text-slate-200 shadow-sm transition-all hover:border-gray-400 hover:bg-white/10 focus:border-purple-400/70 focus:outline-none focus:ring-2 focus:ring-purple-500/30 disabled:cursor-not-allowed disabled:opacity-40"
        aria-expanded={open}
      >
        <span className="text-slate-400">{label}:</span>
        <span>{current?.label}</span>
        <ChevronDown
          size={14}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && !disabled && (
        <div className="absolute left-0 z-50 mt-2 max-h-72 w-48 overflow-y-auto rounded-xl border border-gray-500 bg-console-panel-raised py-1 shadow-2xl shadow-black/40">
          {options.map((option) => {
            const active = value === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-purple-500/20 font-semibold text-purple-200"
                    : "text-slate-300 hover:bg-white/5"
                }`}
              >
                <span className="truncate">{option.label}</span>
                {active && (
                  <Check size={14} className="ml-2 shrink-0 text-purple-300" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const ORDER_BADGE_CLASS: Record<string, string> = {
  default: "border-slate-500/40 bg-white/5 text-slate-300",
  info: "border-sky-400/30 bg-sky-400/10 text-sky-300",
  success: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  warning: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  danger: "border-rose-400/30 bg-rose-400/10 text-rose-300",
};

function MerchantOrdersInner() {
  const { t, locale } = useTranslation();
  const [activeTab, setActiveTab] = useState<OrderFilterKey>("all");
  const [search, setSearch] = useState("");
  const [year, setYear] = useState(0);
  const [month, setMonth] = useState(0);
  const [day, setDay] = useState(0);
  const qc = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [editingShipping, setEditingShipping] = useState<Order | null>(null);

  const PAGE_SIZE = 50;
  const filterKey = [activeTab, search, year, month, day].join("|");
  const [pageState, setPageState] = useState({ key: filterKey, page: 1 });
  const page = pageState.key === filterKey ? pageState.page : 1;
  const setPage = (next: number) =>
    setPageState({ key: filterKey, page: next });

  const dateRange = useMemo(() => {
    if (!year) return { from: undefined, to: undefined };
    const start = new Date(year, (month || 1) - 1, day || 1);
    let end: Date;
    if (day) {
      end = new Date(year, month - 1, day + 1);
    } else if (month) {
      end = new Date(year, month, 1);
    } else {
      end = new Date(year + 1, 0, 1);
    }
    return { from: start.toISOString(), to: end.toISOString() };
  }, [day, month, year]);

  const statusParam = statusesForFilter(activeTab)?.join(",") ?? undefined;

  const { data: orderPage, isLoading } = useQuery({
    queryKey: qk.merchantOrders({
      page,
      activeTab,
      search: search.trim(),
      year,
      month,
      day,
    }),
    queryFn: () =>
      orderService.listForMerchant({
        status: statusParam,
        search: search.trim() || undefined,
        from: dateRange.from,
        to: dateRange.to,
        page: page - 1,
        limit: PAGE_SIZE,
      }),
  });

  const orders = useMemo(() => orderPage?.content ?? [], [orderPage]);
  const totalPages = orderPage?.totalPages ?? 1;
  const safePage = Math.min(page, totalPages);

  const { data: statsData } = useQuery({
    queryKey: ["merchant-order-stats"],
    queryFn: () => orderService.merchantOrderStats(),
  });

  const years = useMemo(
    () =>
      Array.from(
        new Set(orders.map((order) => new Date(order.createdAt).getFullYear())),
      ).sort((a, b) => b - a),
    [orders],
  );
  const daysInMonth = year && month ? new Date(year, month, 0).getDate() : 31;

  const confirmMutation = useMutation({
    mutationFn: (orderId: string) => orderService.confirmPreparation(orderId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["merchant-order-stats"] });
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
      qc.invalidateQueries({ queryKey: ["merchant-order-stats"] });
      toast.success(t("merchant.orders.toastRejected"));
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const numberFormat = new Intl.NumberFormat(
    locale === "vi" ? "vi-VN" : "en-US",
  );
  const hasFilters = Boolean(
    search || activeTab !== "all" || year || month || day,
  );

  function clearFilters() {
    setSearch("");
    setActiveTab("all");
    setYear(0);
    setMonth(0);
    setDay(0);
  }

  const countStatus = (...statuses: string[]) =>
    statuses.reduce((sum, status) => sum + (statsData?.[status] ?? 0), 0);
  const totalOrders = Object.values(statsData ?? {}).reduce(
    (sum, value) => sum + value,
    0,
  );

  const orderStats = [
    {
      label: t("merchant.orders.stats.total"),
      value: numberFormat.format(totalOrders),
      icon: ShoppingBag,
      iconClass: "text-purple-300",
    },
    {
      label: t("merchant.orders.stats.placed"),
      value: numberFormat.format(countStatus("PENDING", "APPROVED")),
      icon: Clock3,
      iconClass: "text-amber-300",
    },
    {
      label: t("merchant.orders.stats.preparing"),
      value: numberFormat.format(countStatus("PREPARING")),
      icon: Package,
      iconClass: "text-fuchsia-300",
    },
    {
      label: t("merchant.orders.stats.shipped"),
      value: numberFormat.format(countStatus("SHIPPED")),
      icon: Truck,
      iconClass: "text-sky-300",
    },
    {
      label: t("merchant.orders.stats.completed"),
      value: numberFormat.format(countStatus("COMPLETED")),
      icon: CheckCircle2,
      iconClass: "text-emerald-300",
    },
    {
      label: t("merchant.orders.stats.cancelled"),
      value: numberFormat.format(countStatus("CANCELLED", "REJECTED")),
      icon: XCircle,
      iconClass: "text-rose-300",
    },
  ];

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
        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
            <ShoppingBag size={22} className="text-purple-300" />
            <span className="text-purple-300">
              {t("merchant.orders.title")}
            </span>
          </h1>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {orderStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="flex items-center gap-3 rounded-2xl border border-gray-600 bg-white/[0.04] p-3.5"
              >
                <Icon
                  size={24}
                  strokeWidth={2.2}
                  className={`shrink-0 ${stat.iconClass}`}
                />
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    {stat.label}
                  </p>
                  <p className="truncate text-xl font-extrabold text-white">
                    {stat.value}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="relative z-30 mb-5 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-64 flex-1">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                size={17}
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("merchant.orders.searchPlaceholder")}
                className="w-full rounded-xl border border-gray-500 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-purple-400/70 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
              />
            </div>
            <OrderStatusDropdown value={activeTab} onChange={setActiveTab} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FilterDropdown
              label={t("merchant.orders.filterYearLabel")}
              value={String(year)}
              options={[
                { value: "0", label: t("merchant.orders.filterAll") },
                ...years.map((value) => ({
                  value: String(value),
                  label: String(value),
                })),
              ]}
              onChange={(value) => {
                setYear(Number(value));
                setMonth(0);
                setDay(0);
              }}
            />
            <FilterDropdown
              label={t("merchant.orders.filterMonthLabel")}
              value={String(month)}
              disabled={!year}
              options={[
                { value: "0", label: t("merchant.orders.filterAll") },
                ...Array.from({ length: 12 }, (_, index) => ({
                  value: String(index + 1),
                  label: t("merchant.orders.monthFormat", { month: index + 1 }),
                })),
              ]}
              onChange={(value) => {
                setMonth(Number(value));
                setDay(0);
              }}
            />
            <FilterDropdown
              label={t("merchant.orders.filterDayLabel")}
              value={String(day)}
              disabled={!year || !month}
              options={[
                { value: "0", label: t("merchant.orders.filterAll") },
                ...Array.from({ length: daysInMonth }, (_, index) => ({
                  value: String(index + 1),
                  label: String(index + 1),
                })),
              ]}
              onChange={(value) => setDay(Number(value))}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-purple-400" size={28} />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-600 bg-white/[0.03] px-6 py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/15 text-purple-300">
              <Package size={34} />
            </div>
            <h3 className="text-lg font-semibold text-white">
              {t(
                hasFilters
                  ? "merchant.orders.emptyFilteredTitle"
                  : "merchant.orders.emptyTitle",
              )}
            </h3>
            <p className="mt-1 max-w-sm text-sm text-slate-400">
              {t(
                hasFilters
                  ? "merchant.orders.emptyFilteredDesc"
                  : "merchant.orders.emptyDesc",
              )}
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-6 rounded-xl border border-gray-500 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/10"
              >
                {t("merchant.orders.clearFilters")}
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-2xl border border-gray-600 bg-white/[0.04]">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-600/60 bg-white/[0.03]">
                      <th className="whitespace-nowrap px-6 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        {t("merchant.orders.tableOrder")}
                      </th>
                      <th className="whitespace-nowrap px-6 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        {t("merchant.orders.tableCustomer")}
                      </th>
                      <th className="whitespace-nowrap px-6 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        {t("merchant.orders.tableTotal")}
                      </th>
                      <th className="whitespace-nowrap px-6 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        {t("merchant.orders.tableStatus")}
                      </th>
                      <th className="whitespace-nowrap px-6 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        {t("merchant.orders.tableActions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => {
                      const cfg = getOrderStatus(order.status);
                      const isPending =
                        confirmMutation.isPending || rejectMutation.isPending;
                      return (
                        <tr
                          key={order.orderId}
                          className="border-b border-slate-600/60 transition-colors last:border-0 hover:bg-white/[0.04]"
                        >
                          <td className="whitespace-nowrap px-6 py-4 text-center">
                            <p className="font-mono text-[13px] font-semibold text-white">
                              #{order.orderId}
                            </p>
                            <p className="text-xs text-slate-400">
                              {new Date(order.createdAt).toLocaleDateString(
                                "vi-VN",
                              )}
                            </p>
                          </td>
                          <td className="max-w-[220px] px-6 py-4 text-center">
                            <p className="truncate text-sm font-medium text-white">
                              {order.recipientName || order.userId}
                            </p>
                            {order.recipientPhone && (
                              <p className="text-xs text-slate-400">
                                {order.recipientPhone}
                              </p>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-center text-sm font-semibold text-white">
                            {formatCurrency(order.totalAmount, order.currency)}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-center">
                            {cfg && (
                              <span
                                className={`inline-flex items-center whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold ${ORDER_BADGE_CLASS[cfg.variant]}`}
                              >
                                {t(cfg.labelKey)}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-1">
                              {order.status === "APPROVED" && (
                                <>
                                  <button
                                    type="button"
                                    disabled={isPending}
                                    onClick={() =>
                                      confirmMutation.mutate(order.orderId)
                                    }
                                    className="rounded-lg p-1.5 text-emerald-400 transition-colors hover:bg-emerald-500/10 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                                    title={t("merchant.orders.btnConfirm")}
                                    aria-label={t("merchant.orders.btnConfirm")}
                                  >
                                    <Check size={15} />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isPending}
                                    aria-label={t("merchant.orders.btnReject")}
                                    title={t("merchant.orders.btnReject")}
                                    onClick={() =>
                                      rejectMutation.mutate(order.orderId)
                                    }
                                    className="rounded-lg p-1.5 text-rose-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    <X size={15} />
                                  </button>
                                </>
                              )}
                              {(order.status === "APPROVED" ||
                                order.status === "PREPARING") && (
                                <button
                                  type="button"
                                  className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                                  title={t("merchant.orders.btnEditShipping")}
                                  aria-label={t(
                                    "merchant.orders.btnEditShipping",
                                  )}
                                  onClick={() => setEditingShipping(order)}
                                >
                                  <Truck size={15} />
                                </button>
                              )}
                              <button
                                type="button"
                                className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                                title={t("merchant.orders.btnDetail")}
                                aria-label={t("merchant.orders.btnDetail")}
                                onClick={() => setSelectedOrder(order)}
                              >
                                <Eye size={15} />
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
            <Pagination
              currentPage={safePage}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </>
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
