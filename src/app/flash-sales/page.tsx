"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Flame, Loader2, Zap } from "lucide-react";
import { EmptyState } from "@/shared/ui";
import { productService, promotionService } from "@/lib/services";
import { formatCurrency, formatDateTime } from "@/shared/lib/utils";
import { productPath } from "@/shared/lib/product-url";
import { useTranslation } from "@/hooks";

export default function FlashSalesPage() {
  const { t, locale } = useTranslation();

  const { data: sales, isLoading } = useQuery({
    queryKey: ["active-flash-sales", 20],
    queryFn: () => promotionService.getActiveFlashSales(20),
  });

  const skuIds = useMemo(
    () => Array.from(new Set((sales ?? []).flatMap((s) => s.items.map((i) => i.skuId)))),
    [sales],
  );

  const { data: products } = useQuery({
    queryKey: ["flash-sale-products", skuIds.join(",")],
    queryFn: () => productService.resolveBySkuIds(skuIds),
    enabled: skuIds.length > 0,
  });

  const productBySku = useMemo(() => {
    const map = new Map<
      string,
      { productId: string; name: string; slug?: string | null; image?: string; variantPrice?: number; currency?: string }
    >();
    for (const product of products ?? []) {
      for (const variant of product.variants ?? []) {
        map.set(variant.skuId, {
          productId: product.productId,
          name: product.name,
          slug: product.slug,
          image: product.imageList?.[0],
          variantPrice: variant.price,
          currency: variant.currency,
        });
      }
    }
    return map;
  }, [products]);

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight flex items-center gap-2">
            <Flame className="text-rose-500" size={26} />
            {t("flashSales.title")}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{t("flashSales.subtitle")}</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-brand" size={28} />
          </div>
        ) : !sales?.length ? (
          <EmptyState
            icon={Zap}
            title={t("flashSales.empty")}
            description={t("flashSales.emptyDescription")}
          />
        ) : (
          <div className="space-y-8">
            {sales.map((sale) => (
              <section
                key={sale.campaignId}
                className="rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50 to-white p-5 sm:p-6 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <h2 className="text-lg font-extrabold text-gray-950 flex items-center gap-2">
                    <Zap size={18} className="fill-rose-500 text-rose-500" />
                    {sale.name}
                  </h2>
                  <p className="text-xs font-semibold text-rose-600">
                    {t("flashSales.endsAt", {
                      date: formatDateTime(sale.endDate, locale),
                    })}
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {sale.items.map((item) => {
                    const info = productBySku.get(item.skuId);
                    const original = info?.variantPrice;
                    const percent =
                      original && original > item.salePrice
                        ? Math.round((1 - item.salePrice / original) * 100)
                        : 0;
                    return (
                      <Link
                        key={item.registrationId}
                        href={productPath({ productId: item.productId, slug: info?.slug })}
                        className="group rounded-xl border border-gray-200 bg-white overflow-hidden hover:shadow-md transition-shadow"
                      >
                        <div className="relative aspect-square bg-gray-50">
                          {info?.image ? (
                            <Image
                              src={info.image}
                              alt={info.name ?? item.skuId}
                              fill
                              sizes="200px"
                              className="object-cover group-hover:scale-[1.02] transition-transform"
                              unoptimized
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-gray-300">
                              <Zap size={28} />
                            </div>
                          )}
                          {percent > 0 && (
                            <span className="absolute top-2 left-2 rounded-full bg-rose-600 px-2 py-0.5 text-[11px] font-black text-white">
                              -{percent}%
                            </span>
                          )}
                        </div>
                        <div className="p-3">
                          <p className="text-sm font-semibold text-gray-900 line-clamp-2 min-h-10">
                            {info?.name ?? item.skuId}
                          </p>
                          <div className="mt-1.5 flex items-baseline gap-1.5">
                            <span className="text-sm font-extrabold text-rose-600">
                              {formatCurrency(
                                item.salePrice,
                                item.currency,
                                locale,
                              )}
                            </span>
                            {original && original > item.salePrice && (
                              <span className="text-xs text-gray-400 line-through">
                                {formatCurrency(
                                  original,
                                  info?.currency ?? item.currency,
                                  locale,
                                )}
                              </span>
                            )}
                          </div>
                          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                            <div
                              className="h-full rounded-full bg-rose-500"
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.round(
                                    (item.soldCount /
                                      Math.max(1, item.saleStock)) *
                                      100,
                                  ),
                                )}%`,
                              }}
                            />
                          </div>
                          <p className="mt-1 text-[11px] text-gray-500">
                            {t("flashSales.soldOf", {
                              sold: item.soldCount,
                              total: item.saleStock,
                            })}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
