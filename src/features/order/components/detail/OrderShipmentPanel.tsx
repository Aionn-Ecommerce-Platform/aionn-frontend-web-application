"use client";
import { useMemo, useState } from "react";
import { Truck, Copy, Check, MapPin } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Badge } from "@/shared/ui";
import { useTranslation } from "@/hooks";
import { getShipmentStatus } from "@/lib/domain/status/shipment";
import { shippingService } from "@/lib/services";
import { formatDate, formatDateTime } from "@/shared/lib/utils";
import { getErrorMessage } from "@/shared/lib/errors";
import type { Shipment, ShipmentStatus } from "@/types";

const STEPS = [
  "REQUESTED",
  "REGISTERED",
  "PICKED_UP",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

interface DeliveryInfo {
  hasInfo: boolean;
  recipientName: string | null;
  recipientPhone: string | null;
  addressLine: string | null;
}

export default function OrderShipmentPanel({
  shipment,
  deliveryInfo,
}: {
  shipment: Shipment;
  deliveryInfo: DeliveryInfo;
}) {
  const { t, locale } = useTranslation();
  const [trackingCopied, setTrackingCopied] = useState(false);
  const { data: shipmentEvents = [] } = useQuery({
    queryKey: ["shipment-events", shipment.shipmentId],
    queryFn: () => shippingService.listEvents(shipment.shipmentId),
  });

  const handleCopyTrackingCode = () => {
    if (!shipment?.trackingCode) return;
    navigator.clipboard
      .writeText(shipment.trackingCode)
      .then(() => {
        setTrackingCopied(true);
        toast.success(t("orders.copiedToast"));
        setTimeout(() => setTrackingCopied(false), 2000);
      })
      .catch((err) => {
        toast.error(getErrorMessage(err));
      });
  };

  const labels = [
    "orders.trackingStepRequested",
    "orders.trackingStepRegistered",
    "orders.trackingStepPickedUp",
    "orders.trackingStepInTransit",
    "orders.trackingStepOutForDelivery",
    "orders.trackingStepDelivered",
  ];
  const descriptions = [
    "orders.trackingDescRequested",
    "orders.trackingDescRegistered",
    "orders.trackingDescPickedUp",
    "orders.trackingDescInTransit",
    "orders.trackingDescOutForDelivery",
    "orders.trackingDescDelivered",
  ];
  const timestamps = [
    shipment.createdAt,
    shipment.registeredAt,
    shipment.pickedAt,
    shipment.inTransitAt,
    shipment.outForDeliveryAt,
    shipment.deliveredAt,
  ];
  const current = STEPS.indexOf(shipment.status);
  const currentLabel = t(getShipmentStatus(shipment.status).labelKey);
  const localeTag = locale === "vi" ? "vi-VN" : "en-US";

  const timeline = useMemo(() => {
    if (shipmentEvents.length > 0) {
      const descKeyByStatus: Record<string, string> = {
        REQUESTED: "orders.trackingDescRequested",
        REGISTERED: "orders.trackingDescRegistered",
        PICKED_UP: "orders.trackingDescPickedUp",
        IN_TRANSIT: "orders.trackingDescInTransit",
        OUT_FOR_DELIVERY: "orders.trackingDescOutForDelivery",
        DELIVERED: "orders.trackingDescDelivered",
      };
      return shipmentEvents.map((event, index) => {
        const cfg = getShipmentStatus(event.status as ShipmentStatus);
        return {
          key: event.eventId,
          label: cfg ? t(cfg.labelKey) : event.status,
          description:
            event.description && event.description.trim()
              ? event.description
              : t(descKeyByStatus[event.status] ?? "orders.trackingDescInTransit"),
          location: event.location,
          at: event.occurredAt,
          done: true,
          current: index === shipmentEvents.length - 1,
        };
      });
    }

    return STEPS.map((step, index) => ({
      key: step,
      label: t(labels[index]!),
      description:
        step === "IN_TRANSIT" && shipment.currentLocation
          ? shipment.currentLocation
          : step === "OUT_FOR_DELIVERY" && shipment.shipperName
            ? `${shipment.shipperName}${shipment.shipperPhone ? ` · ${shipment.shipperPhone}` : ""}`
            : t(descriptions[index]!),
      location: null,
      at: timestamps[index],
      done: index <= current,
      current: index === current,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shipmentEvents, shipment, current, t]);

  return (
    <div className="bg-white rounded-2xl border border-gray-400 p-6 mb-6 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <h3 className="font-bold text-gray-950 flex items-center gap-2.5 text-base">
          <span className="flex h-10 w-10 items-center justify-center text-brand shrink-0">
            <Truck size={24} />
          </span>
          {t("orders.shippingInfo")}
        </h3>
        <div className="text-right">
          <div className="inline-flex items-center gap-1.5">
            <span className="font-mono text-sm font-semibold text-gray-500">
              {shipment.trackingCode || t("orders.noTrackingYet")}
            </span>
            {shipment.trackingCode && (
              <button
                type="button"
                onClick={handleCopyTrackingCode}
                className="inline-flex items-center justify-center w-6 h-6 rounded-md border border-gray-400 bg-white hover:bg-gray-50 text-gray-500 hover:text-gray-950 transition-colors shadow-2xs cursor-pointer"
                title={t("orders.copyCode")}
                aria-label={t("orders.copyCode")}
              >
                {trackingCopied ? (
                  <Check size={13} className="text-emerald-600" />
                ) : (
                  <Copy size={13} />
                )}
              </button>
            )}
            <span className="text-sm font-semibold text-gray-900">GHN</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="min-w-0">
          {deliveryInfo.hasInfo ? (
            <div className="space-y-1.5">
              {deliveryInfo.recipientName && (
                <p className="text-base font-bold text-gray-950">
                  {deliveryInfo.recipientName}
                </p>
              )}
              {deliveryInfo.recipientPhone && (
                <p className="text-sm leading-relaxed text-gray-600">
                  {deliveryInfo.recipientPhone}
                </p>
              )}
              {deliveryInfo.addressLine && (
                <p className="text-sm leading-relaxed text-gray-600">
                  {deliveryInfo.addressLine}
                </p>
              )}
            </div>
          ) : (
            <p className="text-base text-gray-500">
              {t("orders.noShippingAddress")}
            </p>
          )}

          <div className="mt-5 space-y-3 text-sm">
            <div>
              <p className="text-sm text-gray-500 font-medium">
                {t("orders.shippingStatus")}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge
                  variant={getShipmentStatus(shipment.status).variant}
                  className="!rounded-full !px-3 !py-1 !text-sm"
                >
                  {currentLabel}
                </Badge>
                {shipment.lastFailureReason && (
                  <span className="text-sm text-rose-600 font-medium">
                    ({shipment.lastFailureReason})
                  </span>
                )}
              </div>
            </div>
            {shipment.expectedDeliveryDate && (
              <div>
                <p className="text-sm text-gray-500 font-medium">
                  {t("orders.estimatedDelivery")}
                </p>
                <p className="font-semibold text-gray-900 mt-0.5">
                  {formatDate(shipment.expectedDeliveryDate, locale)}
                </p>
              </div>
            )}
            {shipment.shipperName && (
              <div>
                <p className="text-sm text-gray-500 font-medium">
                  {t("orders.shipperName")}
                </p>
                <p className="font-semibold text-gray-900 mt-0.5">
                  {shipment.shipperName}{" "}
                  {shipment.shipperPhone && `(${shipment.shipperPhone})`}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0">
          <p className="text-base font-bold text-gray-950 mb-4">
            {t("orders.trackingHistory")}
          </p>
          <ol className="relative space-y-5 pl-9 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-px before:bg-gray-300">
            {timeline.map((event, index) => {
              return (
                <li key={event.key} className="relative">
                  <span
                    className={`absolute -left-9 top-0.5 flex h-6 w-6 items-center justify-center rounded-full ${
                      event.done
                        ? "bg-emerald-500 text-white"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {event.done ? (
                      <Check size={13} strokeWidth={3} />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                    )}
                  </span>
                  {event.at && (
                    <p className="text-xs font-medium text-gray-400">
                      {formatDateTime(event.at, localeTag)}
                    </p>
                  )}
                  <p
                    className={`text-base font-bold ${
                      event.current
                        ? "text-emerald-600"
                        : event.done
                          ? "text-gray-950"
                          : "text-gray-400"
                    }`}
                  >
                    {event.label}
                  </p>
                  <p
                    className={`text-sm leading-relaxed ${
                      event.done ? "text-gray-600" : "text-gray-400"
                    }`}
                  >
                    {event.description}
                  </p>
                  {event.location &&
                    event.location !== event.description && (
                      <p className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                        <MapPin size={12} className="shrink-0" />
                        {event.location}
                      </p>
                    )}
                  {index < timeline.length - 1 && (
                    <span className="absolute -bottom-5 left-[-25px] h-5 w-px bg-gray-300" />
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}
