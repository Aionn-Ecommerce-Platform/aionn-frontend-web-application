"use client";
import Image from "next/image";
import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Gift,
  Minus,
  Package,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Star,
  Truck,
  Zap,
} from "lucide-react";
import { Badge, Button } from "@/shared/ui";
import { getLocalizedAddress } from "@/shared/lib/address-utils";
import { formatCurrency } from "@/shared/lib/utils";
import type { Address, Product, ProductVariant } from "@/types";
import type { Locale } from "@/stores/locale.store";
import { formatVariantKey, formatVariantValue } from "./product-detail-utils";

type T = (key: string, values?: Record<string, string | number>) => string;
interface Props {
  product: Product;
  images: string[];
  selectedImage: number;
  setSelectedImage: (value: number) => void;
  goToPreviousImage: () => void;
  goToNextImage: () => void;
  reviewCount: number;
  currentRating: number;
  roundedRating: number;
  soldCount: number;
  priceLabel: string;
  currentVariant?: ProductVariant;
  strikePrice?: number;
  displayPrice: number;
  displayCurrency: string;
  discountPercent: number;
  shippingLoading: boolean;
  locale: Locale;
  deliveryDateLabel: string | null;
  isAuthenticated: boolean;
  destAddress: Address | null;
  shippingFee: number | null;
  setSelectedVariantIdx: (value: number | null) => void;
  stock: number | null;
  quantity: number;
  setQuantity: (value: number) => void;
  adding: boolean;
  handleAddToCart: () => void;
  handleBuyNow: () => void;
  t: T;
}
export default function ProductMainCard(props: Props) {
  const {
    product,
    images,
    selectedImage,
    setSelectedImage,
    goToPreviousImage,
    goToNextImage,
    reviewCount,
    currentRating,
    roundedRating,
    soldCount,
    priceLabel,
    currentVariant,
    strikePrice,
    displayPrice,
    displayCurrency,
    discountPercent,
    shippingLoading,
    locale,
    deliveryDateLabel,
    isAuthenticated,
    destAddress,
    shippingFee: _shippingFee,
    setSelectedVariantIdx,
    stock,
    quantity,
    setQuantity,
    adding,
    handleAddToCart,
    handleBuyNow,
    t,
  } = props;
  const [selectionState, setSelectionState] = useState<{
    productId: string;
    values: Record<string, string>;
  }>({ productId: product.productId, values: {} });
  const selectedAttributes =
    selectionState.productId === product.productId ? selectionState.values : {};
  const attributeKeys = useMemo(() => {
    const keys: string[] = [];
    for (const variant of product.variants) {
      for (const key of Object.keys(variant.attributeValues)) {
        if (!keys.includes(key)) keys.push(key);
      }
    }
    return keys;
  }, [product.variants]);
  const attributeOptions = useMemo(
    () =>
      Object.fromEntries(
        attributeKeys.map((key) => [
          key,
          [
            ...new Set(
              product.variants
                .map((variant) => variant.attributeValues[key])
                .filter(Boolean),
            ),
          ],
        ]),
      ) as Record<string, string[]>,
    [attributeKeys, product.variants],
  );

  const selectAttribute = (key: string, value: string) => {
    // When changing an attribute, retain only selections that are compatible with [key]: value
    const compatibleAttributes: Record<string, string> = { [key]: value };
    for (const [existingKey, existingValue] of Object.entries(
      selectedAttributes,
    )) {
      if (existingKey === key) continue;
      const isStillCompatible = product.variants.some(
        (variant) =>
          variant.attributeValues[key] === value &&
          variant.attributeValues[existingKey] === existingValue,
      );
      if (isStillCompatible) {
        compatibleAttributes[existingKey] = existingValue;
      }
    }

    setSelectionState({
      productId: product.productId,
      values: compatibleAttributes,
    });
    const selectedVariantIndex = product.variants.findIndex((variant) =>
      attributeKeys.every(
        (attributeKey) =>
          variant.attributeValues[attributeKey] ===
          compatibleAttributes[attributeKey],
      ),
    );
    setSelectedVariantIdx(
      selectedVariantIndex >= 0 ? selectedVariantIndex : null,
    );
    setQuantity(1);
  };

  const isOptionAvailable = (key: string, value: string) =>
    product.variants.some(
      (variant) =>
        variant.attributeValues[key] === value &&
        Object.entries(selectedAttributes).every(
          ([selectedKey, selectedValue]) =>
            selectedKey === key ||
            variant.attributeValues[selectedKey] === selectedValue,
        ),
    );

  return (
    <>
      {" "}
      <div className="bg-white rounded-sm border border-gray-400 overflow-hidden">
        <div className="grid lg:grid-cols-2 gap-8 p-6 lg:p-8">
          <div>
            <div className="aspect-square relative bg-gray-50 rounded-sm overflow-hidden mb-4 border border-gray-400 group">
              <Image
                src={images[selectedImage] ?? "/images/logo.png"}
                alt={product.name}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-contain p-8"
              />
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={goToPreviousImage}
                    className="absolute left-3 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-xs border border-gray-400 bg-white/95 text-gray-700 shadow-sm hover:bg-blue-600 hover:text-white hover:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Previous product image"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={goToNextImage}
                    className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-xs border border-gray-400 bg-white/95 text-gray-700 shadow-sm hover:bg-blue-600 hover:text-white hover:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Next product image"
                  >
                    <ChevronRight size={20} />
                  </button>
                </>
              )}
            </div>
            {images.length > 1 && (
              <div className="px-8">
                <div
                  className="flex min-w-0 gap-2 overflow-x-auto scroll-smooth py-1"
                  style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                  {images.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedImage(i)}
                      className={`w-16 h-16 relative rounded-xs overflow-hidden border flex-shrink-0 transition-all bg-white ${
                        selectedImage === i
                          ? "border-blue-600 ring-2 ring-blue-100"
                          : "border-gray-400 hover:border-blue-500"
                      }`}
                    >
                      <Image
                        src={img}
                        alt=""
                        fill
                        className="object-contain p-2"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:py-1 flex flex-col justify-between lg:aspect-square">
            <div>
              {product.status !== "PUBLISHED" && (
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge variant="warning">{product.status}</Badge>
                </div>
              )}

              <h1 className="text-2xl font-semibold text-gray-900 leading-snug">
                {product.name}
              </h1>

              <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                {reviewCount > 0 ? (
                  <>
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-gray-900">
                        {currentRating.toFixed(1)}
                      </span>
                      <div className="flex text-amber-400">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <Star
                            key={index}
                            size={14}
                            fill="currentColor"
                            className={
                              index < roundedRating
                                ? "text-amber-400"
                                : "text-gray-200"
                            }
                          />
                        ))}
                      </div>
                    </div>
                    <span className="h-5 w-px bg-gray-200" />
                    <span>
                      <span className="font-medium text-gray-900">
                        {reviewCount}
                      </span>{" "}
                      {t("products.ratingLabel")}
                    </span>
                  </>
                ) : (
                  <span>{t("productDetail.noReviews")}</span>
                )}
                <span className="h-5 w-px bg-gray-200" />
                <span>
                  {t("productDetail.sold")}{" "}
                  <span className="font-medium text-gray-900">{soldCount}</span>
                </span>
              </div>

              <div className="mt-5 py-3">
                {product.variants.length > 0 ? (
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <span
                      className={`text-3xl sm:text-4xl font-normal leading-tight ${
                        discountPercent > 0
                          ? "text-orange-600"
                          : "text-gray-900"
                      }`}
                    >
                      {priceLabel}
                    </span>
                    {strikePrice && strikePrice > displayPrice && (
                      <span className="text-lg text-gray-600 line-through">
                        {formatCurrency(strikePrice, displayCurrency, locale)}
                      </span>
                    )}
                    {discountPercent > 0 && (
                      <span className="text-sm font-semibold text-white bg--commerce px-2 py-0.5 rounded">
                        -{discountPercent}%
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-lg text-gray-500">
                    {t("products.noVariants")}
                  </span>
                )}
              </div>

              <div className="mt-6 space-y-5 text-sm">
                <div className="grid w-full grid-cols-[88px_minmax(0,1fr)] items-start gap-3 text-left sm:grid-cols-[112px_minmax(0,1fr)] sm:gap-6">
                  <span className="text-gray-500">
                    {t("products.shipping")}
                  </span>
                  <span className="min-w-0 space-y-1.5">
                    <span className="flex items-center gap-2 text-gray-900">
                      <Truck size={18} className="text-emerald-600" />
                      <span className="font-medium">
                        {shippingLoading
                          ? locale === "vi"
                            ? t("productDetail.loadingDeliveryDate")
                            : "Loading GHN ETA..."
                          : (deliveryDateLabel ??
                            (!isAuthenticated
                              ? locale === "vi"
                                ? t("productDetail.loginForDelivery")
                                : "Sign in to view delivery date"
                              : !destAddress
                                ? t("productDetail.chooseDefaultAddress")
                                : locale === "vi"
                                  ? t("productDetail.noDeliveryDate")
                                  : "GHN ETA unavailable"))}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xs font-normal">
                      <Gift size={13} className="text-amber-600 shrink-0" />
                      <span>{t("productDetail.lateDeliveryVoucher")}</span>
                    </span>
                    {destAddress && (
                      <span className="block text-xs text-gray-500">
                        {t("productDetail.deliverTo")}:{" "}
                        {getLocalizedAddress(destAddress, locale)}
                      </span>
                    )}
                  </span>
                </div>

                <div className="grid grid-cols-[88px_minmax(0,1fr)] items-start gap-3 sm:grid-cols-[112px_minmax(0,1fr)] sm:gap-6">
                  <span className="text-gray-500">
                    {t("productDetail.buyerProtection")}
                  </span>
                  <div className="flex">
                    <div className="group/protection relative inline-flex items-center gap-1.5 text-gray-900 cursor-pointer hover:text-red-500 transition-colors">
                      <ShieldCheck
                        size={18}
                        className="text-red-500 shrink-0"
                      />
                      <span className="text-sm font-medium">
                        {t("productDetail.freeReturns15Days")}
                      </span>
                      <ChevronRight
                        size={16}
                        className="text-gray-400 group-hover/protection:translate-x-0.5 transition-transform"
                      />

                      <div className="absolute left-0 top-full mt-2 w-80 p-4 bg-white rounded-sm border border-gray-200 shadow-xl opacity-0 invisible group-hover/protection:opacity-100 group-hover/protection:visible transition-all duration-200 z-30 pointer-events-none group-hover/protection:pointer-events-auto before:absolute before:-top-2 before:left-0 before:right-0 before:h-2 before:content-['']">
                      <h4 className="font-semibold text-gray-900 text-sm mb-2.5">
                        {t("productDetail.buyerProtectionTitle")}
                      </h4>
                      <div className="border-t border-gray-100 pt-3 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                          <Package size={16} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-xs">
                            {t("productDetail.freeReturns15Days")}
                          </p>
                          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                            {t("productDetail.freeReturnsDescription")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

              {attributeKeys.length > 0 && (
                <div className="mt-8 space-y-4">
                  {attributeKeys.map((key) => (
                    <div
                      key={key}
                      className="grid grid-cols-[88px_minmax(0,1fr)] items-start gap-3 sm:grid-cols-[112px_minmax(0,1fr)] sm:gap-6"
                    >
                      <h3 className="pt-2.5 text-sm font-normal text-gray-500">
                        {formatVariantKey(key, locale)}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {(attributeOptions[key] ?? []).map((value) => {
                          const selected = selectedAttributes[key] === value;
                          const available = isOptionAvailable(key, value);
                          return (
                            <button
                              key={value}
                              type="button"
                              disabled={!available}
                              onClick={() => selectAttribute(key, value)}
                              className={`relative min-h-9 min-w-16 overflow-hidden rounded-xs px-3 py-1 border text-sm font-medium transition-colors ${
                                selected
                                  ? "border-blue-600 bg-white text-blue-700 shadow-[inset_0_0_0_1px_var(--color-primary)]"
                                  : available
                                    ? "border-gray-300 bg-white text-gray-700 hover:border-blue-500 hover:text-blue-700"
                                    : "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-300 line-through"
                              }`}
                            >
                              {formatVariantValue(value)}
                              {selected && (
                                <>
                                  <span className="absolute bottom-0 right-0 h-4 w-4 bg-blue-600 [clip-path:polygon(100%_0,100%_100%,0_100%)]" />
                                  <Check
                                    size={9}
                                    strokeWidth={3}
                                    className="absolute bottom-0 right-0 text-white"
                                  />
                                </>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-8 grid grid-cols-[88px_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[112px_minmax(0,1fr)] sm:gap-6">
                <h3 className="text-sm font-normal text-gray-500">
                  {t("common.quantity")}
                </h3>
                <div className="flex items-center gap-4 flex-wrap">
                  {(() => {
                    const canDecrease =
                      Boolean(currentVariant) &&
                      (stock === null || stock > 0) &&
                      quantity > 1;
                    const canIncrease =
                      Boolean(currentVariant) &&
                      (stock === null || (stock > 0 && quantity < stock));

                    return (
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          disabled={!canDecrease}
                          aria-label="Decrease quantity"
                          className={`w-9 h-9 rounded-xs flex items-center justify-center transition-all duration-150 ${
                            canDecrease
                              ? "bg-blue-600 text-white shadow-xs hover:bg-blue-700 active:scale-95 cursor-pointer"
                              : "bg-white border border-gray-400 text-gray-400 cursor-not-allowed"
                          }`}
                        >
                          <Minus size={14} className="stroke-[2.5]" />
                        </button>
                        <span className="w-10 text-center font-semibold text-gray-900 select-none tabular-nums text-base">
                          {stock !== null && stock <= 0 ? 0 : quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQuantity(quantity + 1)}
                          disabled={!canIncrease}
                          aria-label="Increase quantity"
                          className={`w-9 h-9 rounded-xs flex items-center justify-center transition-all duration-150 ${
                            canIncrease
                              ? "bg-blue-600 text-white shadow-xs hover:bg-blue-700 active:scale-95 cursor-pointer"
                              : "bg-white border border-gray-400 text-gray-400 cursor-not-allowed"
                          }`}
                        >
                          <Plus size={14} className="stroke-[2.5]" />
                        </button>
                      </div>
                    );
                  })()}
                  {stock !== null && (
                    <span className="text-sm text-gray-500 font-medium">
                      {stock > 0
                        ? locale === "vi"
                          ? t("productDetail.stockAvailable", { count: stock })
                          : `${stock} pieces available`
                        : locale === "vi"
                          ? t("productDetail.outOfStock")
                          : "Out of stock"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8 flex gap-3 lg:translate-y-1">
              <Button
                size="lg"
                className="flex-1 rounded-sm bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold shadow-md shadow-orange-500/25 hover:shadow-lg hover:shadow-orange-500/35 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all border-0"
                onClick={handleAddToCart}
                loading={adding}
                disabled={!currentVariant || (stock !== null && stock <= 0)}
              >
                <ShoppingCart
                  size={19}
                  className="mr-2 text-white stroke-[2.2]"
                />
                {stock !== null && stock <= 0
                  ? t("productDetail.outOfStock")
                  : t("products.addToCart")}
              </Button>
              <Button
                size="lg"
                className="flex-1 rounded-sm bg-gradient-to-r from-red-500 via-rose-500 to-orange-500 hover:from-red-600 hover:via-rose-600 hover:to-orange-600 text-white font-bold shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all border-0"
                onClick={handleBuyNow}
                disabled={
                  !currentVariant || adding || (stock !== null && stock <= 0)
                }
              >
                <Zap size={18} className="mr-2 text-white fill-white" />
                {stock !== null && stock <= 0
                  ? t("productDetail.outOfStock")
                  : t("products.buyNow")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
