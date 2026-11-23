"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Package } from "lucide-react";
import toast from "react-hot-toast";
import { AppImage, Badge, Button, Modal } from "@/shared/ui";
import {
  orderService,
  shippingService,
  paymentService,
  productService,
} from "@/lib/services";
import { qk } from "@/lib/query-keys";
import { getOrderStatus } from "@/lib/domain/status/order";
import { getPaymentStatus } from "@/lib/domain/status/payment";
import { getShipmentStatus } from "@/lib/domain/status/shipment";
import { getProductCoverImage } from "@/shared/lib/media";
import { formatVariantLabel } from "@/shared/lib/product-utils";
import { formatCurrency, formatDateTime } from "@/shared/lib/utils";
import { getErrorMessage } from "@/shared/lib/errors";
import { useTranslation } from "@/hooks";
import type { Order } from "@/types";
const SIMULATION_ACTIONS = [
  {
    when: "REGISTERED",
    type: "PICKED_UP",
    labelKey: "merchant.orders.simBtnPickedUp",
    variant: "outline",
  },
  {
    when: "PICKED_UP",
    type: "IN_TRANSIT",
    labelKey: "merchant.orders.simBtnInTransit",
    variant: "outline",
  },
  {
    when: "IN_TRANSIT",
    type: "OUT_FOR_DELIVERY",
    labelKey: "merchant.orders.simBtnOutForDelivery",
    variant: "outline",
  },
  {
    when: "OUT_FOR_DELIVERY",
    type: "DELIVERED",
    labelKey: "merchant.orders.simBtnDelivered",
    variant: "primary",
  },
  {
    when: "OUT_FOR_DELIVERY",
    type: "DELIVERY_FAILED",
    labelKey: "merchant.orders.simBtnDeliveryFailed",
    variant: "danger",
  },
] as const;

