"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  Loader2,
  Package,
  ShoppingBag,
  Truck,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  Badge,
  Button,
  FilterDropdown,
  Input,
  Modal,
  Pagination,
} from "@/shared/ui";
import {
  AdminEmpty,
  AdminHeader,
  AdminPill,
  AdminSearch,
  AdminStats,
  AdminTable,
  adminRow,
  adminTd,
} from "@/features/admin";
import AuthGuard from "@/components/auth/AuthGuard";
import {
  orderService,
  adminUserService,
  merchantService,
} from "@/lib/services";
import { getOrderStatus } from "@/lib/domain/status/order";
import { getErrorMessage } from "@/shared/lib/errors";
import { formatCurrency, formatDateTime } from "@/shared/lib/utils";
import { useDebounce, useTranslation } from "@/hooks";
import type { Order } from "@/types";

const PAGE_SIZE = 50;

const ORDER_FILTERS = [
  { key: "all", statuses: null, labelKey: "common.all" },
  {
    key: "placed",
    statuses: ["PENDING", "APPROVED"],
    labelKey: "common.pending",
  },
  {
    key: "preparing",
    statuses: ["PREPARING"],
    labelKey: "orders.statusPreparing",
  },
  { key: "shipped", statuses: ["SHIPPED"], labelKey: "orders.statusShipped" },
  {
    key: "completed",
    statuses: ["COMPLETED"],
    labelKey: "orders.statusCompleted",
  },
  {
    key: "cancelled",
    statuses: ["CANCELLED", "REJECTED"],
    labelKey: "orders.statusCancelled",
  },
] as const;

type OrderFilterKey = (typeof ORDER_FILTERS)[number]["key"];

const ORDER_TONE = {
  default: "neutral",
  info: "info",
  success: "success",
  warning: "warning",
  danger: "danger",
} as const;

const centerTh =
  "whitespace-nowrap px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400";

