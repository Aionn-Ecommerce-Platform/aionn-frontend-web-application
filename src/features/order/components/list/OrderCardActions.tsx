"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, RotateCcw, Star } from "lucide-react";
import toast from "react-hot-toast";
import { Button, ConfirmDialog } from "@/shared/ui";
import { orderService } from "@/lib/services";
import { qk } from "@/lib/query-keys";
import { useCartStore } from "@/stores";
import { useTranslation } from "@/hooks";
import { getErrorMessage } from "@/shared/lib/errors";
import type { Order, OrderReturn } from "@/types";
import { getOrderCardActions } from "../../lib/order-card-actions";
import RateOrderDialog, { type OrderSkuLookup } from "./RateOrderDialog";

export default function OrderCardActions({
  order,
  skuLookup,
  activeReturn,
  returnedQtyBySku,
  reviewedSkus,
  onReviewSubmitted,
}: {
  order: Order;
  skuLookup: OrderSkuLookup;
  activeReturn?: OrderReturn | null;
  returnedQtyBySku?: ReadonlyMap<string, number>;
  reviewedSkus: Set<string>;
  onReviewSubmitted: () => void;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const addItem = useCartStore((state) => state.addItem);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [rateOpen, setRateOpen] = useState(false);

  const actions = getOrderCardActions({
    status: order.status,
    hasUnreviewedItem: order.items.some((item) => {
      if (!skuLookup.has(item.skuId)) {
        return false;
      }
      if (reviewedSkus.has(`${order.orderId}:${item.skuId}`)) {
        return false;
      }
      return (returnedQtyBySku?.get(item.skuId) ?? 0) < item.qty;
    }),
    hasActiveReturn: Boolean(activeReturn),
  });

  const completeMutation = useMutation({
    mutationFn: () => orderService.complete(order.orderId),
    onSuccess: (next) => {
      queryClient.setQueryData(qk.order(order.orderId), next);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success(t("orders.completeSuccess"));
      setConfirmOpen(false);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const buyAgainMutation = useMutation({
    mutationFn: async () => {
      let added = 0;
      for (const item of order.items) {
        const lookup = skuLookup.get(item.skuId);
        if (!lookup) {
          continue;
        }
        const { product } = lookup;
        const variant = product.variants[lookup.variantIdx];
        try {
          await addItem({
            skuId: item.skuId,
            productId: product.productId,
            slug: product.slug ?? undefined,
            productName: item.productName ?? product.name,
            imageUrl:
              item.imageUrl ?? product.imageList?.[0] ?? "/images/logo.png",
            price: variant?.price ?? item.unitPrice,
            qty: item.qty,
            currency: variant?.currency ?? order.currency,
            variantAttributes: variant?.attributeValues,
            merchantId: product.merchantId,
          });
          added += 1;
        } catch {
          // addItem already surfaces the error toast for this item.
        }
      }
      return added;
    },
    onSuccess: (added) => {
      if (added === 0) {
        toast.error(t("orders.buyAgainUnavailable"));
        return;
      }
      toast.success(t("orders.buyAgainSuccess", { count: added }));
      router.push("/cart");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  if (
    !actions.confirmReceived &&
    !actions.rate &&
    !actions.buyAgain &&
    !actions.requestReturn &&
    !actions.viewReturn
  ) {
    return null;
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {actions.confirmReceived && (
          <Button
            size="sm"
            className="h-9 rounded-xl bg-gray-950 px-4 text-xs font-bold text-white hover:bg-black"
            onClick={() => setConfirmOpen(true)}
            disabled={completeMutation.isPending}
          >
            <CheckCircle2 size={14} className="mr-1.5" />
            {t("orders.orderReceived")}
          </Button>
        )}
        {actions.rate && (
          <Button
            size="sm"
            variant="outline"
            className="h-9 rounded-xl px-4 text-xs font-bold"
            onClick={() => setRateOpen(true)}
          >
            <Star size={14} className="mr-1.5 fill-amber-400 text-amber-400" />
            {t("orders.rate")}
          </Button>
        )}
        {actions.buyAgain && (
          <Button
            size="sm"
            variant="outline"
            className="h-9 rounded-xl px-4 text-xs font-bold"
            onClick={() => buyAgainMutation.mutate()}
            loading={buyAgainMutation.isPending}
          >
            <RotateCcw size={14} className="mr-1.5" />
            {t("orders.buyAgain")}
          </Button>
        )}
        {actions.requestReturn && (
          <Button
            size="sm"
            variant="outline"
            className="h-9 rounded-xl px-4 text-xs font-bold"
            onClick={() => router.push(`/orders/${order.orderId}/return`)}
          >
            {t("orders.requestReturnRefund")}
          </Button>
        )}
        {actions.viewReturn && activeReturn && (
          <Button
            size="sm"
            variant="outline"
            className="h-9 rounded-xl px-4 text-xs font-bold"
            onClick={() =>
              router.push(
                `/orders?tab=RETURNS&highlight=${activeReturn.returnId}`,
              )
            }
          >
            {t("orders.returns.viewRequest")}
          </Button>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => completeMutation.mutate()}
        title={t("orders.orderReceived")}
        message={t("orders.confirmReceivedMsg")}
        confirmLabel={t("orders.orderReceived")}
        loading={completeMutation.isPending}
      />

      <RateOrderDialog
        open={rateOpen}
        onClose={() => setRateOpen(false)}
        order={order}
        skuLookup={skuLookup}
        returnedQtyBySku={returnedQtyBySku}
        reviewedSkus={reviewedSkus}
        onReviewed={onReviewSubmitted}
      />
    </>
  );
}
