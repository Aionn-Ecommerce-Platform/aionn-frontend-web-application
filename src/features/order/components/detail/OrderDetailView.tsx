"use client";

import Link from "next/link";
import Image from "next/image";
import { Suspense, use, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  MapPin,
  Loader2,
  PackageX,
  ArrowLeft,
  Copy,
  Check,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button, Badge, EmptyState, ConfirmDialog } from "@/shared/ui";
import AuthGuard from "@/components/auth/AuthGuard";
import MemberPageLayout from "@/components/layout/MemberPageLayout";
import {
  orderService,
  orderReturnService,
  shippingService,
  productService,
  addressService,
  geographyService,
  paymentMethodService,
  paymentService,
} from "@/lib/services";
import { qk } from "@/lib/query-keys";
import { getOrderStatus } from "@/lib/domain/status/order";
import { formatVariantLabel } from "@/shared/lib/product-utils";
import { resolveProvinceName } from "@/shared/lib/address-utils";
import { productPath } from "@/shared/lib/product-url";
import { formatCurrency, formatDateTime } from "@/shared/lib/utils";
import { getErrorMessage } from "@/shared/lib/errors";
import { useMerchantNameMap, useTranslation } from "@/hooks";
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const { t, locale } = useTranslation();
  const merchantNameById = useMerchantNameMap();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [orderIdCopied, setOrderIdCopied] = useState(false);
  const fromTab = searchParams.get("fromTab") || searchParams.get("tab");

  const { data: order, isLoading } = useQuery({
    queryKey: qk.order(id),
    queryFn: () => orderService.get(id),
  });

  const { data: myReturns, isLoading: returnsLoading } = useQuery({
    queryKey: ["returns", "mine", "order-detail"],
    queryFn: () => orderReturnService.listMine(200),
    enabled: Boolean(order?.orderId),
  });

  const activeReturn = myReturns?.find(
    (item) =>
      item.orderId === order?.orderId &&
      ["REQUESTED", "APPROVED", "ITEM_RECEIVED"].includes(item.status),
  );

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

  const { data: provinces = [] } = useQuery({
    queryKey: qk.provinces("VN"),
    queryFn: () => geographyService.listProvinces("VN"),
  });

  const shipment = shipments && shipments.length > 0 ? shipments[0] : null;

  const { data: payment } = useQuery({
    queryKey: ["order-payment", order?.paymentId],
    queryFn: () => paymentService.get(order!.paymentId!),
    enabled: !!order?.paymentId,
  });

  const { subtotal, discount } = useMemo(() => {
    if (!order) return { subtotal: 0, discount: 0 };
    const itemsSubtotal = (order.items ?? []).reduce(
      (sum, it) => sum + (it.unitPrice ?? 0) * (it.qty ?? 0),
      0,
    );
    const computedDiscount = Math.max(
      0,
      itemsSubtotal + (order.shippingFee ?? 0) - (order.totalAmount ?? 0),
    );
    return { subtotal: itemsSubtotal, discount: computedDiscount };
  }, [order]);

  const deliveryInfo = useMemo(() => {
    const recipientName =
      order?.recipientName?.trim() || orderAddress?.contactName?.trim() || null;
    const recipientPhone =
      order?.recipientPhone?.trim() || orderAddress?.phone?.trim() || null;

    let addressLine = order?.recipientAddressLine?.trim() || null;

    if (addressLine) {
      const prov = resolveProvinceName(
        order?.recipientProvinceCode,
        provinces,
        locale,
      );
      if (prov && !addressLine.toLowerCase().includes(prov.toLowerCase())) {
        addressLine = `${addressLine}, ${prov}`;
      }
    } else if (orderAddress) {
      addressLine =
        orderAddress.fullAddress ||
        [
          orderAddress.detailAddress,
          orderAddress.wardName,
          orderAddress.districtName,
          orderAddress.provinceName,
        ]
          .filter(Boolean)
          .join(", ");
    }

    const hasInfo = Boolean(recipientName || recipientPhone || addressLine);

    return {
      hasInfo,
      recipientName,
      recipientPhone,
      addressLine,
    };
  }, [order, orderAddress, provinces, locale]);

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
          <Loader2 className="animate-spin text-brand" size={32} />
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
  const canReturn =
    order.status === "COMPLETED" && !returnsLoading && !activeReturn;

  const paymentMethodLabel = (() => {
    const pm = order.paymentMethodId;
    const gw = payment?.gateway;
    if (pm === "VNPAY" || gw === "VNPAY") return "VNPAY";
    if (pm === "COD" || gw === "COD") return t("checkout.cod");
    if (pm === "STRIPE" || gw === "STRIPE") return t("orders.stripeCard");
    if (paymentMethod) {
      return `${paymentMethod.provider}${
        paymentMethod.last4Digits ? ` •••• ${paymentMethod.last4Digits}` : ""
      }`;
    }
    if (payment?.gateway) return payment.gateway.toUpperCase();
    return pm ?? t("orders.noPaymentMethod");
  })();

  const handleBack = () => {
    let targetTab = fromTab;
    if (!targetTab && order) {
      if (["PENDING", "APPROVED", "PLACED"].includes(order.status)) {
        targetTab = "PENDING,APPROVED";
      } else if (order.status === "PREPARING") {
        targetTab = "PREPARING";
      } else if (["SHIPPED", "DELIVERED"].includes(order.status)) {
        targetTab = "SHIPPED";
      } else if (order.status === "COMPLETED") {
        targetTab = "COMPLETED";
      } else if (["CANCELLED", "REJECTED"].includes(order.status)) {
        targetTab = "CANCELLED,REJECTED";
      }
    }

    if (targetTab && targetTab !== "all") {
      router.push(`/orders?tab=${encodeURIComponent(targetTab)}`);
    } else {
      router.push("/orders");
    }
  };

  const handleCopyOrderId = () => {
    navigator.clipboard
      .writeText(order.orderId)
      .then(() => {
        setOrderIdCopied(true);
        toast.success(t("orders.copiedToast"));
        setTimeout(() => setOrderIdCopied(false), 2000);
      })
      .catch((err) => toast.error(getErrorMessage(err)));
  };

  return (
    <MemberPageLayout>
      <button
        type="button"
        onClick={handleBack}
        className="inline-flex items-center gap-2 text-sm sm:text-base text-gray-600 hover:text-gray-950 mb-6 transition-colors cursor-pointer group font-bold"
      >
        <ArrowLeft
          size={16}
          className="text-gray-500 group-hover:text-gray-950 group-hover:-translate-x-0.5 transition-transform"
        />
        <span>{t("orders.backToOrders")}</span>
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight">
            {t("orders.orderDetails")}
          </h1>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 mt-2 text-sm sm:text-base text-gray-950">
            <span className="font-medium">
              {t("orders.orderId")}:
            </span>
            <span className="font-mono font-semibold text-gray-950">
              {order.orderId}
            </span>
            <button
              type="button"
              onClick={handleCopyOrderId}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-400 bg-white text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-950 cursor-pointer"
              title={t("orders.copyCode")}
              aria-label={t("orders.copyCode")}
            >
              {orderIdCopied ? (
                <Check size={14} className="text-emerald-600" />
              ) : (
                <Copy size={14} />
              )}
            </button>
            <span className="text-gray-400">•</span>
            <span className="font-medium text-gray-950">
              {formatDateTime(
                order.createdAt,
                locale === "vi" ? "vi-VN" : "en-US",
              )}
            </span>
          </div>
        </div>
        {cfg && (
          <Badge
            variant={cfg.variant}
            className="self-start sm:self-auto !rounded-full !px-3 !py-1 !text-sm"
          >
            {t(cfg.labelKey)}
          </Badge>
        )}
      </div>

      {order.status !== "CANCELLED" && order.status !== "REJECTED" && (
        <div className="bg-white rounded-2xl border border-gray-400 p-6 mb-6 shadow-xs">
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
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      done
                        ? "bg-gray-950 text-white shadow-xs"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    <Icon size={18} />
                  </div>
                  <span
                    className={`text-sm mt-2.5 font-semibold ${
                      done ? "text-gray-950 font-bold" : "text-gray-400"
                    }`}
                  >
                    {t(step.labelKey)}
                  </span>
                  {i < STATUS_FLOW.length - 1 && (
                    <div
                      className={`absolute top-5 left-[55%] w-[90%] h-0.5 transition-colors ${
                        i < currentStepIdx ? "bg-gray-950" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {shipment && <OrderShipmentPanel shipment={shipment} deliveryInfo={deliveryInfo} />}

      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-gray-400 p-6 shadow-xs">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-10 w-10 items-center justify-center text-brand shrink-0">
                <Package size={24} />
              </div>
              <Link
                href={`/merchants/${order.merchantId}`}
                className="truncate text-base sm:text-lg font-bold text-gray-950 transition-colors hover:text-brand"
              >
                {merchantNameById.get(order.merchantId) ?? t("orders.store")}
              </Link>
            </div>
          </div>
          <p className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-2">
            {t("orders.products")}
          </p>
          <div className="space-y-3">
            <div className="divide-y divide-gray-100">
            {order.items.map((item) => {
              const lookup = skuLookup.get(item.skuId);
              const product = lookup?.product;
              const variant = lookup?.variant;
              const variantLabel =
                item.variantLabel ?? formatVariantLabel(variant?.attributeValues);
              const image = item.imageUrl ?? product?.imageList?.[0];
              const displayName = item.productName ?? product?.name;
              const originalUnit = item.originalUnitPrice;
              const hasDiscount =
                originalUnit != null && originalUnit > item.unitPrice;
              const lineTotal = item.unitPrice * item.qty;
              const originalLineTotal = hasDiscount
                ? originalUnit * item.qty
                : null;
              return (
                <div key={item.skuId} className="flex gap-3.5 py-2.5">
                  <div className="w-16 h-16 rounded-xl bg-gray-50 border border-gray-400 flex-shrink-0 overflow-hidden relative p-1">
                    {image ? (
                      <Image
                        src={image}
                        alt={displayName ?? item.skuId}
                        fill
                        sizes="64px"
                        className="object-contain p-1"
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
                        href={productPath(product)}
                        className="text-base font-semibold text-gray-900 hover:text-brand line-clamp-2 transition-colors"
                      >
                        {displayName}
                      </Link>
                    ) : (
                      <p className="text-base font-semibold text-gray-900 truncate">
                        {displayName ?? `SKU: ${item.skuId}`}
                      </p>
                    )}
                    {variantLabel && (
                      <p className="text-sm text-gray-500 mt-0.5">
                        {variantLabel}
                      </p>
                    )}
                    <p className="text-sm text-gray-400 font-mono mt-0.5">x{item.qty}</p>
                  </div>
                  <div className="ml-3 flex shrink-0 items-baseline justify-end gap-2 whitespace-nowrap">
                    {originalLineTotal != null && (
                      <span className="text-sm text-gray-400 line-through">
                        {formatCurrency(originalLineTotal, order.currency)}
                      </span>
                    )}
                    <span
                      className={`text-base font-extrabold ${
                        hasDiscount
                          ? "bg-gradient-to-r from-purple-700 via-fuchsia-600 to-indigo-700 bg-clip-text text-transparent"
                          : "text-gray-950"
                      }`}
                    >
                      {formatCurrency(lineTotal, order.currency)}
                    </span>
                  </div>
                </div>
              );
            })}
            </div>
            <div className="mt-2 divide-y divide-gray-300 text-sm sm:text-base">
              <div className="flex items-center justify-between py-3">
                <span className="font-medium text-gray-500">
                  {t("cart.subtotal")}
                </span>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(subtotal, order.currency)}
                </span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="font-medium text-gray-500">
                  {t("cart.shippingFee")}
                </span>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(order.shippingFee, order.currency)}
                </span>
              </div>
              {discount > 0 && (
                <div className="flex items-center justify-between py-3">
                  <span className="font-medium text-gray-500">
                    {t("cart.discount")}
                  </span>
                  <span className="font-semibold text-emerald-600">
                    -{formatCurrency(discount, order.currency)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between py-4">
                <span className="text-base font-bold text-gray-900">
                  {t("cart.total")}
                </span>
                <span className="text-2xl font-extrabold text-gray-950 sm:text-3xl">
                  {formatCurrency(order.totalAmount, order.currency)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <span className="font-medium text-gray-500">
                  {t("orders.paymentMethod")}
                </span>
                <span className="text-right font-semibold text-gray-900">
                  {paymentMethodLabel}
                </span>
              </div>
              {(order.paymentId || payment?.invoiceUrl) && (
                <div className="py-3 text-right">
                  {order.paymentId && (
                    <p className="font-mono text-sm text-gray-400">
                      {t("orders.transactionId")}: {order.paymentId}
                    </p>
                  )}
                  {payment?.invoiceUrl && (
                    <a
                      href={payment.invoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-brand underline underline-offset-2 hover:text-brand-strong"
                    >
                      {t("orders.downloadInvoice")}
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {!shipment && (
          <div className="bg-white rounded-2xl border border-gray-400 p-6 shadow-xs">
            <h3 className="font-bold text-gray-950 mb-3 flex items-center gap-2 text-base">
              <span className="flex h-10 w-10 items-center justify-center text-brand shrink-0">
                <MapPin size={24} />
              </span>
              {t("orders.deliverySection")}
            </h3>
            {deliveryInfo.hasInfo ? (
              <div className="text-base space-y-2">
                {deliveryInfo.recipientName && (
                  <p className="text-gray-700">
                    <span className="font-medium text-gray-500">
                      {t("orders.recipientName")}:
                    </span>{" "}
                    <span className="font-semibold text-gray-900">{deliveryInfo.recipientName}</span>
                  </p>
                )}
                {deliveryInfo.recipientPhone && (
                  <p className="text-gray-700">
                    <span className="font-medium text-gray-500">
                      {t("orders.recipientPhone")}:
                    </span>{" "}
                    <span className="font-semibold text-gray-900 font-mono">{deliveryInfo.recipientPhone}</span>
                  </p>
                )}
                {deliveryInfo.addressLine && (
                  <div className="flex items-start gap-2 text-gray-700">
                    <p>
                      <span className="font-medium text-gray-500">
                        {t("orders.recipientAddress")}:
                      </span>{" "}
                      <span className="font-semibold text-gray-900">{deliveryInfo.addressLine}</span>
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-start gap-2 text-base text-gray-600">
                <MapPin
                  size={16}
                  className="text-gray-400 mt-0.5 flex-shrink-0"
                />
                <span>
                  {order.addressId
                    ? `${t("orders.addressHash")} #${order.addressId.slice(0, 8)}`
                    : t("orders.noShippingAddress")}
                </span>
              </div>
            )}
            {order.note && (
              <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 p-3 text-base text-amber-900">
                <span className="font-semibold">
                  {t("orders.deliveryNote")}:
                </span>{" "}
                {order.note}
              </div>
            )}
            {order.shippingService && (
              <p className="mt-2 text-sm text-gray-500">
                {t("orders.shippingService")}:{" "}
                <span className="font-semibold text-gray-700">
                  {order.shippingService}
                </span>
              </p>
            )}
          </div>
          )}
          {activeReturn && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
              {t("orders.returns.activeReturnExists")}{" "}
              <Link
                href={`/orders?tab=RETURNS&highlight=${activeReturn.returnId}`}
                className="underline underline-offset-2 transition-colors hover:text-amber-950"
              >
                {t("orders.returns.viewRequest")}
              </Link>
            </div>
          )}
          <div className="flex gap-3">
            {(order.status === "SHIPPED" || order.status === "DELIVERED") && (
              <Button
                variant="primary"
                size="sm"
                className="flex-1 rounded-xl bg-gray-950 hover:bg-black text-white font-bold"
                onClick={() => completeMutation.mutate()}
                disabled={completeMutation.isPending}
              >
                {t("orders.confirmReceived")}
              </Button>
            )}
            {canReturn && (
              <Button
                variant="outline"
                className="flex-1 rounded-xl border-gray-900 font-bold"
                size="sm"
                onClick={() => router.push(`/orders/${order.orderId}/return`)}
              >
                {t("orders.requestReturn")}
              </Button>
            )}
            {canCancel && (
              <Button
                variant="danger"
                size="sm"
                className="flex-1 rounded-xl font-bold"
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
      <Suspense
        fallback={
          <MemberPageLayout>
            <div className="min-h-[60vh] flex justify-center items-center">
              <Loader2 className="animate-spin text-brand" size={32} />
            </div>
          </MemberPageLayout>
        }
      >
        <OrderDetailInner id={id} />
      </Suspense>
    </AuthGuard>
  );
}