function AdminOrdersInner() {
  const { t, locale } = useTranslation();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<OrderFilterKey>("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [shipOpen, setShipOpen] = useState(false);
  const [shipmentId, setShipmentId] = useState("");

  const filterKey = `${activeTab}|${debouncedSearch.trim()}`;
  const [pageState, setPageState] = useState({ key: filterKey, page: 1 });
  const page = pageState.key === filterKey ? pageState.page : 1;
  const setPage = (next: number) =>
    setPageState({ key: filterKey, page: next });

  const activeFilter =
    ORDER_FILTERS.find((filter) => filter.key === activeTab) ??
    ORDER_FILTERS[0];
  const statusParam = activeFilter.statuses?.join(",");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [
      "admin-orders",
      { tab: activeTab, search: debouncedSearch.trim(), page },
    ],
    queryFn: () =>
      orderService.adminList({
        status: statusParam,
        search: debouncedSearch.trim() || undefined,
        page: page - 1,
        size: PAGE_SIZE,
      }),
  });

  const orders = data?.content ?? [];
  const totalElements = data?.totalElements ?? 0;
  const totalPages = Math.max(1, data?.totalPages ?? 1);

  const userIds = [...new Set(orders.map((order) => order.userId))];
  const merchantIds = [...new Set(orders.map((order) => order.merchantId))];

  const { data: orderUsers } = useQuery({
    queryKey: ["admin-order-users", userIds.join(",")],
    queryFn: async () => {
      const rows = await Promise.all(
        userIds.map((id) => adminUserService.get(id).catch(() => null)),
      );
      return new Map(
        rows
          .filter((row): row is NonNullable<typeof row> => row !== null)
          .map((row) => [row.userId, row]),
      );
    },
    enabled: userIds.length > 0,
  });

  const { data: orderMerchants } = useQuery({
    queryKey: ["admin-order-merchants", merchantIds.join(",")],
    queryFn: async () => {
      const rows = await Promise.all(
        merchantIds.map((id) => merchantService.get(id).catch(() => null)),
      );
      return new Map(
        rows
          .filter((row): row is NonNullable<typeof row> => row !== null)
          .map((row) => [row.merchantId, row]),
      );
    },
    enabled: merchantIds.length > 0,
  });

  const { data: orderCounts } = useQuery({
    queryKey: ["admin-order-counts"],
    queryFn: async () => {
      const groups = ORDER_FILTERS.map((filter) => ({
        key: filter.key,
        status: filter.statuses?.join(","),
      }));
      const results = await Promise.all(
        groups.map((group) =>
          orderService
            .adminList({
              status: group.status,
              page: 0,
              size: 1,
            })
            .catch(() => null),
        ),
      );
      return groups.reduce<Record<string, number>>((acc, group, index) => {
        acc[group.key] = results[index]?.totalElements ?? 0;
        return acc;
      }, {});
    },
  });

  function closeDetail() {
    setSelectedOrder(null);
    setShipOpen(false);
    setShipmentId("");
  }

  const shipMutation = useMutation({
    mutationFn: ({ id, shipmentId }: { id: string; shipmentId: string }) =>
      orderService.ship(id, { shipmentId }),
    onSuccess: () => {
      toast.success(t("adminOrders.shipSuccess"));
      closeDetail();
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => orderService.complete(id),
    onSuccess: () => {
      toast.success(t("adminOrders.completeSuccess"));
      closeDetail();
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const selectedStatus = selectedOrder
    ? getOrderStatus(selectedOrder.status)
    : null;

  return (
    <div className="min-h-screen">
      <AdminHeader icon={Package} title={t("adminOrders.title")} />

      <AdminStats
        stats={[
          {
            label: t("merchant.orders.stats.total"),
            value: orderCounts?.all ?? totalElements,
            icon: ShoppingBag,
          },
          {
            label: t("merchant.orders.stats.placed"),
            value: orderCounts?.placed ?? 0,
            icon: Package,
            iconClass: "text-amber-300",
          },
          {
            label: t("merchant.orders.stats.preparing"),
            value: orderCounts?.preparing ?? 0,
            icon: Clock,
            iconClass: "text-sky-300",
          },
          {
            label: t("merchant.orders.stats.shipped"),
            value: orderCounts?.shipped ?? 0,
            icon: Truck,
            iconClass: "text-cyan-300",
          },
          {
            label: t("merchant.orders.stats.completed"),
            value: orderCounts?.completed ?? 0,
            icon: CheckCircle2,
            iconClass: "text-emerald-300",
          },
          {
            label: t("merchant.orders.stats.cancelled"),
            value: orderCounts?.cancelled ?? 0,
            icon: XCircle,
            iconClass: "text-rose-300",
          },
        ]}
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-64 flex-1">
          <AdminSearch
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder={t("adminOrders.searchPlaceholder")}
            ariaLabel={t("adminOrders.searchPlaceholder")}
            fullWidth
          />
        </div>
        <FilterDropdown
          label={t("common.status")}
          value={activeTab}
          onChange={(value) => {
            setActiveTab(value as OrderFilterKey);
            setPage(1);
          }}
          options={ORDER_FILTERS.map((filter) => ({
            value: filter.key,
            label: t(filter.labelKey),
          }))}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-purple-300" size={28} />
        </div>
      ) : isError ? (
        <AdminEmpty
          icon={AlertCircle}
          title={t("common.error")}
          description={getErrorMessage(error)}
          action={
            <Button variant="outline" onClick={() => void refetch()}>
              {t("common.tryAgain")}
            </Button>
          }
        />
      ) : orders.length === 0 ? (
        <AdminEmpty
          icon={Package}
          title={t("merchant.orders.emptyTitle")}
          description={t("merchant.orders.emptyDesc")}
        />
      ) : (
        <>
          <AdminTable>
            <thead>
              <tr className="border-b border-slate-600/60 bg-white/[0.03]">
                <th className={centerTh}>{t("merchant.orders.tableOrder")}</th>
                <th className={centerTh}>
                  {t("merchant.orders.tableCustomer")}
                </th>
                <th className={centerTh}>{t("orders.store")}</th>
                <th className={centerTh}>{t("merchant.orders.tableTotal")}</th>
                <th className={centerTh}>{t("merchant.orders.tableStatus")}</th>
                <th className={centerTh}>{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const cfg = getOrderStatus(order.status);
                const buyer = orderUsers?.get(order.userId);
                const store = orderMerchants?.get(order.merchantId);
                return (
                  <tr key={order.orderId} className={adminRow}>
                    <td className={`${adminTd} text-center`}>
                      <p className="font-mono text-[13px] font-semibold text-white">
                        {order.orderId}
                      </p>
                      <p className="text-xs text-slate-400">
                        {formatDateTime(order.createdAt, locale)}
                      </p>
                    </td>
                    <td className={`${adminTd} text-center`}>
                      <p className="mx-auto max-w-[200px] truncate text-sm font-medium text-white">
                        {buyer?.displayName ?? buyer?.username ?? "—"}
                      </p>
                      {buyer?.email && (
                        <p className="mx-auto max-w-[200px] truncate text-xs text-slate-400">
                          {buyer.email}
                        </p>
                      )}
                    </td>
                    <td className={`${adminTd} text-center`}>
                      <p className="mx-auto max-w-[200px] truncate text-sm font-medium text-white">
                        {store?.name ?? "—"}
                      </p>
                    </td>
                    <td className={`${adminTd} text-center`}>
                      <p className="whitespace-nowrap font-semibold text-white">
                        {formatCurrency(
                          order.totalAmount + order.shippingFee,
                          order.currency,
                        )}
                      </p>
                    </td>
                    <td className={`${adminTd} text-center`}>
                      {cfg && (
                        <AdminPill tone={ORDER_TONE[cfg.variant]}>
                          {t(cfg.labelKey)}
                        </AdminPill>
                      )}
                    </td>
                    <td className={`${adminTd} text-center`}>
                      <button
                        type="button"
                        onClick={() => setSelectedOrder(order)}
                        aria-label={t("common.view")}
                        className="inline-flex cursor-pointer items-center justify-center rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </AdminTable>

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      )}

      <Modal
        isOpen={!!selectedOrder}
        onClose={closeDetail}
        title={t("merchant.orders.detailTitle")}
        size="full"
      >
        {selectedOrder && (
          <div className="max-h-[80vh] space-y-5 overflow-y-auto pr-2">
            <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
              <div>
                <p className="text-gray-500">
                  {t("merchant.orders.detailOrderId")}
                </p>
                <p className="break-all font-mono font-semibold text-gray-900">
                  {selectedOrder.orderId}
                </p>
                {selectedOrder.orderSn && (
                  <p className="break-all font-mono text-xs text-gray-400">
                    {selectedOrder.orderSn}
                  </p>
                )}
              </div>
              <div>
                <p className="text-gray-500">
                  {t("merchant.orders.detailOrderDate")}
                </p>
                <p className="font-medium text-gray-900">
                  {formatDateTime(selectedOrder.createdAt, locale)}
                </p>
              </div>
              <div>
                <p className="text-gray-500">
                  {t("merchant.orders.detailStatus")}
                </p>
                {selectedStatus && (
                  <Badge
                    variant={selectedStatus.variant}
                    className="!mt-1 !rounded-full !px-3 !py-1 !text-xs"
                  >
                    {t(selectedStatus.labelKey)}
                  </Badge>
                )}
              </div>
              <div>
                <p className="text-gray-500">
                  {t("merchant.orders.tableCustomer")}
                </p>
                <p className="font-medium text-gray-900">
                  {orderUsers?.get(selectedOrder.userId)?.displayName ??
                    orderUsers?.get(selectedOrder.userId)?.username ??
                    selectedOrder.userId}
                </p>
                {orderUsers?.get(selectedOrder.userId)?.email && (
                  <p className="text-xs text-gray-500">
                    {orderUsers.get(selectedOrder.userId)?.email}
                  </p>
                )}
              </div>
              <div>
                <p className="text-gray-500">{t("orders.store")}</p>
                <p className="font-medium text-gray-900">
                  {orderMerchants?.get(selectedOrder.merchantId)?.name ??
                    selectedOrder.merchantId}
                </p>
              </div>
              <div>
                <p className="text-gray-500">
                  {t("merchant.orders.detailPayment")}
                </p>
                <p className="break-all font-mono font-medium text-gray-900">
                  {selectedOrder.paymentId ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-gray-500">{t("common.total")}</p>
                <p className="font-bold text-gray-900">
                  {formatCurrency(
                    selectedOrder.totalAmount + selectedOrder.shippingFee,
                    selectedOrder.currency,
                  )}
                </p>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Package size={14} />
                {t("adminOrders.items", { count: selectedOrder.items.length })}
              </p>
              <div className="space-y-1 text-xs">
                {selectedOrder.items.map((item) => (
                  <div
                    key={item.skuId}
                    className="flex items-center justify-between border-b border-gray-100 py-1.5 font-mono last:border-0"
                  >
                    <span className="text-gray-700">
                      {item.skuId}{" "}
                      <span className="text-gray-400">x{item.qty}</span>
                    </span>
                    <span className="text-gray-600">
                      {formatCurrency(item.unitPrice, selectedOrder.currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-gray-200 pt-4">
              {selectedOrder.status === "PREPARING" &&
                (shipOpen ? (
                  <div className="w-full space-y-3">
                    <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                      <AlertCircle size={14} className="mt-0.5 shrink-0" />
                      <p>{t("adminOrders.shipWarning")}</p>
                    </div>
                    <Input
                      label={t("merchant.orders.shipmentId")}
                      value={shipmentId}
                      onChange={(e) => setShipmentId(e.target.value)}
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShipOpen(false);
                          setShipmentId("");
                        }}
                      >
                        {t("common.cancel")}
                      </Button>
                      <Button
                        loading={shipMutation.isPending}
                        disabled={!shipmentId.trim()}
                        onClick={() =>
                          shipMutation.mutate({
                            id: selectedOrder.orderId,
                            shipmentId: shipmentId.trim(),
                          })
                        }
                      >
                        <Truck size={14} className="mr-1" />
                        {t("adminOrders.markShipped")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShipOpen(true)}
                  >
                    <Truck size={14} className="mr-1" />
                    {t("adminOrders.markShipped")}
                  </Button>
                ))}
              {(selectedOrder.status === "SHIPPED" ||
                selectedOrder.status === "DELIVERED") && (
                <Button
                  variant="primary"
                  size="sm"
                  loading={completeMutation.isPending}
                  onClick={() => completeMutation.mutate(selectedOrder.orderId)}
                >
                  <CheckCircle2 size={14} className="mr-1" />
                  {t("adminOrders.markComplete")}
                </Button>
              )}
              {selectedOrder.status !== "PREPARING" &&
                selectedOrder.status !== "SHIPPED" &&
                selectedOrder.status !== "DELIVERED" && (
                  <p className="text-sm text-gray-500">
                    {t("adminOrders.noOverride", {
                      status: selectedStatus
                        ? t(selectedStatus.labelKey)
                        : selectedOrder.status,
                    })}
                  </p>
                )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <AuthGuard requiredRoles={["SYSTEM_ADMIN", "CS_ADMIN"]}>
      <AdminOrdersInner />
    </AuthGuard>
  );
}
