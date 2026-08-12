"use client";
import { Truck } from "lucide-react";
import { useTranslation } from "@/hooks";
import { getShipmentStatus } from "@/lib/domain/status/shipment";
import { formatDate } from "@/shared/lib/utils";
import type { Shipment } from "@/types";

const STEPS = [
  "REQUESTED",
  "REGISTERED",
  "PICKED_UP",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

export default function OrderShipmentPanel({
  shipment,
}: {
  shipment: Shipment;
}) {
  const { t, locale } = useTranslation();
  const labels = [
    "orders.trackingStepRequested",
    "orders.trackingStepRegistered",
    "orders.trackingStepPickedUp",
    "orders.trackingStepInTransit",
    "orders.trackingStepOutForDelivery",
    "orders.trackingStepDelivered",
  ];
  const current = STEPS.indexOf(shipment.status);
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Truck size={18} className="text-blue-600" />
        {t("orders.shippingInfo")}
      </h3>
      <div className="grid md:grid-cols-2 gap-4 mb-6 text-sm">
        <div>
          <p className="text-gray-500">{t("orders.carrier")}</p>
          <p className="font-medium">{t("checkout.express")} (GHN)</p>
        </div>
        <div>
          <p className="text-gray-500">{t("orders.trackingNumber")}</p>
          <p className="font-mono font-medium">
            {shipment.trackingCode || t("orders.noTrackingYet")}
          </p>
        </div>
        <div>
          <p className="text-gray-500">{t("orders.shippingStatus")}</p>
          <span className="font-semibold text-blue-600">
            {t(getShipmentStatus(shipment.status).labelKey)}
            {shipment.currentLocation ? ` (${shipment.currentLocation})` : ""}
            {shipment.lastFailureReason
              ? `: ${shipment.lastFailureReason}`
              : ""}
          </span>
        </div>
        {shipment.shipperName && (
          <div>
            <p className="text-gray-500">{t("orders.shipperName")}</p>
            <p className="font-medium">
              {shipment.shipperName}{" "}
              {shipment.shipperPhone && `(${shipment.shipperPhone})`}
            </p>
          </div>
        )}
        {shipment.expectedDeliveryDate && (
          <div>
            <p className="text-gray-500">{t("orders.estimatedDelivery")}</p>
            <p className="font-medium">
              {formatDate(shipment.expectedDeliveryDate, locale)}
            </p>
          </div>
        )}
      </div>
      {!["CANCELLED", "RETURNED", "DELIVERY_FAILED"].includes(
        shipment.status,
      ) && (
        <div className="border-t border-gray-100 pt-6">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-4">
            {t("orders.trackingHistory")}
          </p>
          <div className="flex flex-col md:flex-row gap-4">
            {STEPS.map((step, index) => {
              const done = index <= current;
              return (
                <div
                  key={step}
                  className="flex-1 flex md:flex-col items-center gap-3 relative"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs z-10 ${done ? "bg-green-600 text-white" : "bg-gray-100 text-gray-400"}`}
                  >
                    {index + 1}
                  </div>
                  <span
                    className={`text-xs ${done ? "text-green-600" : "text-gray-400"}`}
                  >
                    {t(labels[index]!)}
                  </span>
                  {index < STEPS.length - 1 && (
                    <div
                      className={`hidden md:block absolute top-4 left-[60%] w-[80%] h-0.5 ${index < current ? "bg-green-600" : "bg-gray-200"}`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
