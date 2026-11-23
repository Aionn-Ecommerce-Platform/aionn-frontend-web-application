"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { ChevronLeft, Loader2, Star } from "lucide-react";
import { Button, Modal } from "@/shared/ui";
import { SubmitReviewForm } from "@/components/review/SubmitReviewForm";
import { reviewService } from "@/lib/services";
import { formatVariantLabel } from "@/shared/lib/product-utils";
import { getProductCoverImage } from "@/shared/lib/media";
import { useTranslation } from "@/hooks";
import type { Order, Product } from "@/types";

export type OrderSkuLookup = Map<
  string,
  { product: Product; variantIdx: number }
>;

export default function RateOrderDialog({
  open,
  onClose,
  order,
  skuLookup,
  returnedQtyBySku,
  reviewedSkus,
  onReviewed,
}: {
  open: boolean;
  onClose: () => void;
  order: Order;
  skuLookup: OrderSkuLookup;
  returnedQtyBySku?: ReadonlyMap<string, number>;
  reviewedSkus: Set<string>;
  onReviewed: () => void;
}) {
  const { t } = useTranslation();
  const [selectedSkuId, setSelectedSkuId] = useState<string | null>(null);

  const candidates = useMemo(
    () =>
      order.items.flatMap((item) => {
        if (reviewedSkus.has(`${order.orderId}:${item.skuId}`)) {
          return [];
        }
        const returnedQty = returnedQtyBySku?.get(item.skuId) ?? 0;
        if (returnedQty >= item.qty) {
          return [];
        }
        const lookup = skuLookup.get(item.skuId);
        if (!lookup) {
          return [];
        }
        return [
          {
            item,
            product: lookup.product,
            variant: lookup.product.variants[lookup.variantIdx],
          },
        ];
      }),
    [order, returnedQtyBySku, reviewedSkus, skuLookup],
  );

  const eligibilityQueries = useQueries({
    queries: open
      ? candidates.map(({ item, product }) => ({
          queryKey: [
            "review-eligibility",
            order.orderId,
            item.skuId,
            product.productId,
          ],
          queryFn: () =>
            reviewService.checkEligibility(product.productId, {
              orderId: order.orderId,
              skuId: item.skuId,
            }),
        }))
      : [],
  });

  const loading = eligibilityQueries.some((query) => query.isLoading);
  const eligible = candidates.filter(
    (_, index) => eligibilityQueries[index]?.data?.canReview,
  );
  const selected = selectedSkuId
    ? eligible.find((candidate) => candidate.item.skuId === selectedSkuId)
    : null;

  const close = () => {
    setSelectedSkuId(null);
    onClose();
  };

  return (
    <Modal
      isOpen={open}
      onClose={close}
      title={selected ? t("orders.rateTitle") : t("orders.rateOrderTitle")}
      size="lg"
    >
      <div className="p-6">
        {selected ? (
          <>
            <button
              type="button"
              onClick={() => setSelectedSkuId(null)}
              className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-gray-600 transition-colors hover:text-gray-950"
            >
              <ChevronLeft size={16} />
              {t("orders.backToRateList")}
            </button>
            <p className="mb-4 text-sm font-medium text-gray-500">
              {selected.item.productName ??
                selected.product.name ??
                selected.item.skuId}
            </p>
            <SubmitReviewForm
              productId={selected.product.productId}
              orderId={order.orderId}
              skuId={selected.item.skuId}
              onSuccess={() => {
                onReviewed();
                setSelectedSkuId(null);
              }}
              onCancel={() => setSelectedSkuId(null)}
            />
          </>
        ) : loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-brand" size={28} />
          </div>
        ) : eligible.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500">
            {candidates.length === 0
              ? t("orders.rateAllDone")
              : t("orders.rateUnavailable")}
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {eligible.map(({ item, product, variant }) => {
              const name = item.productName ?? product.name ?? item.skuId;
              const variantLabel =
                item.variantLabel ??
                formatVariantLabel(variant?.attributeValues);
              const image =
                item.imageUrl ?? getProductCoverImage(product.imageList);
              return (
                <div
                  key={item.skuId}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-gray-400 bg-white">
                    <Image
                      src={image}
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
                    {variantLabel && (
                      <p className="mt-0.5 truncate text-xs text-gray-500">
                        {variantLabel}
                      </p>
                    )}
                    <p className="mt-0.5 font-mono text-xs text-gray-400">
                      x{item.qty}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="shrink-0 gap-1.5 rounded-lg px-3 text-xs font-bold"
                    onClick={() => setSelectedSkuId(item.skuId)}
                  >
                    <Star size={14} className="fill-amber-400 text-amber-400" />
                    {t("orders.rate")}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