export function OrderDetailModal({
  order,
  onClose,
}: {
  order: Order;
  onClose: () => void;
}) {
  const { t, locale } = useTranslation();
  const qc = useQueryClient();
  const status = getOrderStatus(order.status);

  const { data: shipments, isLoading: loadingShipments } = useQuery({
    queryKey: qk.shipments(order.orderId),
    queryFn: () => shippingService.listByOrder(order.orderId),
  });

  const {
    data: payments,
    isLoading: loadingPayments,
    isError: paymentsError,
  } = useQuery({
    queryKey: qk.payments(order.orderId),
    queryFn: () => paymentService.listByOrder(order.orderId),
  });

  const orderSkuIds = order.items.map((item) => item.skuId);
  const { data: orderProducts = [] } = useQuery({
    queryKey: ["order-products", order.orderId, orderSkuIds.join(",")],
    queryFn: () => productService.resolveBySkuIds(orderSkuIds),
    enabled: orderSkuIds.length > 0,
  });

  const skuLookup = new Map<
    string,
    {
      product: (typeof orderProducts)[number];
      variant: (typeof orderProducts)[number]["variants"][number];
    }
  >();
  orderProducts.forEach((product) => {
    product.variants.forEach((variant) => {
      skuLookup.set(variant.skuId, { product, variant });
    });
  });

  const shipment = shipments && shipments.length > 0 ? shipments[0] : null;
  const payment = payments && payments.length > 0 ? payments[0] : null;
  const paymentStatus = payment ? getPaymentStatus(payment.status) : null;
  const createShipmentMutation = useMutation({
    mutationFn: () => {
      return shippingService.create({
        orderId: order.orderId,
        userId: order.userId,
        address: {
          fullName:
            order.recipientName ??
            t("merchant.orders.shipReceiverName", {
              id: order.userId.slice(0, 5),
            }),
          phone: order.recipientPhone ?? "0912345678",
          addressLine: order.recipientAddressLine ?? "79 Đường Láng",
          wardCode: order.recipientWardCode ?? "",
          districtId: order.recipientDistrictCode ?? "",
          provinceCode: order.recipientProvinceCode ?? "",
          countryCode: order.recipientCountryCode ?? "VN",
        },
        items: order.items.map((item) => ({
          skuId: item.skuId,
          qty: item.qty,
        })),
        codAmount: order.totalAmount,
        shippingFee: order.shippingFee,
        currency: order.currency,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.shipments(order.orderId) });
      toast.success(t("merchant.orders.toastShipmentCreated"));
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const registerShipmentMutation = useMutation({
    mutationFn: (shipmentId: string) => shippingService.register(shipmentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.shipments(order.orderId) });
      toast.success(t("merchant.orders.toastShipmentRegistered"));
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const simulateWebhookMutation = useMutation({
    mutationFn: (payload: { trackingCode: string; type: string }) => {
      return shippingService.applyCarrierWebhook({
        trackingCode: payload.trackingCode,
        type: payload.type,
        currentLocation: payload.type === "IN_TRANSIT" ? "Hà Nội" : undefined,
        shipperName:
          payload.type === "OUT_FOR_DELIVERY"
            ? "Nguyễn Văn Shipper"
            : undefined,
        shipperPhone:
          payload.type === "OUT_FOR_DELIVERY" ? "0987654321" : undefined,
        signatureUrl:
          payload.type === "DELIVERED"
            ? "http://example.com/signature.png"
            : undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.shipments(order.orderId) });
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success(t("merchant.orders.toastWebhookSent"));
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const completeOrderMutation = useMutation({
    mutationFn: () => orderService.complete(order.orderId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success(t("merchant.orders.toastCompleted"));
      onClose();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={t("merchant.orders.detailTitle", {
        id: order.orderId,
      })}
      size="full"
    >
      <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">
              {t("merchant.orders.detailOrderId")}
            </p>
            <p className="font-mono font-semibold text-gray-900">
              {order.orderId}
            </p>
          </div>
          <div>
            <p className="text-gray-500">
              {t("merchant.orders.detailOrderDate")}
            </p>
            <p className="font-medium text-gray-900">
              {formatDateTime(order.createdAt, locale)}
            </p>
          </div>
          <div>
            <p className="text-gray-500">
              {t("merchant.orders.detailCustomer")}
            </p>
            <p className="font-medium text-gray-900">
              {order.recipientName ?? order.userId}
              {order.recipientPhone ? (
                <span className="ml-2 text-xs text-gray-500">
                  · {order.recipientPhone}
                </span>
              ) : null}
            </p>
          </div>
          <div>
            <p className="text-gray-500">{t("merchant.orders.detailStatus")}</p>
            <Badge
              variant={status?.variant ?? "default"}
              className="!mt-1 !rounded-full !px-3 !py-1 !text-xs"
            >
              {status ? t(status.labelKey) : order.status}
            </Badge>
          </div>
        </div>

        {order.note && (
          <div className="mt-4 rounded-lg border border-amber-100 bg-amber-50 p-3 text-sm text-amber-900">
            <span className="font-semibold">{t("orders.deliveryNote")}:</span>{" "}
            {order.note}
          </div>
        )}

        <div className="border-t border-gray-300 pt-4">
          <h4 className="font-semibold text-gray-900 mb-2">
            {t("merchant.orders.detailProducts")}
          </h4>
          <div className="space-y-2">
            <div className="divide-y divide-gray-200">
              {order.items.map((item) => {
                const lookup = skuLookup.get(item.skuId);
                const product = lookup?.product;
                const variant = lookup?.variant;
                const variantLabel =
                  item.variantLabel ??
                  formatVariantLabel(variant?.attributeValues);
                const image =
                  item.imageUrl ??
                  (product
                    ? getProductCoverImage(product.imageList)
                    : undefined);
                const displayName =
                  item.productName ?? product?.name ?? item.skuId;
                return (
                  <div
                    key={item.skuId}
                    className="flex gap-3 py-2 first:pt-0 last:pb-0"
                  >
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                      {image ? (
                        <AppImage
                          src={image}
                          alt={displayName}
                          width={56}
                          height={56}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-gray-300">
                          <Package size={20} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-semibold text-gray-900">
                        {displayName}
                      </p>
                      {variantLabel && (
                        <p className="mt-0.5 text-xs text-gray-500">
                          {variantLabel}
                        </p>
                      )}
                      <p className="mt-0.5 text-xs text-gray-400">
                        x{item.qty} ·{" "}
                        {formatCurrency(item.unitPrice, order.currency, locale)}
                      </p>
                    </div>
                    <span className="ml-2 shrink-0 text-sm font-semibold text-gray-900">
                      {formatCurrency(
                        item.unitPrice * item.qty,
                        order.currency,
                        locale,
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-sm font-medium pt-2">
              <span className="text-gray-900">
                {t("merchant.orders.detailShippingFee")}
              </span>
              <span>
                {formatCurrency(order.shippingFee, order.currency, locale)}
              </span>
            </div>
            <div className="flex justify-between text-base font-bold pt-2 text-gray-900">
              <span>{t("merchant.orders.detailGrandTotal")}</span>
              <span className="text-brand">
                {formatCurrency(order.totalAmount, order.currency, locale)}
              </span>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-300 pt-4">
          <h4 className="font-semibold text-gray-900 mb-2">
            {t("merchant.orders.detailPayment")}
          </h4>
          {loadingPayments && !payment ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 size={16} className="animate-spin" />{" "}
              {t("merchant.orders.loadingPayment")}
            </div>
          ) : paymentsError && !payment ? (
            <p className="text-sm text-rose-600">
              {t("merchant.orders.paymentLoadFailed")}
            </p>
          ) : payment ? (
            <div className="bg-gray-200 rounded-md p-4 text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">
                  {t("merchant.orders.paymentTxnId")}
                </span>
                <span className="font-mono text-gray-900">
                  {payment.paymentId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">
                  {t("merchant.orders.paymentMethod")}
                </span>
                <span className="font-medium text-gray-900">
                  {payment.gateway}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">
                  {t("merchant.orders.paymentStatus")}
                </span>
                {paymentStatus ? (
                  <Badge
                    variant={paymentStatus.variant}
                    className="!rounded-full !px-3 !py-1 !text-xs"
                  >
                    {t(paymentStatus.labelKey)}
                  </Badge>
                ) : null}
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">
                  {t("merchant.orders.paymentAmount")}
                </span>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(payment.amount, payment.currency, locale)}
                </span>
              </div>
              {payment.paidAt ? (
                <div className="flex justify-between">
                  <span className="text-gray-500">
                    {t("merchant.orders.paidAt")}
                  </span>
                  <span className="text-gray-900">
                    {formatDateTime(payment.paidAt, locale)}
                  </span>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              {t("merchant.orders.paymentEmpty")}
            </p>
          )}
        </div>

        <div className="border-t border-gray-300 pt-4">
          <h4 className="font-semibold text-gray-900 mb-2">
            {t("merchant.orders.detailShipping")}
          </h4>
          {loadingShipments ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 size={16} className="animate-spin" />{" "}
              {t("merchant.orders.loadingShipping")}
            </div>
          ) : shipment ? (
            <div className="space-y-4">
              <div className="bg-gray-200 rounded-md p-4 text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">
                    {t("merchant.orders.shipmentId")}
                  </span>
                  <span className="font-mono text-gray-900">
                    {shipment.shipmentId}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">
                    {t("merchant.orders.trackingCode")}
                  </span>
                  <span className="font-mono font-semibold text-gray-900">
                    {shipment.trackingCode ||
                      t("merchant.orders.trackingNotRegistered")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">
                    {t("merchant.orders.shipmentStatus")}
                  </span>
                  <Badge
                    variant={getShipmentStatus(shipment.status).variant}
                    className="!rounded-full !px-3 !py-1 !text-xs"
                  >
                    {t(getShipmentStatus(shipment.status).labelKey)}
                  </Badge>
                </div>
                {shipment.labelUrl && (
                  <div className="flex justify-between pt-2">
                    <span className="text-gray-500">
                      {t("merchant.orders.shippingLabel")}
                    </span>
                    <a
                      href={shipment.labelUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand hover:underline font-medium"
                    >
                      {t("merchant.orders.downloadLabel")}
                    </a>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {shipment.status === "REQUESTED" && (
                  <Button
                    size="sm"
                    loading={registerShipmentMutation.isPending}
                    onClick={() =>
                      registerShipmentMutation.mutate(shipment.shipmentId)
                    }
                  >
                    {t("merchant.orders.btnRegisterCarrier")}
                  </Button>
                )}
              </div>

              {shipment.trackingCode &&
                shipment.status !== "DELIVERED" &&
                shipment.status !== "CANCELLED" && (
                  <div className="border border-brand/20 bg-brand/5 rounded-md p-4 space-y-3">
                    <p className="text-xs font-bold text-brand-strong uppercase tracking-wider">
                      {t("merchant.orders.simulatorTitle")}
                    </p>
                    <p className="text-xs text-gray-500">
                      {t("merchant.orders.simulatorDesc")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {SIMULATION_ACTIONS.filter(
                        (action) => action.when === shipment.status,
                      ).map((action) => (
                        <Button
                          key={action.type}
                          size="sm"
                          variant={action.variant}
                          loading={simulateWebhookMutation.isPending}
                          onClick={() =>
                            simulateWebhookMutation.mutate({
                              trackingCode: shipment.trackingCode!,
                              type: action.type,
                            })
                          }
                        >
                          {t(action.labelKey)}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-gray-500">
                {t("merchant.orders.shipmentEmpty")}
              </p>
              {(order.status === "PREPARING" ||
                order.status === "APPROVED") && (
                <Button
                  size="sm"
                  loading={createShipmentMutation.isPending}
                  onClick={() => createShipmentMutation.mutate()}
                >
                  {t("merchant.orders.btnCreateShipment")}
                </Button>
              )}
            </div>
          )}
        </div>

        {(order.status === "SHIPPED" ||
          order.status === "DELIVERED" ||
          (shipment &&
            shipment.status === "DELIVERED" &&
            order.status !== "COMPLETED")) && (
          <div className="border-t border-gray-300 pt-4 flex justify-between items-center bg-green-50 p-4 rounded-md">
            <div>
              <p className="text-sm font-semibold text-green-800">
                {t("merchant.orders.completeBoxTitle")}
              </p>
              <p className="text-xs text-green-600">
                {t("merchant.orders.completeBoxDesc")}
              </p>
            </div>
            <Button
              size="sm"
              variant="primary"
              loading={completeOrderMutation.isPending}
              onClick={() => completeOrderMutation.mutate()}
            >
              {t("merchant.orders.btnComplete")}
            </Button>
          </div>
        )}

        <div className="border-t border-gray-300 pt-4 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            {t("merchant.orders.btnClose")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
