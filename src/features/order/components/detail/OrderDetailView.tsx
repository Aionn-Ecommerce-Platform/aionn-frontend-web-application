"use client";

import Link from "next/link";
import Image from "next/image";
import { use, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  MapPin,
  Loader2,
  PackageX,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button, Badge, EmptyState, ConfirmDialog } from "@/shared/ui";
import AuthGuard from "@/components/auth/AuthGuard";
import MemberPageLayout from "@/components/layout/MemberPageLayout";
import {
  orderService,
  shippingService,
  productService,
  addressService,
  paymentMethodService,
} from "@/lib/services";
import { qk } from "@/lib/query-keys";
import { getOrderStatus } from "@/lib/domain/status/order";
import { formatVariantLabel } from "@/shared/lib/product-utils";
import { formatCurrency, formatDateTime } from "@/shared/lib/utils";
import { getErrorMessage } from "@/shared/lib/errors";
import { useTranslation } from "@/hooks";
import OrderShipmentPanel from "./OrderShipmentPanel";

const STATUS_FLOW: Array<{
  key: string;
  labelKey: string;
  icon: typeof Package;
  matches: string[];
}> = [
  {
    key: "PLACED",
    labelKey: "orders.statusPlaced",
    icon: Package,
    matches: ["PLACED", "PENDING", "APPROVED"],
  },
  {
    key: "PREPARING",
    labelKey: "orders.statusPreparing",
    icon: Clock,
    matches: ["PREPARING"],
  },
  {
    key: "SHIPPED",
    labelKey: "orders.statusShipped",
    icon: Truck,
    matches: ["SHIPPED", "DELIVERED"],
  },
  {
    key: "COMPLETED",
    labelKey: "orders.statusCompleted",
    icon: CheckCircle,
    matches: ["COMPLETED"],
  },
];

