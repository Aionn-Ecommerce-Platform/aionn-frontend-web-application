"use client";

import { Ticket } from "lucide-react";
import { Button } from "@/shared/ui";

import { formatCurrency } from "@/shared/lib/utils";
import { calculateCheckoutTotal } from "@/lib/domain/checkout";
import type { Address } from "@/types";
type T = (key: string, values?: Record<string, string | number>) => string;

interface SummaryProps {
  itemCount: number;
  currency?: string;
  total: number;
  platformDiscount: number;
  shopDiscount: number;
  shippingDiscount: number;
  address?: Address | null;
  quoteLoading: boolean;
  shipping: number;
  placing: boolean;
  locale: "vi" | "en";
  onPlace: () => void;
  t: T;
}
export function CheckoutSummary(props: SummaryProps) {
  const finalTotal = calculateCheckoutTotal({
    subtotal: props.total,
    platformDiscount: props.platformDiscount,
    shopDiscount: props.shopDiscount,
    shipping: props.shipping,
    shippingDiscount: props.shippingDiscount,
  });
  return (
    <div className="bg-white rounded-2xl border border-gray-400 shadow-sm p-6 h-fit lg:sticky lg:top-44">
      <h2 className="text-base font-semibold text-gray-900 mb-5 pb-4 border-b">
        {props.t("checkout.orderSummary")}
      </h2>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span>
            {props.t("cart.subtotal")} ({props.itemCount}{" "}
            {props.t("checkout.items")})
          </span>
          <span className="font-medium">
            {formatCurrency(props.total, props.currency)}
          </span>
        </div>
        {props.platformDiscount > 0 && (
          <div className="flex justify-between text-commerce">
            <span className="flex items-center gap-1.5">
              <Ticket size={13} />
              {props.t("checkout.voucher")}
            </span>
            <span>
              -{formatCurrency(props.platformDiscount, props.currency)}
            </span>
          </div>
        )}
        {props.shopDiscount > 0 && (
          <div className="flex justify-between text-commerce">
            <span className="flex items-center gap-1.5">
              <Ticket size={13} />
              {props.t("cart.voucherShop")}
            </span>
            <span>-{formatCurrency(props.shopDiscount, props.currency)}</span>
          </div>
        )}
        <div className="flex justify-between gap-3">
          <span>{props.t("cart.shippingFee")}</span>
          <span className="text-right">
            {!props.address
              ? props.t("checkout.shippingNeedsAddress")
              : props.quoteLoading
                ? props.t("checkout.calculating")
                : props.shipping === 0
                  ? props.t("cart.free")
                  : formatCurrency(props.shipping, props.currency)}
          </span>
        </div>
        {props.shippingDiscount > 0 && (
          <div className="flex justify-between text-commerce">
            <span className="flex items-center gap-1.5">
              <Ticket size={13} />
              {props.t("checkout.shippingVoucher")}
            </span>
            <span>
              -{formatCurrency(props.shippingDiscount, props.currency)}
            </span>
          </div>
        )}
        <div className="border-t pt-4 flex justify-between">
          <span className="font-semibold">{props.t("cart.total")}</span>
          <span className="text-2xl font-bold text-commerce">
            {formatCurrency(finalTotal, props.currency)}
          </span>
        </div>
      </div>
      <Button
        onClick={props.onPlace}
        className="w-full mt-6"
        size="lg"
        loading={props.placing || props.quoteLoading}
        disabled={
          !props.address ||
          !props.itemCount ||
          props.placing ||
          props.quoteLoading
        }
      >
        {props.t("checkout.placeOrder")}
      </Button>
    </div>
  );
}
