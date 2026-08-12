"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Zap } from "lucide-react";
import { useTranslation } from "@/hooks";
import { promotionService, productService } from "@/lib/services";
import { qk } from "@/lib/query-keys";
import ProductCard from "@/components/product/ProductCard";
import type { Product } from "@/types";

function lowestPrice(p: Product): number | null {
  if (!p.variants || p.variants.length === 0) return null;
  return Math.min(...p.variants.map((v) => v.price));
}

function CountdownBox({ value }: { value: string | number }) {
  return (
    <span className="bg-red-600 text-white rounded-md px-2.5 py-1 min-w-[2.5rem] text-center shadow-sm">
      {value}
    </span>
  );
}

function CountdownSeparator() {
  return <span className="text-red-600 px-0.5">:</span>;
}

function Countdown({ remainingMs }: { remainingMs: number }) {
  const { days, hours, minutes, seconds } = getCountdownParts(remainingMs);
  return (
    <>
      {days > 0 && (
        <>
          <CountdownBox value={`${days}d`} />
          <CountdownSeparator />
        </>
      )}
      <CountdownBox value={hours} />
      <CountdownSeparator />
      <CountdownBox value={minutes} />
      <CountdownSeparator />
      <CountdownBox value={seconds} />
    </>
  );
}

function getCountdownParts(ms: number): {
  days: number;
  hours: string;
  minutes: string;
  seconds: string;
} {
  if (ms <= 0) {
    return { days: 0, hours: "00", minutes: "00", seconds: "00" };
  }
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return {
    days,
    hours: pad(hours),
    minutes: pad(minutes),
    seconds: pad(seconds),
  };
}

export default function FlashSaleSection() {
  const { t } = useTranslation();
  const { data: activeSales, isLoading: loading } = useQuery({
    queryKey: qk.activeFlashSales(1),
    queryFn: () => promotionService.getActiveFlashSales(1),
  });
  const campaign =
    activeSales && activeSales.length > 0 ? activeSales[0] : null;

  const productIds = useMemo(() => {
    if (!campaign) return [];
    return [...campaign.items]
      .sort((a, b) => (b.soldCount ?? 0) - (a.soldCount ?? 0))
      .slice(0, 6)
      .map((i) => i.productId);
  }, [campaign]);

  const { data: products = [] } = useQuery({
    queryKey: qk.productsByIds(productIds),
    queryFn: async () => {
      const results = await Promise.all(
        productIds.map((id) => productService.get(id).catch(() => null)),
      );
      return results.filter((p): p is Product => p !== null);
    },
    enabled: productIds.length > 0,
  });

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!campaign) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [campaign]);

  if (loading || !campaign || products.length === 0) {
    return null;
  }

  const remaining = new Date(campaign.endDate).getTime() - now;

  return (
    <section className="mt-16 py-10 bg-gradient-to-r from-red-100 via-orange-200 to-red-100 border-b border-red-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-orange-500 text-white px-4 py-2 rounded-full shadow-sm">
              <Zap size={20} className="fill-white" />
              <span className="font-bold text-lg uppercase tracking-wide">
                {t("home.flashSale")}
              </span>
            </div>
            <span className="hidden sm:inline text-base text-gray-700">
              {t("home.flashSaleEndsIn")}
            </span>
            <div className="flex items-center gap-1 font-mono font-bold text-lg">
              <Countdown remainingMs={remaining} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 lg:gap-4">
          {products.map((product) => {
            const item = campaign.items.find(
              (i) => i.productId === product.productId,
            );
            const regularPrice = lowestPrice(product) ?? 0;
            const image = product.imageList?.[0] ?? "/images/logo.png";
            const flashSale = item
              ? {
                  campaignId: campaign.campaignId,
                  endAt: campaign.endDate,
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
                }
              : null;
            return (
              <ProductCard
                key={product.productId}
                id={product.productId}
                name={product.name}
                price={regularPrice}
                image={image}
                merchant={product.merchantId}
                rating={product.rating}
                reviewCount={product.reviewCount}
                sold={product.soldCount}
                flashSale={flashSale}
              />
            );
          })}
        </div>
        <div className="mt-8 flex justify-center">
          <Link href={`/products?onSale=true`}>
            <button className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-red-500 to-orange-500 text-white font-semibold hover:from-red-600 hover:to-orange-600 shadow-lg shadow-red-500/30 transition-all">
              {t("home.viewAllFlashSale")}
              <ArrowRight size={18} />
            </button>
          </Link>
        </div>
      </div>
    </section>
  );
}
