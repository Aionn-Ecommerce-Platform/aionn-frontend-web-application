"use client";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Star,
  Truck,
} from "lucide-react";
import { Badge, Button } from "@/shared/ui";
import { getLocalizedAddress } from "@/shared/lib/address-utils";
import { formatCurrency } from "@/shared/lib/utils";
import type { Address, Product, ProductVariant } from "@/types";
import type { Locale } from "@/stores/locale.store";
import {
  formatVariantSummary,
  getVariantLabelFromAttributes,
} from "./product-detail-utils";

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
  selectedVariantIdx: number | null;
  setSelectedVariantIdx: (value: number) => void;
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
    shippingFee,
    selectedVariantIdx,
    setSelectedVariantIdx,
    stock,
    quantity,
    setQuantity,
    adding,
    handleAddToCart,
    handleBuyNow,
    t,
  } = props;
  return (
    <>
      {" "}
      <div className="bg-white rounded-2xl border border-gray-400 overflow-hidden">
        <div className="grid lg:grid-cols-2 gap-8 p-6 lg:p-8">
          <div>
            <div className="aspect-square relative bg-gray-50 rounded-xl overflow-hidden mb-4 border border-gray-200 group">
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
                    className="absolute left-3 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-400 bg-white/95 text-gray-700 shadow-sm hover:bg-blue-600 hover:text-white hover:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Previous product image"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={goToNextImage}
                    className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-400 bg-white/95 text-gray-700 shadow-sm hover:bg-blue-600 hover:text-white hover:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      className={`w-16 h-16 relative rounded-lg overflow-hidden border flex-shrink-0 transition-all bg-white ${
                        selectedImage === i
                          ? "border-blue-600 ring-2 ring-blue-100"
                          : "border-gray-300 hover:border-blue-400"
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

          <div className="lg:py-1">
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

            <div className="mt-5 bg-gray-50 px-6 py-5">
              {product.variants.length > 0 ? (
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-3xl sm:text-4xl font-normal leading-tight text--commerce">
                    {priceLabel}
                  </span>
                  {currentVariant &&
                    strikePrice &&
                    strikePrice > displayPrice && (
                      <span className="text-lg text-gray-400 line-through">
                        {formatCurrency(strikePrice, displayCurrency)}
                      </span>
                    )}
                  {currentVariant && discountPercent > 0 && (
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
                <span className="text-gray-500">{t("products.shipping")}</span>
                <span className="min-w-0 space-y-1.5">
                  <span className="flex items-center gap-2 text-gray-900">
                    <Truck size={18} className="text-emerald-600" />
                    <span className="font-medium">
                      {shippingLoading
                        ? locale === "vi"
                          ? t("productDetail.loadingDeliveryDate")
                          : "Loading GHN ETA..."
                        : (deliveryDateLabel ??
                          (isAuthenticated
                            ? locale === "vi"
                              ? t("productDetail.noDeliveryDate")
                              : "GHN ETA unavailable"
                            : locale === "vi"
                              ? t("productDetail.loginForDelivery")
                              : "Sign in to view delivery date"))}
                    </span>
                  </span>
                  <span className="block text-emerald-700">
                    {isAuthenticated && destAddress
                      ? shippingLoading
                        ? locale === "vi"
                          ? t("productDetail.calculatingShipping")
                          : "Calculating shipping fee..."
                        : shippingFee !== null
                          ? t("productDetail.shippingFee", {
                              amount: formatCurrency(
                                shippingFee,
                                "VND",
                                locale,
                              ),
                            })
                          : locale === "vi"
                            ? t("productDetail.noShippingFee")
                            : "GHN shipping fee unavailable"
                      : locale === "vi"
                        ? t("productDetail.loginForShipping")
                        : "Sign in and set a default address to view fee"}
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
                <div className="flex items-center gap-2 text-gray-900">
                  <ShieldCheck size={18} className="text--commerce" />
                  <span>
                    {locale === "vi"
                      ? t("productDetail.freeReturns15Days")
                      : "15-day free returns"}
                  </span>
                  <ChevronRight size={16} className="text-gray-400" />
                </div>
              </div>
            </div>

            {product.variants.length > 0 && (
              <div className="mt-8 grid grid-cols-[88px_minmax(0,1fr)] items-start gap-3 sm:grid-cols-[112px_minmax(0,1fr)] sm:gap-6">
                <h3 className="pt-3 text-sm font-normal text-gray-500">
                  {getVariantLabelFromAttributes(
                    currentVariant?.attributeValues,
                    locale,
                  )}
                </h3>
                <div className="flex gap-2 flex-wrap">
                  {product.variants.map((variant, i) => (
                    <button
                      key={variant.skuId}
                      onClick={() => setSelectedVariantIdx(i)}
                      className={`min-h-12 px-4 py-2 border text-sm font-medium transition-all ${
                        selectedVariantIdx === i
                          ? "border-blue-600 bg-white text-blue-700 shadow-[inset_0_0_0_1px_var(--color-primary)]"
                          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      {formatVariantSummary(variant.attributeValues) ||
                        variant.skuId}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8 grid grid-cols-[88px_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[112px_minmax(0,1fr)] sm:gap-6">
              <h3 className="text-sm font-normal text-gray-500">
                {t("common.quantity")}
              </h3>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={!currentVariant || (stock !== null && stock <= 0)}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-12 text-center font-medium">
                    {stock !== null && stock <= 0 ? 0 : quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    disabled={
                      !currentVariant ||
                      (stock !== null && (quantity >= stock || stock <= 0))
                    }
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Plus size={14} />
                  </button>
                </div>
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

            <div className="mt-8 flex gap-3">
              <Button
                size="lg"
                className="flex-1 border-gray-400"
                onClick={handleAddToCart}
                loading={adding}
                disabled={!currentVariant || (stock !== null && stock <= 0)}
              >
                <ShoppingCart size={18} className="mr-2" />
                {stock !== null && stock <= 0
                  ? t("productDetail.outOfStock")
                  : t("products.addToCart")}
              </Button>
              <Button
                size="lg"
                variant="secondary"
                className="flex-1 border border-gray-400 bg-gray-50 hover:bg-gray-100 text-gray-800"
                onClick={handleBuyNow}
                disabled={
                  !currentVariant || adding || (stock !== null && stock <= 0)
                }
              >
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
