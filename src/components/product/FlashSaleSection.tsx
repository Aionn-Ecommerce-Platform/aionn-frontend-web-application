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
    <span className="bg-white text-gray-950 font-extrabold rounded-lg px-2.5 py-1 min-w-[2.5rem] text-center shadow-md">
      {value}
    </span>
  );
}

function CountdownSeparator() {
  return <span className="text-white/80 px-0.5 font-bold">:</span>;
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
      .slice(0, 5)
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
    <section className="mt-6 py-12 bg-gradient-to-br from-purple-900 via-indigo-950 to-purple-950 border-y border-purple-800/40 relative overflow-hidden shadow-xl">
      {/* Ambient background glowing orbs */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-purple-600/30 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute top-1/2 -right-28 w-96 h-96 bg-fuchsia-600/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 left-1/3 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Cyber geometric micro dot texture */}
      <div
        className="absolute inset-0 opacity-[0.12] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, #c084fc 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="relative overflow-hidden flex items-center gap-2.5 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 text-white px-5 py-2.5 rounded-full shadow-lg shadow-purple-600/40 border border-purple-400/30 animate-lightning-pill select-none">
              {/* Electric light sweep shimmer */}
              <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none animate-electric-glimmer" />

              {/* Lightning Bolt with strike motion */}
              <Zap size={20} className="fill-purple-200 text-purple-100 animate-lightning drop-shadow-[0_0_8px_rgba(255,255,255,0.9)]" />

              <span className="font-extrabold text-lg uppercase tracking-wider drop-shadow-sm">
                {t("home.flashSale")}
              </span>

              {/* Secondary micro bolt on right */}
              <Zap size={14} className="fill-white text-purple-200 animate-lightning opacity-80" />
            </div>

            <span className="hidden sm:inline text-sm font-semibold text-purple-200/90">
              {t("home.flashSaleEndsIn")}
            </span>
            <div className="flex items-center gap-1.5 font-mono font-bold text-lg text-white">
              <Countdown remainingMs={remaining} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 lg:gap-4">
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
                rating={product.rating ?? 4.8}
                reviewCount={product.reviewCount ?? 18}
                sold={item?.soldCount ?? product.soldCount}
                flashSale={flashSale}
              />
            );
          })}
        </div>
        <div className="mt-8 flex justify-center">
          <Link href={`/products?onSale=true`}>
            <button className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white/10 hover:bg-white text-white hover:text-gray-950 font-semibold backdrop-blur-md border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer">
              {t("home.viewAllFlashSale")}
              <ArrowRight size={18} />
            </button>
          </Link>
        </div>
      </div>
    </section>
  );
}
