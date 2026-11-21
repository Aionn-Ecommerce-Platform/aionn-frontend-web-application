"use client";

import Image from "next/image";
import { AppImage, Badge, Modal } from "@/shared/ui";
import { formatCurrency, formatDateTime } from "@/shared/lib/utils";
import { getReturnStatus } from "@/lib/domain/status/return";
import {
  returnReasonBadgeClass,
  returnReasonLabelKey,
} from "@/lib/domain/return-reasons";
import { useTranslation } from "@/hooks";
import type { Order, OrderReturn } from "@/types";

export interface ReturnLineItem {
  skuId: string;
  qty: number;
  unitPrice: number;
  refundAmount: number;
}

export default function ReturnRequestDialog({
  request,
  order,
  items,
  onClose,
}: {
  request: OrderReturn | null;
  order?: Order;
  items: ReturnLineItem[];
  onClose: () => void;
}) {
  const { t, locale } = useTranslation();
  const status = request ? getReturnStatus(request.status) : null;
  const currency = order?.currency ?? request?.currency ?? "VND";

  return (
    <Modal
      isOpen={Boolean(request)}
      onClose={onClose}
      title={t("orders.returns.requestDetailTitle")}
      size="lg"
    >
      {request && (
        <div className="space-y-5 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-xs text-gray-500">
                {t("orders.returns.requestIdLabel")}: {request.returnId}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                {t("orders.returns.createdAt", {
                  date: formatDateTime(
                    request.requestedAt,
                    locale === "vi" ? "vi-VN" : "en-US",
                  ),
                })}
              </p>
            </div>
            {status && (
              <Badge
                variant={status.variant}
                className="!rounded-full !px-3 !py-1 !text-sm"
              >
                {t(status.labelKey)}
              </Badge>
            )}
          </div>

          {items.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-bold text-gray-950">
                {t("orders.products")}
              </p>
              <div className="divide-y divide-gray-100">
                {items.map((item) => {
                  const orderItem = order?.items.find(
                    (candidate) => candidate.skuId === item.skuId,
                  );
                  const name = orderItem?.productName ?? item.skuId;
                  return (
                    <div
                      key={item.skuId}
                      className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-gray-400 bg-white">
                        <Image
                          src={orderItem?.imageUrl ?? "/images/logo.png"}
                          alt={name}
                          fill
                          sizes="56px"
                          className="object-contain p-1"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-semibold text-gray-900">
                          {name}
                        </p>
                        {orderItem?.variantLabel && (
                          <p className="mt-0.5 truncate text-xs text-gray-500">
                            {orderItem.variantLabel}
                          </p>
                        )}
                        <p className="mt-0.5 font-mono text-xs text-gray-400">
                          x{item.qty}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-gray-950">
                        {formatCurrency(item.refundAmount, currency)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-2 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-gray-500">
                {t("orders.returns.reasonTypeLabel")}:
              </span>
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${returnReasonBadgeClass(
                  request.reasonType,
                )}`}
              >
                {t(returnReasonLabelKey(request.reasonType))}
              </span>
            </div>
            <p className="leading-relaxed text-gray-700">{request.reason}</p>

            {request.evidenceUrl && (
              <div>
                <p className="mb-1.5 text-gray-500">
                  {t("orders.returns.evidenceLabel")}
                </p>
                <AppImage
                  src={request.evidenceUrl}
                  alt={t("orders.returns.evidenceLabel")}
                  className="h-24 w-24 rounded-lg border border-gray-400 object-cover"
                />
              </div>
            )}

            {request.rejectionReason && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-red-700">
                <span className="font-semibold">
                  {t("orders.returns.rejectReasonLabel")}:
                </span>{" "}
                {request.rejectionReason}
              </p>
            )}

            {request.refundAmount != null && (
              <div className="flex items-baseline justify-between border-t border-gray-100 pt-3">
                <span className="text-gray-500">
                  {t("orders.returns.refundAmountLabel")}
                </span>
                <span className="text-lg font-extrabold text-gray-950">
                  {formatCurrency(request.refundAmount, currency)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
