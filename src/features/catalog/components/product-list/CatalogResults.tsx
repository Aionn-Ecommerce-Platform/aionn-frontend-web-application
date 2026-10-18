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
            ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
            : "space-y-4"
        }
      >
        {Array.from({ length: 9 }, (_, index) => (
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
            ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
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
                name={product.name}
                price={basePrice}
                originalPrice={originalPrice}
                image={image}
                merchant={product.merchantId}
                rating={product.rating ?? 4.8}
                reviewCount={product.reviewCount ?? 15}
                sold={product.soldCount}
                flashSale={product.flashSale}
                isBestSeller={product.isBestSeller}
                provinceName={province}
                currency={lowestVariant?.currency ?? "VND"}
              />
            );

          const displayPrice = product.flashSale?.salePrice ?? basePrice;
          const strikePrice = product.flashSale
            ? basePrice
            : originalPrice && originalPrice > basePrice
              ? originalPrice
              : undefined;
          const discount =
            strikePrice && strikePrice > displayPrice
              ? Math.round((1 - displayPrice / strikePrice) * 100)
              : 0;

          return (
            <Link
              key={product.productId}
              href={`/products/${product.productId}`}
              className="group bg-white rounded-2xl border border-gray-200/90 overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:border-gray-950 transition-all flex"
            >
              <div className="w-44 h-44 relative bg-gray-50/60 shrink-0 p-3">
                <Image
                  src={image}
                  alt={product.name}
                  fill
                  className="object-contain p-2"
                />
                {product.flashSale && (
                  <span className="absolute top-2 left-2 bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                    <Zap size={10} className="fill-white" /> FLASH SALE
                  </span>
                )}
                {product.isBestSeller && !product.flashSale && (
                  <span className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                    BÁN CHẠY
                  </span>
                )}
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 line-clamp-2 group-hover:text-brand transition-colors">
                    {product.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex text-amber-400">
                      {Array.from({ length: 5 }, (_, index) => (
                        <Star
                          key={index}
                          size={13}
                          className={
                            index < (product.rating ?? 5)
                              ? "fill-amber-400"
                              : "text-gray-200"
                          }
                        />
                      ))}
                    </div>
                    {product.reviewCount !== undefined && product.reviewCount > 0 && (
                      <span className="text-xs text-gray-400">
                        ({product.reviewCount})
                      </span>
                    )}
                    {product.soldCount !== undefined && product.soldCount > 0 && (
                      <span className="text-xs text-gray-400">
                        · Đã bán {product.soldCount}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex items-end justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold text-gray-950">
                      {displayPrice
                        ? formatCurrency(displayPrice, lowestVariant?.currency ?? "VND", locale)
                        : t("products.contact")}
                    </span>
                    {strikePrice && (
                      <span className="text-xs text-gray-400 line-through">
                        {formatCurrency(strikePrice, lowestVariant?.currency ?? "VND", locale)}
                      </span>
                    )}
                    {discount > 0 && (
                      <span className="text-xs font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md">
                        -{discount}%
                      </span>
                    )}
                  </div>
                  {province && (
                    <span className="text-xs text-gray-500 font-medium">{province}</span>
                  )}
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
