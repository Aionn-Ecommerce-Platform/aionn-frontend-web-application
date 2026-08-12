"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button, Badge, Modal } from "@/shared/ui";
import { orderService, shippingService, paymentService } from "@/lib/services";
import { qk } from "@/lib/query-keys";
import { getOrderStatus } from "@/lib/domain/status/order";
import { getShipmentStatus } from "@/lib/domain/status/shipment";
import { formatCurrency, formatDateTime } from "@/shared/lib/utils";
import { getErrorMessage } from "@/shared/lib/errors";
import { useTranslation } from "@/hooks";
import type { Order } from "@/types";
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

  const { data: payments, isLoading: loadingPayments } = useQuery({
    queryKey: qk.payments(order.orderId),
    queryFn: () => paymentService.listByOrder(order.orderId),
  });

  const shipment = shipments && shipments.length > 0 ? shipments[0] : null;
  const payment = payments && payments.length > 0 ? payments[0] : null;

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
        dimensions: {
          weightGram: 500,
          lengthCm: 15,
          widthCm: 10,
          heightCm: 5,
        },
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
        id: order.orderId.slice(0, 8).toUpperCase(),
      })}
      size="md"
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
            <p className="font-semibold text-blue-600">
              {status ? t(status.labelKey) : order.status}
            </p>
          </div>
        </div>

        <div className="border-t border-gray-400 pt-4">
          <h4 className="font-semibold text-gray-900 mb-2">
            {t("merchant.orders.detailProducts")}
          </h4>
          <div className="space-y-2">
            {order.items.map((item) => (
              <div
                key={item.skuId}
                className="flex justify-between text-sm py-1 border-b border-gray-50"
              >
                <span className="font-mono text-gray-700">
                  {t("merchant.orders.detailSkuLine", {
                    sku: item.skuId,
                    qty: item.qty,
                  })}
                </span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(item.unitPrice * item.qty, order.currency)}
                </span>
              </div>
            ))}
            <div className="flex justify-between text-sm font-medium pt-2">
              <span className="text-gray-500">
                {t("merchant.orders.detailShippingFee")}
              </span>
              <span>{formatCurrency(order.shippingFee, order.currency)}</span>
            </div>
            <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-400 text-blue-600">
              <span>{t("merchant.orders.detailGrandTotal")}</span>
              <span>{formatCurrency(order.totalAmount, order.currency)}</span>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-400 pt-4">
          <h4 className="font-semibold text-gray-900 mb-2">
            {t("merchant.orders.detailPayment")}
          </h4>
          {loadingPayments ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 size={16} className="animate-spin" />{" "}
              {t("merchant.orders.loadingPayment")}
            </div>
          ) : payment ? (
            <div className="bg-gray-50 rounded-md p-4 text-sm space-y-2">
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
                <Badge variant="success">{payment.status}</Badge>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              {t("merchant.orders.paymentEmpty")}
            </p>
          )}
        </div>

        <div className="border-t border-gray-400 pt-4">
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
              <div className="bg-gray-50 rounded-md p-4 text-sm space-y-2">
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
                  <Badge variant={getShipmentStatus(shipment.status).variant}>
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
                      className="text-blue-600 hover:underline font-medium"
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
                  <div className="border border-blue-100 bg-blue-50/50 rounded-md p-4 space-y-3">
                    <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                      {t("merchant.orders.simulatorTitle")}
                    </p>
                    <p className="text-xs text-gray-500">
                      {t("merchant.orders.simulatorDesc")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {shipment.status === "REGISTERED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          loading={simulateWebhookMutation.isPending}
                          onClick={() =>
                            simulateWebhookMutation.mutate({
                              trackingCode: shipment.trackingCode!,
                              type: "PICKED_UP",
                            })
                          }
                        >
                          {t("merchant.orders.simBtnPickedUp")}
                        </Button>
                      )}
                      {shipment.status === "PICKED_UP" && (
                        <Button
                          size="sm"
                          variant="outline"
                          loading={simulateWebhookMutation.isPending}
                          onClick={() =>
                            simulateWebhookMutation.mutate({
                              trackingCode: shipment.trackingCode!,
                              type: "IN_TRANSIT",
                            })
                          }
                        >
                          {t("merchant.orders.simBtnInTransit")}
                        </Button>
                      )}
                      {shipment.status === "IN_TRANSIT" && (
                        <Button
                          size="sm"
                          variant="outline"
                          loading={simulateWebhookMutation.isPending}
                          onClick={() =>
                            simulateWebhookMutation.mutate({
                              trackingCode: shipment.trackingCode!,
                              type: "OUT_FOR_DELIVERY",
                            })
                          }
                        >
                          {t("merchant.orders.simBtnOutForDelivery")}
                        </Button>
                      )}
                      {shipment.status === "OUT_FOR_DELIVERY" && (
                        <>
                          <Button
                            size="sm"
                            variant="primary"
                            loading={simulateWebhookMutation.isPending}
                            onClick={() =>
                              simulateWebhookMutation.mutate({
                                trackingCode: shipment.trackingCode!,
                                type: "DELIVERED",
                              })
                            }
                          >
                            {t("merchant.orders.simBtnDelivered")}
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            loading={simulateWebhookMutation.isPending}
                            onClick={() =>
                              simulateWebhookMutation.mutate({
                                trackingCode: shipment.trackingCode!,
                                type: "DELIVERY_FAILED",
                              })
                            }
                          >
                            {t("merchant.orders.simBtnDeliveryFailed")}
                          </Button>
                        </>
                      )}
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
          <div className="border-t border-gray-400 pt-4 flex justify-between items-center bg-green-50 p-4 rounded-md">
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

        <div className="border-t border-gray-400 pt-4 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            {t("merchant.orders.btnClose")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
