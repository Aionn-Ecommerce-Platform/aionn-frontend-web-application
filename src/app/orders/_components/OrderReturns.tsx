"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Loader2, Package, PackageX } from "lucide-react";
import { AppImage, Badge, Button, EmptyState } from "@/shared/ui";
import { orderReturnService, orderService } from "@/lib/services";
import { qk } from "@/lib/query-keys";
import { formatCurrency, formatDateTime } from "@/shared/lib/utils";
import { useMerchantNameMap, useTranslation } from "@/hooks";
import { getReturnStatus } from "@/lib/domain/status/return";
import { returnReasonBadgeClass, returnReasonLabelKey } from "@/lib/domain/return-reasons";
import ReturnRequestDialog from "./ReturnRequestDialog";
import type { OrderReturn } from "@/types";

const STATUS_DOT_CLASS: Record<string, string> = {
  default: "bg-gray-500",
  success: "bg-green-600",
  warning: "bg-yellow-500",
  danger: "bg-red-600",
  info: "bg-blue-600",
};

interface OrderReturnsProps {
  highlight?: string | null;
  onViewOrders?: () => void;
}

export default function OrderReturns({
  highlight,
  onViewOrders,
}: OrderReturnsProps) {
  const { t, locale } = useTranslation();
  const merchantNameById = useMerchantNameMap();
  const [detailRequest, setDetailRequest] = useState<OrderReturn | null>(null);

  const { data: returns, isLoading } = useQuery({
    queryKey: ["returns", "mine"],
    queryFn: () => orderReturnService.listMine(50),
  });

  const orderQueries = useQueries({
    queries: (returns ?? []).map((r) => ({
      queryKey: qk.order(r.orderId),
      queryFn: () => orderService.get(r.orderId),
      enabled: Boolean(r.orderId),
    })),
  });

  const orderByReturnId = new Map(
    (returns ?? []).map(
      (r, index) => [r.returnId, orderQueries[index]?.data] as const,
    ),
  );

  const itemQueries = useQueries({
    queries: (returns ?? []).map((r) => ({
      queryKey: ["returns", "items", r.returnId],
      queryFn: () => orderReturnService.getItems(r.returnId),
      enabled: Boolean(r.returnId),
    })),
  });

  const itemsByReturnId = new Map(
    (returns ?? []).map(
      (r, index) => [r.returnId, itemQueries[index]?.data ?? []] as const,
    ),
  );

  if (isLoading) {
    return (
      <div className="flex justify-center rounded-2xl border border-gray-400 bg-white py-20 shadow-xs">
        <Loader2 className="animate-spin text-brand" size={32} />
      </div>
    );
  }

  if (!returns || returns.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-400 bg-white p-8 shadow-xs">
        <EmptyState
          icon={PackageX}
          title={t("orders.returns.noReturns")}
          description={t("orders.returns.noReturnsDesc")}
          action={
            onViewOrders ? (
              <Button
                className="bg-brand hover:bg-brand-strong text-white font-semibold rounded-xl shadow-xs"
                onClick={onViewOrders}
              >
                {t("orders.returns.viewMyOrders")}
              </Button>
            ) : (
              <Link href="/orders">
                <Button className="bg-brand hover:bg-brand-strong text-white font-semibold rounded-xl shadow-xs">
                  {t("orders.returns.viewMyOrders")}
                </Button>
              </Link>
            )
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {returns.map((r) => {
        const status = getReturnStatus(r.status);
        const order = orderByReturnId.get(r.returnId);
        const returnItems = itemsByReturnId.get(r.returnId) ?? [];
        const currency = order?.currency ?? r.currency ?? "VND";
        const isHighlight = highlight === r.returnId;
        const orderHref = `/orders/${r.orderId}?fromTab=RETURNS`;

        return (
          <div
            key={r.returnId}
            className={`overflow-hidden rounded-2xl border bg-white shadow-xs transition-all hover:shadow-md ${
              isHighlight
                ? "border-brand ring-1 ring-brand/30"
                : "border-gray-400"
            }`}
          >
            <div className="flex items-center justify-between gap-3 border-b border-gray-100 bg-gray-50/60 px-6 py-3.5">
              <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center text-brand">
                  <Package size={24} />
                </div>
                <Link
                  href={`/merchants/${r.merchantId}`}
                  className="truncate text-base font-bold text-gray-950 transition-colors hover:text-brand sm:text-lg"
                >
                  {merchantNameById.get(r.merchantId) ?? t("orders.store")}
                </Link>
                <span
                  className={`hidden h-2 w-2 shrink-0 rounded-full sm:inline-block ${
                    STATUS_DOT_CLASS[status?.variant ?? "default"]
                  }`}
                />
                <span className="text-sm font-medium text-gray-500">
                  {formatDateTime(
                    r.requestedAt,
                    locale === "vi" ? "vi-VN" : "en-US",
                  )}
                </span>
              </div>

              <Badge
                variant={status?.variant ?? "default"}
                className="shrink-0 !rounded-full !px-3 !py-1 !text-sm"
              >
                {t(status.labelKey)}
              </Badge>
            </div>

            {returnItems.length ? (
              <div className="divide-y divide-gray-100">
                {returnItems.map((item) => {
                  const orderItem = order?.items.find(
                    (candidate) => candidate.skuId === item.skuId,
                  );
                  const originalUnit = orderItem?.originalUnitPrice;
                  const hasDiscount =
                    originalUnit != null && originalUnit > item.unitPrice;

                  return (
                    <Link
                      key={item.skuId}
                      href={orderHref}
                      className="group flex items-center gap-4 px-6 py-4 transition-colors hover:bg-gray-50/60"
                    >
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-gray-400 bg-white">
                        <Image
                          src={orderItem?.imageUrl ?? "/images/logo.png"}
                          alt={orderItem?.productName ?? item.skuId}
                          fill
                          className="object-contain p-1.5"
                          sizes="80px"
                        />
                      </div>
                      <div className="min-w-0 flex-1 pr-4">
                        <h4 className="line-clamp-2 text-base font-semibold leading-snug text-gray-900 transition-colors group-hover:text-brand">
                          {orderItem?.productName ?? item.skuId}
                        </h4>
                        {orderItem?.variantLabel && (
                          <p className="mt-1 truncate text-sm text-gray-500">
                            {t("orders.variantLabel")}
                            {orderItem.variantLabel}
                          </p>
                        )}
                        <p className="mt-1 font-mono text-sm text-gray-500">
                          x{item.qty}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-baseline justify-end gap-2 text-right">
                        {hasDiscount && (
                          <span className="text-sm text-gray-400 line-through">
                            {formatCurrency(originalUnit ?? item.unitPrice, currency)}
                          </span>
                        )}
                        <span
                          className={`text-lg font-extrabold ${
                            hasDiscount
                              ? "bg-gradient-to-r from-purple-700 via-fuchsia-600 to-indigo-700 bg-clip-text text-transparent"
                              : "text-gray-950"
                          }`}
                        >
                          {formatCurrency(item.unitPrice, currency)}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : null}

            <div className="border-t border-gray-100 bg-white px-6 py-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1 space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-semibold text-gray-900">
                      {t("orders.returns.reasonTypeLabel")}:
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${returnReasonBadgeClass(
                        r.reasonType,
                      )}`}
                    >
                      {t(returnReasonLabelKey(r.reasonType))}
                    </span>
                  </div>
                  <p className="text-base leading-relaxed text-gray-700">
                    <span className="font-semibold text-gray-900">
                      {t("orders.returns.reason")}:
                    </span>{" "}
                    {r.reason}
                  </p>

                  {r.evidenceUrl && (
                    <AppImage
                      src={r.evidenceUrl}
                      alt={t("orders.returns.evidenceLabel")}
                      className="h-24 w-24 rounded-lg border border-gray-400 object-cover"
                    />
                  )}

                  {r.status === "REJECTED" && r.rejectionReason && (
                    <p className="text-base text-red-600">
                      {t("orders.returns.rejectReasonLabel")}: {r.rejectionReason}
                    </p>
                  )}
                </div>

                {r.refundAmount != null && (
                  <div className="shrink-0 text-right">
                    <div className="flex items-baseline justify-end gap-2">
                      <span className="text-sm text-gray-600">
                        {t("orders.returns.refundAmountLabel")}:
                      </span>
                      <span className="text-lg font-extrabold text-gray-950 sm:text-xl">
                        {formatCurrency(r.refundAmount, currency)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-end gap-2 pt-3">
                <Link href={orderHref}>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 rounded-xl px-4 text-xs font-bold"
                  >
                    {t("orders.orderDetails")}
                  </Button>
                </Link>
                <Button
                  size="sm"
                  className="h-9 rounded-xl border border-purple-500/40 bg-gradient-to-r from-purple-700 via-fuchsia-600 to-indigo-700 px-4 text-xs font-bold text-white shadow-md shadow-purple-600/20 transition-all hover:from-purple-600 hover:via-fuchsia-500 hover:to-indigo-600"
                  onClick={() => setDetailRequest(r)}
                >
                  {t("orders.returns.viewRequestDetail")}
                </Button>
              </div>
            </div>
          </div>
        );
      })}

      <ReturnRequestDialog
        request={detailRequest}
        order={
          detailRequest
            ? orderByReturnId.get(detailRequest.returnId)
            : undefined
        }
        items={
          detailRequest
            ? (itemsByReturnId.get(detailRequest.returnId) ?? [])
            : []
        }
        onClose={() => setDetailRequest(null)}
      />
    </div>
  );
}
