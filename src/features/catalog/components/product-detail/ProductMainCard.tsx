"use client";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
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

function FlashSaleCountdown({ endAt }: { endAt: string }) {
  const [remainingMs, setRemainingMs] = useState(() => {
    const target = new Date(endAt).getTime();
    return Math.max(0, target - Date.now());
  });

  useEffect(() => {
    const target = new Date(endAt).getTime();
    const update = () => {
      setRemainingMs(Math.max(0, target - Date.now()));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [endAt]);

  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");

  return (
    <div className="flex items-center gap-1 font-mono font-bold text-xs select-none">
      <span className="bg-white/20 backdrop-blur-xs px-1.5 py-0.5 rounded text-white min-w-[1.6rem] text-center">
        {hours}
      </span>
      <span>:</span>
      <span className="bg-white/20 backdrop-blur-xs px-1.5 py-0.5 rounded text-white min-w-[1.6rem] text-center">
        {minutes}
      </span>
      <span>:</span>
      <span className="bg-white/20 backdrop-blur-xs px-1.5 py-0.5 rounded text-white min-w-[1.6rem] text-center">
        {seconds}
      </span>
    </div>
  );
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
  const [isProtectionExpanded, setIsProtectionExpanded] = useState(false);
  const thumbnailContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!thumbnailContainerRef.current) return;
    const activeThumb = thumbnailContainerRef.current.children[
      selectedImage
    ] as HTMLElement | undefined;
    if (activeThumb) {
      activeThumb.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [selectedImage]);
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
    const keyIndex = attributeKeys.indexOf(key);
    if (keyIndex === -1) return;

    // 1. Toggle off if clicking the already selected value: unselect it and all child rows below
    if (selectedAttributes[key] === value) {
      const nextAttributes: Record<string, string> = {};
      for (let i = 0; i < keyIndex; i++) {
        const parentKey = attributeKeys[i];
        if (parentKey && selectedAttributes[parentKey]) {
          nextAttributes[parentKey] = selectedAttributes[parentKey];
        }
      }
      setSelectionState({
        productId: product.productId,
        values: nextAttributes,
      });
      setSelectedVariantIdx(null);
      setQuantity(1);
      return;
    }

    // 2. Strict top-down cascade: keep all parent selections above keyIndex
    const nextAttributes: Record<string, string> = {};
    for (let i = 0; i < keyIndex; i++) {
        const parentKey = attributeKeys[i];
        if (parentKey && selectedAttributes[parentKey]) {
          nextAttributes[parentKey] = selectedAttributes[parentKey];
        }
      }

    // 3. Set the current attribute choice
    nextAttributes[key] = value;

    // Any child rows below keyIndex (i > keyIndex) are reset so the user selects them next in order!

    setSelectionState({
      productId: product.productId,
      values: nextAttributes,
    });

    // 4. Variant is determined only when ALL attributes from top to bottom are chosen
    const allChosen = attributeKeys.every((k) => Boolean(nextAttributes[k]));
    if (allChosen) {
      const variantIdx = product.variants.findIndex((v) =>
        attributeKeys.every((k) => v.attributeValues[k] === nextAttributes[k]),
      );
      setSelectedVariantIdx(variantIdx >= 0 ? variantIdx : null);
    } else {
      setSelectedVariantIdx(null);
    }
    setQuantity(1);
  };

  const isOptionAvailable = (key: string, value: string) => {
    const keyIndex = attributeKeys.indexOf(key);
    if (keyIndex === -1) return false;

    // Row 0 (top tier): always available if the option exists in any variant
    if (keyIndex === 0) {
      return product.variants.some((v) => v.attributeValues[key] === value);
    }

    // Child rows (keyIndex > 0): user must select parent row first
    for (let i = 0; i < keyIndex; i++) {
      const parentKey = attributeKeys[i];
      if (!parentKey || !selectedAttributes[parentKey]) {
        return false;
      }
    }

    // Must be compatible with all parent choices above
    return product.variants.some((v) => {
      if (v.attributeValues[key] !== value) return false;
      for (let i = 0; i < keyIndex; i++) {
        const parentKey = attributeKeys[i];
        if (parentKey && v.attributeValues[parentKey] !== selectedAttributes[parentKey]) {
          return false;
        }
      }
      return true;
    });
  };

  return (
    <>
      {" "}
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="grid lg:grid-cols-2 gap-8 p-6 lg:p-8">
          <div>
            <div className="aspect-square relative bg-gray-50/70 rounded-2xl overflow-hidden mb-4 border border-gray-200 shadow-xs group">
              <Image
                src={images[selectedImage] ?? "/images/logo.png"}
                alt={product.name}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-contain p-8"
              />
            </div>
            {images.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={goToPreviousImage}
                  disabled={images.length <= 1}
                  className="h-9 w-9 inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-xs hover:bg-gray-950 hover:text-white hover:border-gray-950 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-gray-700 disabled:hover:border-gray-200 shrink-0 select-none"
                  aria-label="Previous thumbnail"
                >
                  <ChevronLeft size={18} />
                </button>
                <div
                  ref={thumbnailContainerRef}
                  className="flex min-w-0 flex-1 gap-2 overflow-x-auto scroll-smooth py-1"
                  style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                  {images.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedImage(i)}
                      className={`w-16 h-16 relative rounded-xl overflow-hidden border flex-shrink-0 transition-all bg-white ${
                        selectedImage === i
                          ? "border-gray-950 ring-2 ring-gray-950/20"
                          : "border-gray-200 hover:border-gray-400"
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
                <button
                  type="button"
                  onClick={goToNextImage}
                  disabled={images.length <= 1}
                  className="h-9 w-9 inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-xs hover:bg-gray-950 hover:text-white hover:border-gray-950 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-gray-700 disabled:hover:border-gray-200 shrink-0 select-none"
                  aria-label="Next thumbnail"
                >
                  <ChevronRight size={18} />
                </button>
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

              {/* Price / Flash Sale Section */}
              {product.flashSale ? (
                <div className="mt-5 rounded-2xl overflow-hidden border border-purple-500/30 bg-gradient-to-r from-purple-950 via-indigo-950 to-purple-900 text-white p-4 sm:p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3 flex-wrap pb-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <span className="relative overflow-hidden inline-flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-black px-2.5 py-1 rounded-full shadow-xs">
                        <Zap size={13} className="fill-purple-200 text-purple-100 animate-pulse" />
                        FLASH SALE
                      </span>
                      {discountPercent > 0 && (
                        <span className="text-xs font-bold text-yellow-300 bg-white/10 border border-yellow-300/30 px-2 py-0.5 rounded-full">
                          -{discountPercent}%
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-purple-200">
                      <span className="font-semibold text-white/90">KẾT THÚC TRONG</span>
                      <FlashSaleCountdown endAt={product.flashSale.endAt} />
                    </div>
                  </div>

                  <div className="pt-3 flex items-baseline gap-3 flex-wrap">
                    <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                      {priceLabel}
                    </span>
                    {strikePrice && strikePrice > displayPrice && (
                      <span className="text-base sm:text-lg text-white/50 line-through">
                        {formatCurrency(strikePrice, displayCurrency, locale)}
                      </span>
                    )}
                  </div>

                  {product.flashSale.saleStock > 0 && (
                    <div className="mt-3 flex items-center gap-3 max-w-xs">
                      <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-yellow-400 to-amber-300 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(100, Math.max(10, Math.round((product.flashSale.soldCount / product.flashSale.saleStock) * 100)))}`,
                          }}
                        />
                      </div>
                      <span className="text-[11px] text-white/80 font-medium whitespace-nowrap">
                        Đã bán {product.flashSale.soldCount}/{product.flashSale.saleStock} suất
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-5 py-3">
                  {product.variants.length > 0 ? (
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <span
                        className={`text-3xl sm:text-4xl font-bold tracking-tight leading-tight ${
                          discountPercent > 0
                            ? "text-red-600"
                            : "text-gray-950"
                        }`}
                      >
                        {priceLabel}
                      </span>
                      {strikePrice && strikePrice > displayPrice && (
                        <span className="text-base sm:text-lg text-gray-400 line-through">
                          {formatCurrency(strikePrice, displayCurrency, locale)}
                        </span>
                      )}
                      {discountPercent > 0 && (
                        <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200/80 px-2 py-0.5 rounded-full">
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
              )}

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
                    <span className="inline-flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg font-normal">
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
                    <div
                      className="group/protection relative inline-flex items-center"
                      onMouseEnter={() => setIsProtectionExpanded(true)}
                      onMouseLeave={() => setIsProtectionExpanded(false)}
                    >
                      <button
                        type="button"
                        id="buyer-protection-trigger"
                        aria-expanded={isProtectionExpanded}
                        aria-controls="buyer-protection-details"
                        onClick={() => setIsProtectionExpanded((prev) => !prev)}
                        onFocus={() => setIsProtectionExpanded(true)}
                        onBlur={(e) => {
                          if (
                            !e.currentTarget.parentElement?.contains(
                              e.relatedTarget as Node | null,
                            )
                          ) {
                            setIsProtectionExpanded(false);
                          }
                        }}
                        className="inline-flex items-center gap-1.5 text-gray-900 cursor-pointer hover:text-red-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-400 rounded-md transition-colors"
                      >
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
                      </button>

                      <div
                        id="buyer-protection-details"
                        role="region"
                        aria-labelledby="buyer-protection-trigger"
                        className={`absolute left-0 top-full mt-2 w-80 p-4 bg-white rounded-xl border border-gray-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.08)] transition-all duration-200 z-30 before:absolute before:-top-2 before:left-0 before:right-0 before:h-2 before:content-[''] ${
                          isProtectionExpanded
                            ? "opacity-100 visible pointer-events-auto"
                            : "opacity-0 invisible pointer-events-none"
                        }`}
                      >
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
                              className={`relative min-h-9 min-w-16 rounded-xl px-3.5 py-1.5 border text-sm transition-all select-none ${
                                selected
                                  ? "border-gray-950 bg-gray-950 text-white shadow-xs font-semibold cursor-pointer"
                                  : available
                                    ? "border-gray-200 bg-white text-gray-700 hover:border-gray-400 hover:text-gray-950 cursor-pointer"
                                    : "border-gray-200 bg-gray-50 text-gray-300 line-through cursor-not-allowed opacity-60"
                              }`}
                            >
                              <span className="inline-flex items-center justify-center gap-1.5">
                                <span>{formatVariantValue(value)}</span>
                                {selected && (
                                  <Check
                                    size={13}
                                    strokeWidth={3}
                                    className="text-white shrink-0 -mr-0.5"
                                  />
                                )}
                              </span>
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
                          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150 ${
                            canDecrease
                              ? "border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 hover:border-gray-300 active:scale-95 cursor-pointer shadow-2xs"
                              : "bg-gray-50 border border-gray-200 text-gray-300 cursor-not-allowed"
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
                          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150 ${
                            canIncrease
                              ? "border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 hover:border-gray-300 active:scale-95 cursor-pointer shadow-2xs"
                              : "bg-gray-50 border border-gray-200 text-gray-300 cursor-not-allowed"
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
              <button
                type="button"
                className="h-12 flex-1 rounded-xl border border-gray-950 bg-white text-gray-950 hover:bg-gray-950 hover:text-white font-bold transition-colors duration-200 shadow-xs cursor-pointer active:scale-[0.99] disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:hover:bg-gray-100 disabled:hover:text-gray-400 disabled:cursor-not-allowed flex items-center justify-center text-sm sm:text-base select-none"
                onClick={handleAddToCart}
                disabled={adding || (Boolean(currentVariant) && stock !== null && stock <= 0)}
              >
                {adding ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={18} className="animate-spin text-current" />
                    <span>{t("common.loading")}</span>
                  </span>
                ) : (
                  <>
                    <ShoppingCart
                      size={18}
                      className="mr-2 text-current stroke-[2.2] shrink-0"
                    />
                    <span>
                      {Boolean(currentVariant) && stock !== null && stock <= 0
                        ? t("productDetail.outOfStock")
                        : t("products.addToCart")}
                    </span>
                  </>
                )}
              </button>
              <button
                type="button"
                className="h-12 flex-1 rounded-xl border border-gray-950 bg-gray-950 text-white hover:bg-neutral-800 hover:border-neutral-800 font-bold transition-colors duration-200 shadow-xs hover:shadow-md cursor-pointer active:scale-[0.99] disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:hover:bg-gray-100 disabled:hover:text-gray-400 disabled:hover:border-gray-200 disabled:cursor-not-allowed flex items-center justify-center text-sm sm:text-base select-none"
                onClick={handleBuyNow}
                disabled={adding || (Boolean(currentVariant) && stock !== null && stock <= 0)}
              >
                <Zap size={17} className="mr-2 text-current fill-current shrink-0" />
                <span>
                  {Boolean(currentVariant) && stock !== null && stock <= 0
                    ? t("productDetail.outOfStock")
                    : t("products.buyNow")}
                </span>
              </button>            </div>
          </div>
        </div>
      </div>
    </>
  );
}
