"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Zap } from "lucide-react";
import { EmptyState } from "@/shared/ui";
import { productService, promotionService } from "@/lib/services";
import { useTranslation, useMerchantProvinceMap } from "@/hooks";
import ProductCard from "@/components/product/ProductCard";
import type { ActiveFlashSale } from "@/types";

const SLOT_TIME_FORMAT = new Intl.DateTimeFormat("vi-VN", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Ho_Chi_Minh",
});

function slotRange(slot: ActiveFlashSale): string {
  return `${SLOT_TIME_FORMAT.format(new Date(slot.startDate))} - ${SLOT_TIME_FORMAT.format(new Date(slot.endDate))}`;
}

function CountdownBox({ value }: Readonly<{ value: string | number }>) {
  return (
    <span className="rounded-lg bg-purple-950/80 border border-yellow-300/70 px-2.5 py-1 sm:px-3 sm:py-1.5 min-w-[2.6rem] sm:min-w-[3.2rem] text-center font-mono font-extrabold text-white text-lg sm:text-2xl shadow-sm tabular-nums">
      {value}
    </span>
  );
}

function getCountdownParts(remainingMs: number) {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => value.toString().padStart(2, "0");
  return {
    days,
    hours: pad(hours),
    minutes: pad(minutes),
    seconds: pad(seconds),
  };
}

function Countdown({ remainingMs }: Readonly<{ remainingMs: number }>) {
  const { days, hours, minutes, seconds } = getCountdownParts(remainingMs);
  return (
    <div className="flex items-center gap-1.5 text-base sm:text-lg">
      {days > 0 && (
        <>
          <CountdownBox value={`${days}d`} />
          <span className="text-white/50 font-bold">:</span>
        </>
      )}
      <CountdownBox value={hours} />
      <span className="text-white/50 font-bold">:</span>
      <CountdownBox value={minutes} />
      <span className="text-white/50 font-bold">:</span>
      <CountdownBox value={seconds} />
    </div>
  );
}

export default function FlashSalesPage() {
  const { t } = useTranslation();
  const merchantProvinceById = useMerchantProvinceMap();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const { data: slots = [], isLoading } = useQuery({
    queryKey: ["flash-sale-slots"],
    queryFn: () => promotionService.getFlashSaleSlots(10),
  });

  const selected = useMemo(() => {
    const running = slots.find((slot) => {
      const start = new Date(slot.startDate).getTime();
      const end = new Date(slot.endDate).getTime();
      return now >= start && now < end;
    });
    if (running) return running;
    return (
      [...slots]
        .filter((slot) => new Date(slot.startDate).getTime() > now)
        .sort(
          (a, b) =>
            new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
        )[0] ?? null
    );
  }, [slots, now]);

  const skuIds = useMemo(
    () =>
      Array.from(new Set((selected?.items ?? []).map((item) => item.skuId))),
    [selected],
  );

  const { data: products } = useQuery({
    queryKey: [
      "flash-sale-products",
      selected?.campaignId ?? "",
      skuIds.join(","),
    ],
    queryFn: () => productService.resolveBySkuIds(skuIds),
    enabled: skuIds.length > 0,
  });

  const productBySku = useMemo(() => {
    const map = new Map<
      string,
      {
        productId: string;
        merchantId?: string;
        name: string;
        slug?: string | null;
        image?: string;
        variantPrice?: number;
        currency?: string;
        rating?: number;
        reviewCount?: number;
        provinceCode?: string | null;
        provinceName?: string | null;
      }
    >();
    for (const product of products ?? []) {
      for (const variant of product.variants ?? []) {
        map.set(variant.skuId, {
          productId: product.productId,
          merchantId: product.merchantId,
          name: product.name,
          slug: product.slug,
          image: product.imageList?.[0],
          variantPrice: variant.price,
          currency: variant.currency,
          rating: product.rating,
          reviewCount: product.reviewCount,
          provinceCode: product.provinceCode,
          provinceName: product.provinceName,
        });
      }
    }
    return map;
  }, [products]);

  const items = useMemo(
    () =>
      [...(selected?.items ?? [])].sort(
        (a, b) => (b.soldCount ?? 0) - (a.soldCount ?? 0),
      ),
    [selected],
  );

  const startMs = selected ? new Date(selected.startDate).getTime() : 0;
  const endMs = selected ? new Date(selected.endDate).getTime() : 0;
  const isUpcoming = now < startMs;
  const remaining = isUpcoming ? startMs - now : endMs - now;

  let content: ReactNode;
  if (isLoading) {
    content = (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-brand" size={28} />
      </div>
    );
  } else if (!selected) {
    content = (
      <EmptyState
        icon={Zap}
        title={t("flashSales.empty")}
        description={t("flashSales.emptyDescription")}
      />
    );
  } else {
    content = (
      <section key={selected.campaignId} className="space-y-4">
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
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="relative overflow-hidden inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 px-3 py-1.5 rounded-full text-sm font-black uppercase tracking-wider shadow-lg shadow-purple-600/30 border border-purple-400/30 sm:text-base">
                          <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none animate-electric-glimmer" />
                          <Zap
                            size={16}
                            className="shrink-0 fill-purple-100 text-purple-50 drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]"
                          />
                          {t("home.flashSale")}
                        </span>
                        <span className="whitespace-nowrap rounded-full border-2 border-yellow-300/80 bg-purple-950/60 px-3.5 py-1.5 text-lg font-extrabold tracking-wide text-yellow-50 tabular-nums sm:text-xl">
                          {slotRange(selected)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5 text-xs sm:text-sm">
                        <span className="whitespace-nowrap text-sm font-bold text-purple-200 sm:text-base">
                          {isUpcoming
                            ? t("flashSales.startsIn")
                            : t("flashSales.endsIn")}
                        </span>
                        <Countdown remainingMs={remaining} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {items.map((item) => {
                    const info = productBySku.get(item.skuId);
                    return (
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
                        provinceName={
                          info?.provinceName ??
                          (info?.merchantId
                            ? merchantProvinceById.get(info.merchantId)
                            : undefined)
                        }
                        provinceCode={info?.provinceCode}
                        flashSale={{
                          campaignId: selected.campaignId,
                          endAt: selected.endDate,
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
                    );
                  })}
                </div>
              </section>
    );
  }

  return (
    <div className="bg-transparent min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {content}
      </div>
    </div>
  );
}