function OrderDetailInner({ id }: { id: string }) {
  const qc = useQueryClient();
  const { t, locale } = useTranslation();
  const [confirmCancel, setConfirmCancel] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: qk.order(id),
    queryFn: () => orderService.get(id),
  });

  const { data: shipments } = useQuery({
    queryKey: qk.shipments(id),
    queryFn: () => shippingService.listByOrder(id),
    enabled: !!order,
  });

  const orderSkuIds = order?.items.map((it) => it.skuId) ?? [];
  const { data: orderProducts = [] } = useQuery({
    queryKey: ["order-products", id, orderSkuIds.join(",")],
    queryFn: () => productService.resolveBySkuIds(orderSkuIds),
    enabled: !!order && orderSkuIds.length > 0,
  });

  const { data: addresses = [] } = useQuery({
    queryKey: qk.addresses,
    queryFn: () => addressService.list(),
    enabled: !!order,
  });

  const { data: paymentMethod } = useQuery({
    queryKey: ["payment-method", order?.paymentMethodId],
    queryFn: () => paymentMethodService.get(order!.paymentMethodId!),
    enabled:
      !!order?.paymentMethodId &&
      order.paymentMethodId !== "VNPAY" &&
      order.paymentMethodId !== "COD",
  });

  const skuLookup = new Map<
    string,
    {
      product: (typeof orderProducts)[number];
      variant: (typeof orderProducts)[number]["variants"][number];
    }
  >();
  orderProducts.forEach((p) => {
    p.variants.forEach((v) => {
      skuLookup.set(v.skuId, { product: p, variant: v });
    });
  });

  const orderAddress =
    addresses.find((a) => a.addressId === order?.addressId) ?? null;

  const shipment = shipments && shipments.length > 0 ? shipments[0] : null;

  const cancelMutation = useMutation({
    mutationFn: () => orderService.cancel(id, t("orders.cancelReasonCustomer")),
    onSuccess: (next) => {
      qc.setQueryData(qk.order(id), next);
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success(t("orders.orderCancelledSuccess"));
      setConfirmCancel(false);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const completeMutation = useMutation({
    mutationFn: () => orderService.complete(id),
    onSuccess: (next) => {
      qc.setQueryData(qk.order(id), next);
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success(t("orders.completeSuccess"));
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  if (isLoading) {
    return (
      <MemberPageLayout>
        <div className="min-h-[60vh] flex justify-center items-center">
          <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
      </MemberPageLayout>
    );
  }

  if (!order) {
    return (
      <MemberPageLayout>
        <div className="py-12">
          <EmptyState
            icon={PackageX}
            title={t("orders.notFound")}
            description={t("orders.notFoundDesc")}
            action={
              <Link href="/orders">
                <Button variant="outline">{t("products.backToList")}</Button>
              </Link>
            }
          />
        </div>
      </MemberPageLayout>
    );
  }

  const currentStepIdx = STATUS_FLOW.findIndex((s) =>
    s.matches.includes(order.status),
  );
  const cfg = getOrderStatus(order.status);
  const canCancel =
    order.status === "PLACED" ||
    order.status === "PENDING" ||
    order.status === "APPROVED" ||
    order.status === "PREPARING";
  const canReturn = order.status === "COMPLETED";

  return (
    <MemberPageLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t("orders.orderDetails")} #
            {order.orderId.slice(0, 8).toUpperCase()}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {t("orders.orderDate")}{" "}
            {formatDateTime(
              order.createdAt,
              locale === "vi" ? "vi-VN" : "en-US",
            )}
          </p>
        </div>
        {cfg && <Badge variant={cfg.variant}>{t(cfg.labelKey)}</Badge>}
      </div>

      {order.status !== "CANCELLED" && order.status !== "REJECTED" && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between">
            {STATUS_FLOW.map((step, i) => {
              const Icon = step.icon;
              const done = i <= currentStepIdx;
              return (
                <div
                  key={step.key}
                  className="flex-1 flex flex-col items-center relative"
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      done
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    <Icon size={18} />
                  </div>
                  <span
                    className={`text-xs mt-2 ${
                      done ? "text-blue-600 font-medium" : "text-gray-400"
                    }`}
                  >
                    {t(step.labelKey)}
                  </span>
                  {i < STATUS_FLOW.length - 1 && (
                    <div
                      className={`absolute top-5 left-[55%] w-[90%] h-0.5 ${
                        i < currentStepIdx ? "bg-blue-600" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {shipment && <OrderShipmentPanel shipment={shipment} />}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">
            {t("orders.products")}
          </h3>
          <div className="space-y-3">
            {order.items.map((item) => {
              const lookup = skuLookup.get(item.skuId);
              const product = lookup?.product;
              const variant = lookup?.variant;
              const variantLabel = formatVariantLabel(variant?.attributeValues);
              const image = product?.imageList?.[0];
              return (
                <div key={item.skuId} className="flex gap-3 py-2">
                  <div className="w-16 h-16 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden relative">
                    {image ? (
                      <Image
                        src={image}
                        alt={product?.name ?? item.skuId}
                        fill
                        sizes="64px"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <Package size={20} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    {product ? (
                      <Link
                        href={`/products/${product.productId}`}
                        className="text-sm font-medium text-gray-900 hover:text-blue-600 line-clamp-2"
                      >
                        {product.name}
                      </Link>
                    ) : (
                      <p className="text-sm font-medium text-gray-900 truncate">
                        SKU: {item.skuId}
                      </p>
                    )}
                    {variantLabel && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {variantLabel}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-0.5">x{item.qty}</p>
                  </div>
                  <span className="text-sm font-medium ml-3 whitespace-nowrap">
                    {formatCurrency(item.unitPrice * item.qty, order.currency)}
                  </span>
                </div>
              );
            })}
            <div className="border-t border-gray-100 pt-3 flex justify-between text-sm">
              <span className="text-gray-500">{t("cart.shippingFee")}</span>
              <span>{formatCurrency(order.shippingFee, order.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-900">
                {t("cart.total")}
              </span>
              <span className="font-bold text-blue-600">
                {formatCurrency(order.totalAmount, order.currency)}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-3">
              {t("orders.deliverySection")}
            </h3>
            {orderAddress ? (
              <div className="text-sm space-y-2">
                <p className="text-gray-700">
                  <span className="font-medium text-gray-900">
                    {t("orders.recipientName")}:
                  </span>{" "}
                  {orderAddress.contactName}
                </p>
                <p className="text-gray-700">
                  <span className="font-medium text-gray-900">
                    {t("orders.recipientPhone")}:
                  </span>{" "}
                  {orderAddress.phone}
                </p>
                <div className="flex items-start gap-2 text-gray-700">
                  <MapPin
                    size={14}
                    className="text-gray-400 mt-0.5 flex-shrink-0"
                  />
                  <p>
                    <span className="font-medium text-gray-900">
                      {t("orders.recipientAddress")}:
                    </span>{" "}
                    {orderAddress.fullAddress ||
                      [
                        orderAddress.detailAddress,
                        orderAddress.wardName,
                        orderAddress.districtName,
                        orderAddress.provinceName,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 text-sm text-gray-600">
                <MapPin
                  size={16}
                  className="text-gray-400 mt-0.5 flex-shrink-0"
                />
                <span>
                  {t("orders.addressHash")} #{order.addressId.slice(0, 8)}
                </span>
              </div>
            )}
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-3">
              {t("orders.payment")}
            </h3>
            {(() => {
              const pm = order.paymentMethodId;
              if (pm === "VNPAY") {
                return (
                  <p className="text-sm text-gray-700 font-medium">VNPAY</p>
                );
              }
              if (pm === "COD") {
                return (
                  <p className="text-sm text-gray-700 font-medium">
                    {t("checkout.cod")}
                  </p>
                );
              }
              if (paymentMethod) {
                return (
                  <div className="text-sm">
                    <p className="font-medium text-gray-900 capitalize">
                      {paymentMethod.provider}
                    </p>
                    {paymentMethod.last4Digits && (
                      <p className="text-gray-500 mt-0.5">
                        •••• •••• •••• {paymentMethod.last4Digits}
                      </p>
                    )}
                  </div>
                );
              }
              return (
                <p className="text-sm text-gray-600">
                  {pm ?? t("orders.noPaymentMethod")}
                </p>
              );
            })()}
            {order.paymentId && (
              <p className="text-xs text-gray-400 mt-2">
                {t("orders.transactionId")}: {order.paymentId}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            {(order.status === "SHIPPED" || order.status === "DELIVERED") && (
              <Button
                variant="primary"
                size="sm"
                className="flex-1"
                onClick={() => completeMutation.mutate()}
                disabled={completeMutation.isPending}
              >
                {t("orders.confirmReceived")}
              </Button>
            )}
            {canReturn && (
              <Link href={`/orders/${order.orderId}/return`} className="flex-1">
                <Button variant="outline" className="w-full" size="sm">
                  {t("orders.requestReturn")}
                </Button>
              </Link>
            )}
            {canCancel && (
              <Button
                variant="danger"
                size="sm"
                className="flex-1"
                onClick={() => setConfirmCancel(true)}
                disabled={cancelMutation.isPending}
              >
                {t("orders.cancelOrder")}
              </Button>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={() => cancelMutation.mutate()}
        title={t("orders.cancelOrder")}
        message={t("orders.cancelOrderConfirmMsg")}
        confirmLabel={t("orders.confirmCancelLabel")}
        variant="danger"
        loading={cancelMutation.isPending}
      />
    </MemberPageLayout>
  );
}

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <AuthGuard>
      <OrderDetailInner id={id} />
    </AuthGuard>
  );
}
