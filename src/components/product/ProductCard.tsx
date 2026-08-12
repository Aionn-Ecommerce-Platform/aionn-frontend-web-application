"use client";

import Link from "next/link";
import Image from "next/image";
import { Star, Zap } from "lucide-react";
import { cn, formatCurrency } from "@/shared/lib/utils";
import { useTranslation } from "@/hooks";
import type { FlashSaleInfo } from "@/types";

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
  flashSale?: FlashSaleInfo | null;
  provinceName?: string | null;
  className?: string;
  isMall?: boolean;
}

export default function ProductCard({
  id,
  name,
  price,
  originalPrice,
  image,
  merchant,
  rating,
  reviewCount,
  sold,
  flashSale,
  className,
  isMall,
  provinceName,
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
  const hasSold = sold !== undefined && sold > 0;

  const showMallBadge =
    isMall ||
    (merchant &&
      (merchant.toLowerCase().includes("mall") ||
        merchant.toLowerCase().includes("chính hãng") ||
        merchant.toLowerCase().includes("tech store") ||
        merchant.toLowerCase().includes("life") ||
        merchant.toLowerCase().includes("electronics")));

  return (
    <Link
      href={`/products/${id}`}
      className={cn(
        "group bg-gray-50 rounded-md border border-gray-400 overflow-hidden",
        "hover:border-yellow-400 hover:bg-yellow-50 hover:shadow-lg hover:shadow-yellow-500/10",
        "transition-all duration-300 relative flex flex-col",
        className,
      )}
    >
      <div className="aspect-square relative bg-gray-50 overflow-hidden">
        <Image
          src={image}
          alt={name}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
        />
        {isFlashSale && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1 bg-gradient-to-r from-red-500 to-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm z-10">
            <Zap size={10} className="fill-white" />
            FLASH SALE
          </span>
        )}
      </div>

      <div className="p-2.5 flex flex-col flex-grow bg-gray-50 group-hover:bg-yellow-50 transition-colors justify-between">
        <div>
          <h3 className="text-[13px] font-semibold text-gray-900 line-clamp-2 group-hover:text-yellow-700 transition-colors min-h-[2.25rem] leading-tight">
            {showMallBadge && (
              <span className="inline-flex items-center bg--sale text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded mr-1.5 align-middle uppercase tracking-wide">
                Mall
              </span>
            )}
            <span className="align-middle">{name}</span>
          </h3>

          <div className="mt-2 flex flex-col gap-0.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-bold text--commerce">
                {formatCurrency(displayPrice, "VND", locale)}
              </span>
              {discount > 0 && (
                <span className="text-[10px] font-semibold text--commerce">
                  -{discount}%
                </span>
              )}
            </div>
            {strikePrice && strikePrice > displayPrice && (
              <span className="text-[10px] text-gray-400 line-through leading-none">
                {formatCurrency(strikePrice, "VND", locale)}
              </span>
            )}
          </div>
        </div>

        <div className="mt-2 flex flex-col gap-1 w-full text-[10px]">
          {(hasReviews || hasSold) && (
            <div className="flex items-center gap-1 text-gray-400">
              {hasReviews && (
                <>
                  <div className="flex items-center text-amber-400">
                    {[...Array(5)].map((_, i) => {
                      const starValue = i + 1;
                      return (
                        <Star
                          key={i}
                          size={10}
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
                  <span>({reviewCount})</span>
                </>
              )}
              {hasSold && (
                <span className={hasReviews ? "ml-0.5" : ""}>
                  {hasReviews ? "| " : ""}
                  {t("home.soldCount").replace("{count}", String(sold))}
                </span>
              )}
            </div>
          )}

          {provinceName && (
            <div className="flex justify-end text-gray-500 font-medium whitespace-nowrap w-full">
              {provinceName}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
