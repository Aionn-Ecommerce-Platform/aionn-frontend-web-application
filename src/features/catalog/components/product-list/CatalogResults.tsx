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
          const basePrice = product.variants.length
            ? Math.min(...product.variants.map((variant) => variant.price))
            : 0;
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
                image={image}
                merchant={product.merchantId}
                rating={product.rating}
                reviewCount={product.reviewCount}
                sold={product.soldCount}
                flashSale={product.flashSale}
                provinceName={province}
              />
            );
          const displayPrice = product.flashSale?.salePrice ?? basePrice;
          return (
            <Link
              key={product.productId}
              href={`/products/${product.productId}`}
              className="group bg-white rounded-xl border border-gray-400 overflow-hidden hover:border-yellow-400 flex"
            >
              <div className="w-40 h-40 relative bg-gray-50 shrink-0">
                <Image
                  src={image}
                  alt={product.name}
                  fill
                  className="object-contain p-4"
                />
                {product.flashSale && (
                  <span className="absolute top-2 left-2 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded">
                    <Zap size={8} className="inline" /> FLASH SALE
                  </span>
                )}
              </div>
              <div className="p-4 flex-1">
                <h3 className="text-sm font-semibold line-clamp-2">
                  {product.name}
                </h3>
                <div className="flex text-amber-400 mt-2">
                  {Array.from({ length: 5 }, (_, index) => (
                    <Star
                      key={index}
                      size={12}
                      className={
                        index < (product.rating ?? 5)
                          ? "fill-amber-400"
                          : "text-gray-200"
                      }
                    />
                  ))}
                </div>
                <div className="mt-6 flex justify-between">
                  <span className="text-lg font-bold text--commerce">
                    {displayPrice
                      ? formatCurrency(displayPrice, "VND", locale)
                      : t("products.contact")}
                  </span>
                  {province && (
                    <span className="text-xs text-gray-500">{province}</span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      {props.pages > 1 && (
        <div className="mt-12 flex justify-center gap-2">
          <button
            disabled={!props.page}
            onClick={() => props.onPage(props.page - 1)}
          >
            <ChevronLeft />
          </button>
          {getPaginationRange(props.page, props.pages).map((item, index) =>
            item === "..." ? (
              <span key={index}>…</span>
            ) : (
              <button
                key={item}
                onClick={() => props.onPage(Number(item) - 1)}
                className={
                  Number(item) - 1 === props.page
                    ? "w-9 h-9 rounded-full bg-blue-600 text-white"
                    : "w-9 h-9 rounded-full border"
                }
              >
                {item}
              </button>
            ),
          )}
          <button
            disabled={props.page + 1 >= props.pages}
            onClick={() => props.onPage(props.page + 1)}
          >
            <ChevronRight />
          </button>
        </div>
      )}
    </>
  );
}
