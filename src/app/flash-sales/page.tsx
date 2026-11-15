"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Zap } from "lucide-react";
import { EmptyState, Pagination } from "@/shared/ui";
import { productService, promotionService } from "@/lib/services";
import { useTranslation } from "@/hooks";
import ProductCard from "@/components/product/ProductCard";

function CountdownBox({ value }: { value: string | number }) {
  return (
    <span className="rounded-lg bg-purple-950/80 border border-yellow-300/70 px-2.5 py-1 min-w-[2.5rem] text-center font-mono font-extrabold text-white shadow-sm">
      {value}
    </span>
  );
}

function CampaignCountdown({ endAt }: { endAt: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remainingMs = Math.max(0, new Date(endAt).getTime() - now);
  const totalSeconds = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => value.toString().padStart(2, "0");

  return (
    <div className="flex items-center gap-1.5 text-sm">
      {days > 0 && (
        <>
          <CountdownBox value={`${days}d`} />
          <span className="text-white/50 font-bold">:</span>
        </>
      )}
      <CountdownBox value={pad(hours)} />
      <span className="text-white/50 font-bold">:</span>
      <CountdownBox value={pad(minutes)} />
      <span className="text-white/50 font-bold">:</span>
      <CountdownBox value={pad(seconds)} />
    </div>
  );
}

export default function FlashSalesPage() {
  const { t } = useTranslation();
  const pageSize = 48;
  const [page, setPage] = useState(0);

  const { data: sales, isLoading } = useQuery({
    queryKey: ["active-flash-sales", 20, page, pageSize],
    queryFn: () => promotionService.getActiveFlashSales(20, page, pageSize),
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
      {
        productId: string;
        name: string;
        slug?: string | null;
        image?: string;
        variantPrice?: number;
        currency?: string;
        rating?: number;
        reviewCount?: number;
      }
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
          rating: product.rating,
          reviewCount: product.reviewCount,
        });
      }
    }
    return map;
  }, [products]);

  const maxTotalItems = Math.max(
    0,
    ...(sales ?? []).map((sale) => sale.totalItems),
  );
  const totalPages = Math.max(1, Math.ceil(maxTotalItems / pageSize));

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
          <>
            <div className="space-y-8">
              {sales.map((sale) => {
              const items = sale.items.map((item) => {
                const info = productBySku.get(item.skuId);
                const original = info?.variantPrice ?? item.salePrice;
                const percent =
                  original > item.salePrice
                    ? Math.round((1 - item.salePrice / original) * 100)
                    : 0;
                return { item, info, percent };
              });
              const maxDiscount =
                items.length > 0
                  ? Math.max(...items.map(({ percent }) => percent))
                  : 0;

              return (
                <section
                  key={sale.campaignId}
                  className="space-y-4"
                >
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-900 via-indigo-950 to-purple-950 px-5 py-5 sm:px-7 text-white">
                    <div className="absolute -top-24 -left-20 h-72 w-72 rounded-full bg-purple-600/30 blur-3xl pointer-events-none" />
                    <div className="absolute top-1/2 -right-20 h-72 w-72 rounded-full bg-fuchsia-600/25 blur-3xl pointer-events-none" />
                    <div
                      className="absolute inset-0 opacity-[0.12] pointer-events-none"
                      style={{
                        backgroundImage:
                          "radial-gradient(circle at 1px 1px, #c084fc 1px, transparent 0)",
                        backgroundSize: "28px 28px",
                      }}
                    />

                    <div className="relative z-10">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="relative overflow-hidden inline-flex items-center gap-1.5 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider shadow-lg shadow-purple-600/30 border border-purple-400/30">
                            <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none animate-electric-glimmer" />
                            <Zap
                              size={14}
                              className="fill-purple-100 text-purple-50 drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]"
                            />
                            {t("home.flashSale")}
                          </span>
                          {maxDiscount > 0 && (
                            <span className="rounded-full border border-yellow-300/40 bg-white/10 px-2.5 py-1 text-xs font-bold text-yellow-300">
                              -{maxDiscount}%
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2.5 text-xs">
                          <span className="font-semibold text-purple-200 whitespace-nowrap">
                            {t("flashSales.endsIn")}
                          </span>
                          <CampaignCountdown endAt={sale.endDate} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {items.map(({ item, info }) => (
                      <ProductCard
                        key={item.registrationId}
                        id={item.productId}
                        slug={info?.slug}
                        name={info?.name ?? item.skuId}
                        price={info?.variantPrice ?? item.salePrice}
                        image={info?.image ?? "/images/logo.png"}
                        rating={info?.rating}
                        reviewCount={info?.reviewCount}
                        sold={item.soldCount}
                        currency={info?.currency ?? item.currency}
                        flashSale={{
                          campaignId: sale.campaignId,
                          endAt: sale.endDate,
                          salePrice: item.salePrice,
                          currency: item.currency,
                          saleStock: item.saleStock,
                          soldCount: item.soldCount,
                          skuOffers: [
                            {
                              skuId: item.skuId,
                              salePrice: item.salePrice,
                              currency: item.currency,
                              saleStock: item.saleStock,
                              soldCount: item.soldCount,
                            },
                          ],
                        }}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
            </div>
            <Pagination
              currentPage={page + 1}
              totalPages={totalPages}
              onPageChange={(next) => setPage(next - 1)}
            />
          </>
        )}
      </div>
    </div>
  );
}
