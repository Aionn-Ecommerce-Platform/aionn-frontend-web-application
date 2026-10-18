"use client";

import Link from "next/link";
import Image from "next/image";
import { Flame, Sparkles, Star, Zap } from "lucide-react";
import { cn, formatCurrency } from "@/shared/lib/utils";
import { useTranslation } from "@/hooks";
import type { FlashSaleInfo, RecommendationReason } from "@/types";

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  merchant?: string;
  rating?: number;
  reviewCount?: number;
  sold?: number;
  isBestSeller?: boolean;
  flashSale?: FlashSaleInfo | null;
  provinceName?: string | null;
  className?: string;
  recommendationReason?: RecommendationReason;
  currency?: string;
}

export default function ProductCard({
  id,
  name,
  price,
  originalPrice,
  image,
  merchant: _merchant,
  rating,
  reviewCount,
  sold,
  isBestSeller,
  flashSale,
  className,
  provinceName,
  recommendationReason,
  currency = "VND",
}: ProductCardProps) {
  const { t, locale } = useTranslation();
  const isFlashSale = !!flashSale;
  const displayPrice = isFlashSale ? flashSale.salePrice : price;
  const strikePrice = isFlashSale
    ? price
    : originalPrice && originalPrice > price
      ? originalPrice
      : undefined;
  const discount =
    strikePrice && strikePrice > displayPrice
      ? Math.round((1 - displayPrice / strikePrice) * 100)
      : 0;
  const hasReviews = reviewCount !== undefined && reviewCount > 0;
  const currentRating =
    hasReviews && rating !== undefined && rating > 0 ? rating : 0;
  const soldCount = sold ?? 0;
  const displayedSold = soldCount >= 1000 ? "1k+" : String(soldCount);

  let leadingBadge: React.ReactNode = null;
  if (isFlashSale) {
    leadingBadge = (
      <span className="relative overflow-hidden inline-flex items-center gap-1.5 bg-gradient-to-r from-purple-700 via-fuchsia-600 to-indigo-700 text-white text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-md shadow-purple-500/25 z-10 select-none">
        {/* Micro electric shimmer */}
        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none animate-electric-glimmer" />
        <Zap size={11} className="fill-purple-200 text-purple-100 animate-lightning drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]" />
        FLASH SALE
      </span>
    );
  } else if (recommendationReason === "TRENDING") {
    leadingBadge = (
      <span className="inline-flex items-center gap-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-md shadow-purple-500/20 z-10 select-none">
        <Sparkles size={11} className="fill-white" />
        {t("recommendation.reasons.TRENDING")}
      </span>
    );
  } else if (isBestSeller) {
    leadingBadge = (
      <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-md shadow-orange-500/20 z-10 select-none">
        <Flame size={11} className="fill-white" />
        {t("home.bestSeller")}
      </span>
    );
  } else if (recommendationReason === "NEW_ARRIVAL") {
    leadingBadge = (
      <span className="inline-flex items-center gap-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-md shadow-emerald-500/20 z-10 select-none">
        <Sparkles size={11} className="fill-white" />
        {t("recommendation.reasons.NEW_ARRIVAL")}
      </span>
    );
  }

  return (
    <Link
      href={`/products/${id}`}
      className={cn(
        "group relative flex flex-col h-full rounded-2xl overflow-hidden transition-all duration-300",
        isFlashSale
          ? "bg-white border-2 border-purple-400 shadow-md shadow-purple-500/10 hover:border-purple-600 hover:shadow-xl hover:shadow-purple-500/20"
          : "bg-white border border-gray-200 shadow-xs hover:border-gray-950 hover:shadow-xl hover:shadow-black/5",
        className,
      )}
    >
      {/* Image container */}
      <div className="aspect-square relative bg-gradient-to-b from-gray-50/80 to-gray-100/40 overflow-hidden shrink-0">
        <Image
          src={image}
          alt={name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
        />

        {/* Top Badges: pinned neatly to top-2.5 */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between pointer-events-none z-10">
          <div>{leadingBadge}</div>
          {discount > 0 && (
            <span
              className={cn(
                "font-extrabold text-[11px] px-2 py-0.5 rounded-full shadow-md backdrop-blur-sm ml-auto",
                isFlashSale
                  ? "bg-gradient-to-r from-purple-700 to-indigo-600 text-white animate-pulse"
                  : "bg-red-500 text-white",
              )}
            >
              -{discount}%
            </span>
          )}
        </div>

        {/* Subtle overlay gradient on flashsale */}
        {isFlashSale && (
          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-purple-500/10 to-transparent pointer-events-none" />
        )}
      </div>

      {/* Product Content Details */}
      <div
        className={cn(
          "p-3 flex flex-col flex-1 justify-between transition-colors",
          isFlashSale
            ? "bg-gradient-to-b from-purple-50/40 via-white to-white group-hover:from-purple-50/70"
            : "bg-white group-hover:bg-gray-50/40",
        )}
      >
        <div className="flex flex-col flex-1">
          <h3
            className={cn(
              "text-[13px] font-medium line-clamp-2 transition-colors min-h-[2.4rem] leading-snug",
              isFlashSale
                ? "text-gray-900 group-hover:text-purple-700 font-semibold"
                : "text-gray-800 group-hover:text-black font-semibold",
            )}
          >
            <span className="align-middle">{name}</span>
          </h3>

          <div className="mt-2.5 flex items-baseline gap-2 flex-wrap min-h-[1.75rem]">
            <span
              className={cn(
                "text-[17px] font-extrabold tracking-tight",
                isFlashSale
                  ? "bg-gradient-to-r from-purple-700 via-fuchsia-600 to-indigo-700 bg-clip-text text-transparent drop-shadow-xs text-lg"
                  : discount > 0
                    ? "text-red-600"
                    : "text-gray-900",
              )}
            >
              {formatCurrency(displayPrice, currency, locale)}
            </span>
            {strikePrice && strikePrice > displayPrice && (
              <span className="text-[12px] font-normal text-gray-400 line-through leading-none">
                {formatCurrency(strikePrice, currency, locale)}
              </span>
            )}
          </div>
        </div>

        <div
          className={cn(
            "mt-3 pt-2 flex items-center justify-between text-[11px] text-gray-400 border-t",
            isFlashSale
              ? "border-purple-200/80"
              : "border-gray-200/80",
          )}
        >
          {hasReviews ? (
            <div className="flex items-center gap-1">
              <div className="flex items-center text-amber-400">
                {[...Array(5)].map((_, i) => {
                  const starValue = i + 1;
                  return (
                    <Star
                      key={i}
                      size={11}
                      className={cn(
                        "shrink-0",
                        starValue <= currentRating
                          ? "fill-amber-400 text-amber-400"
                          : "text-gray-200 fill-gray-200",
                      )}
                    />
                  );
                })}
              </div>
              <span className="text-[10px] text-gray-500">({reviewCount})</span>
            </div>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-1.5 shrink-0">
            {provinceName && (
              <span className="text-gray-400 text-[10px] font-medium whitespace-nowrap truncate max-w-[70px]">
                {provinceName}
              </span>
            )}
            <span className="text-[11px] font-medium text-gray-400 whitespace-nowrap">
              {t("home.soldCount").replace("{count}", displayedSold)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
