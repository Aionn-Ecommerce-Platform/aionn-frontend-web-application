"use client";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  PackageSearch,
  Star,
  Zap,
} from "lucide-react";
import ProductCard from "@/components/product/ProductCard";
import { Button, EmptyState, ProductCardSkeleton } from "@/shared/ui";
import { useTranslation } from "@/hooks";
import { cleanProvinceName } from "@/shared/lib/address-utils";
import { getPaginationRange } from "@/shared/lib/pagination";
import { formatCurrency } from "@/shared/lib/utils";
import type { Product } from "@/types";

interface Props {
  products: Product[];
  loading: boolean;
  failed: boolean;
  filtered: boolean;
  mode: "grid" | "list";
  provinces: Map<string, string>;
  page: number;
  pages: number;
  onPage: (page: number) => void;
  onClear: () => void;
}
export default function CatalogResults(props: Props) {
  const { t, locale } = useTranslation();
  if (props.loading)
    return (
      <div
        className={
          props.mode === "grid"
            ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
            : "space-y-4"
        }
      >
        {Array.from({ length: 8 }, (_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </div>
    );
  if (props.failed)
    return (
      <EmptyState
        icon={PackageSearch}
        title={t("products.failedToLoad")}
        description={t("products.failedToLoadDesc")}
      />
    );
  if (!props.products.length)
    return (
      <EmptyState
        icon={PackageSearch}
        title={t("products.noProducts")}
        description={t(
          props.filtered
            ? "products.noProductsDesc"
            : "products.noProductsDefault",
        )}
        action={
          props.filtered && (
            <Button variant="outline" onClick={props.onClear}>
              {t("products.clearAll")}
            </Button>
          )
        }
      />
    );
  return (
    <>
      <div
        className={
          props.mode === "grid"
            ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
            : "space-y-4"
        }
      >
        {props.products.map((product) => {
          let lowestVariant: (typeof product.variants)[number] | undefined;
          for (const v of product.variants ?? []) {
            if (!lowestVariant || v.price < lowestVariant.price) {
              lowestVariant = v;
            }
          }
          const basePrice = lowestVariant?.price ?? (product.variants.length
            ? Math.min(...product.variants.map((variant) => variant.price))
            : 0);
          const originalPrice = lowestVariant?.originalPrice;
          const image = product.imageList[0] ?? "/images/logo.png";
          const province = product.provinceCode
            ? props.provinces.get(product.provinceCode)
            : product.provinceName
              ? cleanProvinceName(product.provinceName)
              : undefined;

          if (props.mode === "grid")
            return (
              <ProductCard
                key={product.productId}
                id={product.productId}
                slug={product.slug}
                name={product.name}
                price={basePrice}
                originalPrice={originalPrice}
                image={image}
                rating={product.rating}
                reviewCount={product.reviewCount}
                sold={product.soldCount}
                flashSale={product.flashSale}
                isBestSeller={product.isBestSeller}
                provinceName={province}
                currency={lowestVariant?.currency ?? "VND"}
              />
            );

          const displayPrice = product.flashSale?.salePrice ?? basePrice;
          let strikePrice: number | undefined;
          if (product.flashSale) {
            strikePrice = basePrice;
          } else if (originalPrice && originalPrice > basePrice) {
            strikePrice = originalPrice;
          }
          const discount =
            strikePrice && strikePrice > displayPrice
              ? Math.round((1 - displayPrice / strikePrice) * 100)
              : 0;
          const isSale =
            !product.flashSale && originalPrice && originalPrice > basePrice;
          const cardCurrency = lowestVariant?.currency ?? "VND";

          return (
            <Link
              key={product.productId}
              href={`/products/${product.productId}`}
              className={`group relative flex rounded-2xl overflow-hidden transition-all duration-300 ${
                product.flashSale
                  ? "bg-white border-2 border-purple-400 shadow-md shadow-purple-500/10 hover:border-purple-600 hover:shadow-xl hover:shadow-purple-500/20"
                  : "bg-white border border-gray-300 shadow-xs hover:border-gray-950 hover:shadow-xl hover:shadow-black/5"
              }`}
            >
              {/* Image - same cover treatment + badges as the grid card */}
              <div className="w-40 h-40 sm:w-44 sm:h-44 relative bg-gradient-to-b from-gray-50/80 to-gray-100/40 overflow-hidden shrink-0">
                <Image
                  src={image}
                  alt={product.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                />
                <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between pointer-events-none z-10">
                  <div>
                    {product.flashSale ? (
                      <span className="inline-flex items-center gap-1 bg-gradient-to-r from-purple-700 via-fuchsia-600 to-indigo-700 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-md">
                        <Zap size={10} className="fill-purple-200 text-purple-100" />
                        FLASH SALE
                      </span>
                    ) : isSale ? (
                      <span className="inline-flex items-center gap-1 bg-gradient-to-r from-red-500 to-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md">
                        <Zap size={10} className="fill-red-200 text-red-100" />
                        SALE
                      </span>
                    ) : product.isBestSeller ? (
                      <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md">
                        {t("products.bestSeller")}
                      </span>
                    ) : null}
                  </div>
                  {discount > 0 && (
                    <span
                      className={`font-extrabold text-[10px] px-2 py-0.5 rounded-full shadow-md ml-auto ${
                        product.flashSale
                          ? "bg-gradient-to-r from-purple-700 to-indigo-600 text-white"
                          : "bg-red-500 text-white"
                      }`}
                    >
                      -{discount}%
                    </span>
                  )}
                </div>
              </div>

              {/* Details - same content hierarchy as the grid card */}
              <div className="p-4 flex-1 flex flex-col justify-between min-w-0">
                <div>
                  <h3
                    className={`text-[14px] font-semibold line-clamp-2 leading-snug transition-colors ${
                      product.flashSale
                        ? "text-gray-900 group-hover:text-purple-700"
                        : "text-gray-800 group-hover:text-black"
                    }`}
                  >
                    {product.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex text-amber-400">
                      {Array.from({ length: 5 }, (_, index) => (
                        <Star
                          key={index}
                          size={12}
                          className={
                            index < (product.rating ?? 5)
                              ? "fill-amber-400 text-amber-400"
                              : "text-gray-200 fill-gray-200"
                          }
                        />
                      ))}
                    </div>
                    {product.reviewCount !== undefined && product.reviewCount > 0 && (
                      <span className="text-[11px] text-gray-400">
                        ({product.reviewCount})
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-2.5 flex items-end justify-between border-t border-gray-200/80">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span
                      className={`text-[18px] font-extrabold tracking-tight ${
                        product.flashSale
                          ? "bg-gradient-to-r from-purple-700 via-fuchsia-600 to-indigo-700 bg-clip-text text-transparent"
                          : discount > 0
                            ? "text-red-600"
                            : "text-gray-900"
                      }`}
                    >
                      {displayPrice
                        ? formatCurrency(displayPrice, cardCurrency, locale)
                        : t("products.contact")}
                    </span>
                    {strikePrice && strikePrice > displayPrice && (
                      <span className="text-[12px] font-normal text-gray-400 line-through leading-none">
                        {formatCurrency(strikePrice, cardCurrency, locale)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 text-[11px] text-gray-400">
                    {province && (
                      <span className="text-gray-400 text-[10px] font-medium whitespace-nowrap truncate max-w-[70px]">
                        {province}
                      </span>
                    )}
                    {product.soldCount !== undefined && product.soldCount > 0 && (
                      <span className="whitespace-nowrap">
                        {t("home.soldCount").replace(
                          "{count}",
                          product.soldCount >= 1000 ? "1k+" : String(product.soldCount),
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      {props.pages > 1 && (
        <div className="mt-12 flex justify-center items-center gap-2">
          <button
            disabled={!props.page}
            onClick={() => {
              props.onPage(props.page - 1);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            aria-label="Previous page"
            className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-gray-900 bg-white text-gray-900 transition-colors hover:bg-gray-100 disabled:opacity-30 disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-white cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} />
          </button>
          {getPaginationRange(props.page, props.pages).map((item, index) =>
            item === "..." ? (
              <span
                key={`ellipsis-${index}`}
                className="flex h-9 min-w-6 items-center justify-center text-gray-500 font-bold"
              >
                …
              </span>
            ) : (
              <button
                key={`page-${item}-${index}`}
                onClick={() => {
                  props.onPage(Number(item) - 1);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={
                  Number(item) - 1 === props.page
                    ? "h-9 min-w-9 px-2 text-xs font-bold rounded-full bg-gray-950 text-white border-2 border-gray-950 shadow-xs cursor-pointer"
                    : "h-9 min-w-9 px-2 text-xs font-bold rounded-full border-2 border-gray-900 bg-white text-gray-800 transition-colors hover:bg-gray-100 cursor-pointer"
                }
              >
                {item}
              </button>
            ),
          )}
          <button
            disabled={props.page + 1 >= props.pages}
            onClick={() => {
              props.onPage(props.page + 1);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            aria-label="Next page"
            className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-gray-900 bg-white text-gray-900 transition-colors hover:bg-gray-100 disabled:opacity-30 disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-white cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </>
  );
}
