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
    <div className="bg-white rounded-2xl border border-gray-200/90 p-6 mb-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
      <h3 className="font-bold text-gray-950 mb-4 flex items-center gap-2.5 text-base">
        <div className="w-7 h-7 rounded-lg bg-brand/10 text-brand flex items-center justify-center shrink-0">
          <Truck size={16} />
        </div>
        {t("orders.shippingInfo")}
      </h3>
      <div className="grid md:grid-cols-2 gap-4 mb-6 text-sm">
        <div>
          <p className="text-xs text-gray-500 font-medium">{t("orders.carrier")}</p>
          <p className="font-semibold text-gray-900 mt-0.5">{t("checkout.express")} (GHN)</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 font-medium">{t("orders.trackingNumber")}</p>
          <p className="font-mono font-bold text-gray-950 mt-0.5">
            {shipment.trackingCode || t("orders.noTrackingYet")}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 font-medium">{t("orders.shippingStatus")}</p>
          <span className="font-bold text-brand mt-0.5 inline-block">
            {t(getShipmentStatus(shipment.status).labelKey)}
            {shipment.currentLocation ? ` (${shipment.currentLocation})` : ""}
            {shipment.lastFailureReason
              ? `: ${shipment.lastFailureReason}`
              : ""}
          </span>
        </div>
        {shipment.shipperName && (
          <div>
            <p className="text-xs text-gray-500 font-medium">{t("orders.shipperName")}</p>
            <p className="font-semibold text-gray-900 mt-0.5">
              {shipment.shipperName}{" "}
              {shipment.shipperPhone && `(${shipment.shipperPhone})`}
            </p>
          </div>
        )}
        {shipment.expectedDeliveryDate && (
          <div>
            <p className="text-xs text-gray-500 font-medium">{t("orders.estimatedDelivery")}</p>
            <p className="font-semibold text-gray-900 mt-0.5">
              {formatDate(shipment.expectedDeliveryDate, locale)}
            </p>
          </div>
        )}
      </div>
      {!["CANCELLED", "RETURNED", "DELIVERY_FAILED"].includes(
        shipment.status,
      ) && (
        <div className="border-t border-gray-100 pt-6">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
            {t("orders.trackingHistory")}
          </p>
          <div className="flex flex-col md:flex-row gap-4">
            {STEPS.map((step, index) => {
              const done = index <= current;
              return (
                <div
                  key={step}
                  className="flex-1 flex md:flex-col items-center gap-2 relative"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold z-10 transition-colors ${
                      done
                        ? "bg-gray-950 text-white shadow-xs"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {index + 1}
                  </div>
                  <span
                    className={`text-xs text-center font-medium ${
                      done ? "text-gray-950 font-bold" : "text-gray-400"
                    }`}
                  >
                    {t(labels[index]!)}
                  </span>
                  {index < STEPS.length - 1 && (
                    <div
                      className={`hidden md:block absolute top-4 left-[60%] w-[80%] h-0.5 ${
                        index < current ? "bg-gray-950" : "bg-gray-200"
                      }`}
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
