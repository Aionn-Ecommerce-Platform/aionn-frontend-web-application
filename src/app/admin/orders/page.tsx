"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Loader2,
  AlertTriangle,
  Truck,
  CheckCircle2,
  Package,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button, Badge, Input, Modal } from "@/shared/ui";
import AuthGuard from "@/components/auth/AuthGuard";
import { orderService } from "@/lib/services";
import { getOrderStatus } from "@/lib/domain/status/order";
import { getErrorMessage } from "@/shared/lib/errors";
import { formatCurrency, formatDateTime } from "@/shared/lib/utils";
import { useTranslation } from "@/hooks";

function AdminOrdersInner() {
  const { t, locale } = useTranslation();
  const qc = useQueryClient();
  const [orderInput, setOrderInput] = useState("");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [shipOpen, setShipOpen] = useState(false);
  const [shipmentId, setShipmentId] = useState("");

  const {
    data: order,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin-order", orderId],
    queryFn: () => (orderId ? orderService.get(orderId) : null),
    enabled: !!orderId,
    retry: false,
  });

  const shipMutation = useMutation({
    mutationFn: ({ id, shipmentId }: { id: string; shipmentId: string }) =>
      orderService.ship(id, { shipmentId }),
    onSuccess: () => {
      toast.success(t("adminOrders.shipSuccess"));
      setShipOpen(false);
      setShipmentId("");
      qc.invalidateQueries({ queryKey: ["admin-order"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => orderService.complete(id),
    onSuccess: () => {
      toast.success(t("adminOrders.completeSuccess"));
      qc.invalidateQueries({ queryKey: ["admin-order"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  function handleLookup() {
    const id = orderInput.trim();
    if (!id) {
      toast.error(t("adminOrders.orderIdRequired"));
      return;
    }
    setOrderId(id);
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            {t("adminOrders.title")}
          </h1>
          <p className="text-sm text-gray-500">
            {t("adminOrders.description")}
          </p>
        </div>

        <div className="bg-white rounded-md border border-gray-200 p-6">
          <div className="flex items-end gap-3">
            <Input
              label="Order ID"
              value={orderInput}
              onChange={(e) => setOrderInput(e.target.value)}
              placeholder="ORD_..."
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleLookup();
              }}
            />
            <Button onClick={handleLookup} disabled={!orderInput.trim()}>
              <Search size={14} className="mr-1" />
              {t("common.lookup")}
            </Button>
          </div>
        </div>

        {isLoading && (
          <div className="bg-white rounded-md border border-gray-200 p-12 flex justify-center">
            <Loader2 className="animate-spin text-blue-600" size={28} />
          </div>
        )}

        {error && orderId && !isLoading && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-start gap-3">
            <AlertTriangle size={18} className="text-red-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">
                {t("adminOrders.notFound")}
              </p>
              <p className="text-xs text-red-600 mt-1">
                {getErrorMessage(error)}
              </p>
            </div>
          </div>
        )}

        {order && (
          <div className="bg-white rounded-md border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 font-mono">
                  {order.orderId}
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  {t("adminOrders.createdAt", {
                    date: formatDateTime(order.createdAt, locale),
                  })}
                </p>
              </div>
              {getOrderStatus(order.status) && (
                <Badge variant={getOrderStatus(order.status)?.variant}>
                  {t(getOrderStatus(order.status)!.labelKey)}
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 text-sm">
              <div>
                <p className="text-gray-500">User</p>
                <p className="font-mono text-gray-900 mt-0.5">{order.userId}</p>
              </div>
              <div>
                <p className="text-gray-500">Merchant</p>
                <p className="font-mono text-gray-900 mt-0.5">
                  {order.merchantId}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Payment ID</p>
                <p className="font-mono text-gray-900 mt-0.5">
                  {order.paymentId ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-gray-500">{t("common.total")}</p>
                <p className="font-bold text--commerce mt-0.5">
                  {formatCurrency(
                    order.totalAmount + order.shippingFee,
                    order.currency,
                  )}
                </p>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4 mb-4">
              <p className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Package size={14} />
                {t("adminOrders.items", { count: order.items.length })}
              </p>
              <div className="space-y-1 text-xs">
                {order.items.map((item) => (
                  <div
                    key={item.skuId}
                    className="flex items-center justify-between py-1 font-mono"
                  >
                    <span>
                      {item.skuId}{" "}
                      <span className="text-gray-400">x{item.qty}</span>
                    </span>
                    <span className="text-gray-700">
                      {formatCurrency(item.unitPrice, order.currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
              {order.status === "PREPARING" && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShipOpen(true)}
                >
                  <Truck size={14} className="mr-1" />
                  {t("adminOrders.markShipped")}
                </Button>
              )}
              {(order.status === "SHIPPED" || order.status === "DELIVERED") && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => completeMutation.mutate(order.orderId)}
                  loading={completeMutation.isPending}
                >
                  <CheckCircle2 size={14} className="mr-1" />
                  {t("adminOrders.markComplete")}
                </Button>
              )}
              {order.status !== "PREPARING" &&
                order.status !== "SHIPPED" &&
                order.status !== "DELIVERED" && (
                  <p className="text-sm text-gray-500">
                    {t("adminOrders.noOverride", { status: order.status })}
                  </p>
                )}
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={shipOpen}
        onClose={() => {
          setShipOpen(false);
          setShipmentId("");
        }}
        title={t("adminOrders.shipTitle")}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 p-3 rounded-lg">
            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
            <p>{t("adminOrders.shipWarning")}</p>
          </div>
          <Input
            label="Shipment ID *"
            value={shipmentId}
            onChange={(e) => setShipmentId(e.target.value)}
            placeholder="SHIP_..."
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
                order &&
                shipMutation.mutate({
                  id: order.orderId,
                  shipmentId: shipmentId.trim(),
                })
              }
            >
              {t("adminOrders.markShipped")}
            </Button>
          </div>
        </div>
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
