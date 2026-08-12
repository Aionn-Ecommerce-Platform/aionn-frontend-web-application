"use client";
import { Check, Ticket } from "lucide-react";
import { Button } from "@/shared/ui";
import ProductCard from "@/components/product/ProductCard";
import { getProductCardSummary } from "@/shared/lib/product-utils";
import { formatCurrency } from "@/shared/lib/utils";
import type { Address, Product, UserVoucher } from "@/types";
type T = (key: string, values?: Record<string, string | number>) => string;

interface SummaryProps {
  itemCount: number;
  currency?: string;
  total: number;
  voucher?: UserVoucher | null;
  voucherValid: boolean;
  discount: number;
  address?: Address | null;
  quoteLoading: boolean;
  shipping: number;
  placing: boolean;
  locale: "vi" | "en";
  onPlace: () => void;
  t: T;
}
export function CheckoutSummary(props: SummaryProps) {
  const finalTotal = props.total - props.discount + props.shipping;
  return (
    <div className="bg-white rounded-2xl border border-gray-400 shadow-sm p-6 h-fit lg:sticky lg:top-20">
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
        {props.voucher && props.voucherValid && (
          <div className="flex justify-between text--commerce">
            <span className="flex gap-1">
              <Ticket size={13} />
              {props.voucher.voucherCode}
            </span>
            <span>
              -
              {formatCurrency(
                props.discount,
                props.voucher.voucherCurrency ?? props.currency,
              )}
            </span>
          </div>
        )}
        <div className="flex justify-between">
          <span>{props.t("cart.shippingFee")}</span>
          <span>
            {!props.address
              ? props.t("checkout.shippingNeedsAddress")
              : props.quoteLoading
                ? props.t("checkout.calculating")
                : props.shipping === 0
                  ? props.t("cart.free")
                  : formatCurrency(props.shipping, props.currency)}
          </span>
        </div>
        <div className="border-t pt-4 flex justify-between">
          <span className="font-semibold">{props.t("cart.total")}</span>
          <span className="text-2xl font-bold text--commerce">
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
      <p className="mt-3 flex justify-center gap-1 text-[11px] text-gray-400">
        <Check size={11} className="text-green-600" />
        {props.t("checkout.secureTransaction")}
      </p>
    </div>
  );
}

export function CheckoutRecommendations({
  products,
  t,
}: {
  products?: Product[];
  t: T;
}) {
  if (!products?.length) return null;
  return (
    <section className="mt-8">
      <h2 className="mb-6 text-lg font-semibold">
        {t("cart.recommendations")}
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {products.slice(0, 12).map((product) => {
          const card = getProductCardSummary(product);
          return (
            <ProductCard
              key={product.productId}
              id={product.productId}
              name={product.name}
              price={card.price}
              originalPrice={card.originalPrice}
              image={card.image}
              merchant={product.merchantId}
              rating={product.rating}
              reviewCount={product.reviewCount}
              sold={product.soldCount}
              flashSale={product.flashSale}
              provinceName={product.provinceName ?? undefined}
            />
          );
        })}
      </div>
    </section>
  );
}
