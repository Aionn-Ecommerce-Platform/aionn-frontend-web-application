"use client";

import { AppImage } from "@/shared/ui";
import { formatCurrency } from "@/shared/lib/utils";
import {
  formatVariantKey,
  formatVariantValue,
} from "@/shared/lib/product-utils";
import { calculateShopVoucherDiscount } from "@/lib/domain/checkout";
import type { CartItem, UserVoucher } from "@/types";

type T = (key: string, values?: Record<string, string | number>) => string;

interface CheckoutOrderItemsProps {
  items: CartItem[];
  merchantNames: Map<string, string>;
  shippingByMerchant: Map<string, number>;
  shopVoucherCodes: Record<string, string>;
  vouchers: UserVoucher[];
  onChooseShopVoucher: (merchantId: string) => void;
  notesByMerchant: Record<string, string>;
  onNote: (merchantId: string, value: string) => void;
  currency?: string;
  locale: "vi" | "en";
  t: T;
}

export default function CheckoutOrderItems({
  items,
  merchantNames,
  shippingByMerchant,
  shopVoucherCodes,
  vouchers,
  onChooseShopVoucher,
  notesByMerchant,
  onNote,
  currency,
  locale,
  t,
}: CheckoutOrderItemsProps) {
  const groups = new Map<string, CartItem[]>();
  for (const item of items) {
    const key = item.merchantId ?? "unknown";
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  return (
    <div className="rounded-2xl border border-gray-400 bg-white p-6 shadow-sm">
      <h2 className="mb-4 border-b border-gray-100 pb-3.5 text-base font-semibold text-gray-900">
        {t("checkout.orderItems")}
      </h2>
      <div className="space-y-5">
        {Array.from(groups.entries()).map(([merchantId, groupItems]) => {
          const shipping = shippingByMerchant.get(merchantId);
          const goodsTotal = groupItems.reduce(
            (sum, item) => sum + item.price * (item.qty ?? 1),
            0,
          );
          const shopCode = shopVoucherCodes[merchantId];
          const shopVoucher = shopCode
            ? vouchers.find((voucher) => voucher.voucherCode === shopCode)
            : undefined;
          const shopDiscount = calculateShopVoucherDiscount(
            shopVoucher,
            goodsTotal,
          );
          return (
            <div
              key={merchantId}
              className="rounded-2xl border border-gray-400 bg-white p-6 shadow-sm"
            >
              <div className="mb-2.5 flex items-center justify-between gap-3">
                <p className="truncate text-sm font-semibold text-gray-900">
                  {merchantNames.get(merchantId) ?? t("cart.shopFallback")}
                </p>
              </div>
              <div className="space-y-3">
                {groupItems.map((item) => (
                  <div key={item.skuId} className="flex gap-3">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                      <AppImage
                        src={item.imageUrl}
                        alt={item.productName}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-medium text-gray-900">
                        {item.productName}
                      </p>
                      {item.variantAttributes &&
                        Object.keys(item.variantAttributes).length > 0 && (
                          <p className="mt-0.5 truncate text-xs text-gray-500">
                            {Object.entries(item.variantAttributes)
                              .map(
                                ([key, value]) =>
                                  `${formatVariantKey(key, locale)}: ${formatVariantValue(value)}`,
                              )
                              .join(" | ")}
                          </p>
                        )}
                      <p className="mt-0.5 text-xs text-gray-500">
                        {formatCurrency(item.price, item.currency, locale)} x{" "}
                        {item.qty}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-sale">
                      {formatCurrency(
                        item.price * item.qty,
                        item.currency,
                        locale,
                      )}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <label
                  htmlFor={`seller-note-${merchantId}`}
                  className="mb-1.5 block text-xs font-medium text-gray-500"
                >
                  {t("checkout.deliveryNote")}
                </label>
                <textarea
                  id={`seller-note-${merchantId}`}
                  value={notesByMerchant[merchantId] ?? ""}
                  onChange={(event) => onNote(merchantId, event.target.value)}
                  maxLength={1000}
                  rows={2}
                  placeholder={t("checkout.deliveryNotePlaceholder")}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand focus:outline-none"
                />
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-gray-300 pt-3 text-sm">
                <span className="text-gray-700">{t("cart.voucherShop")}</span>
                {shopCode ? (
                  <span className="flex flex-wrap items-center justify-end gap-2">
                    <span className="font-mono text-xs font-semibold text-gray-800">
                      {shopCode}
                    </span>
                    {shopDiscount > 0 && (
                      <span className="text-xs font-semibold text-commerce">
                        -{formatCurrency(shopDiscount, currency, locale)}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => onChooseShopVoucher(merchantId)}
                      className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      {t("checkout.change")}
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onChooseShopVoucher(merchantId)}
                    className="font-semibold text-brand hover:text-brand-strong"
                  >
                    {t("checkout.chooseVoucher")}
                  </button>
                )}
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-gray-700">
                  {t("checkout.shopShipping")}
                </span>
                <span className="font-semibold text-gray-800">
                  {shipping === undefined
                    ? t("checkout.calculating")
                    : shipping === 0
                      ? t("cart.free")
                      : formatCurrency(shipping, currency, locale)}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm font-bold text-gray-950">
                <span>{t("checkout.shopOrderTotal")}</span>
                <span className="text-sale">
                  {formatCurrency(
                    Math.max(goodsTotal - shopDiscount + (shipping ?? 0), 0),
                    currency,
                    locale,
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
