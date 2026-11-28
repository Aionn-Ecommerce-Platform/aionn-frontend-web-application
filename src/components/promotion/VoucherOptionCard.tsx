"use client";

import { Check, Clock, Loader2, Ticket, Zap } from "lucide-react";
import { AppImage } from "@/shared/ui";
import { formatCurrency, formatDate } from "@/shared/lib/utils";
import type { UserVoucher } from "@/types";

type T = (key: string, values?: Record<string, string | number>) => string;

interface VoucherOptionCardProps {
  voucher: UserVoucher;
  locale: "vi" | "en";
  total: number;
  currency?: string;
  isSelected: boolean;
  applying: boolean;
  onApply: (code: string) => void;
  onClear?: () => void;
  merchantName?: string | null;
  merchantLogo?: string | null;
  t: T;
}

export default function VoucherOptionCard({
  voucher,
  locale,
  total,
  currency,
  isSelected,
  applying,
  onApply,
  onClear,
  merchantName,
  merchantLogo,
  t,
}: VoucherOptionCardProps) {
  const discountAmount = voucher.voucherDiscountAmount ?? 0;
  const isFreeship = voucher.voucherType === "FREE_SHIPPING";
  const isShop = voucher.voucherScope === "SHOP";
  const minimumOrder = voucher.minOrderValue ?? 0;
  const meetsMinimum = minimumOrder === 0 || total >= minimumOrder;
  const ccy = voucher.voucherCurrency ?? currency;
  const usageLimit = voucher.voucherUsageLimit ?? 0;
  const usedCount = voucher.voucherUsedCount ?? 0;
  const remaining = Math.max(usageLimit - usedCount, 0);
  const progress =
    usageLimit > 0 ? Math.min((usedCount / usageLimit) * 100, 100) : 0;

  let leftBg =
    "bg-gradient-to-br from-purple-700 via-fuchsia-600 to-indigo-700";
  let accentText = "text-purple-600";
  let accentBorder = "border-purple-500";
  let accentHover = "hover:bg-purple-600";
  let accentBar = "bg-purple-600";
  let scopeLabel = "PLATFORM";
  let tagText = t("checkout.platform");

  if (isFreeship) {
    leftBg = "bg-gradient-to-br from-teal-500 to-emerald-600";
    accentText = "text-teal-600";
    accentBorder = "border-teal-500";
    accentHover = "hover:bg-teal-600";
    accentBar = "bg-teal-500";
    tagText = t("checkout.freeShippingShort");
    scopeLabel = "PLATFORM";
  } else if (isShop) {
    leftBg = "bg-gradient-to-br from-blue-600 to-indigo-600";
    accentText = "text-blue-600";
    accentBorder = "border-blue-500";
    accentHover = "hover:bg-blue-600";
    accentBar = "bg-blue-600";
    tagText = merchantName || t("cart.shopFallback");
    scopeLabel = "SHOP";
  }

  return (
    <div
      className={`relative flex bg-white border border-gray-400 rounded-xl hover:border-gray-950 hover:shadow-lg transition-all min-h-[150px] overflow-hidden ${
        meetsMinimum ? "" : "opacity-80"
      } ${isSelected ? "border-commerce ring-1 ring-commerce/40" : ""}`}
    >
      <div className="absolute top-0 left-28 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border border-gray-400 z-10" />
      <div className="absolute bottom-0 left-28 -translate-x-1/2 translate-y-1/2 w-4 h-4 rounded-full bg-white border border-gray-400 z-10" />

      <div
        className={`w-28 rounded-l-xl flex flex-col items-center justify-center text-white px-2 text-center select-none shrink-0 relative ${leftBg}`}
      >
        {isShop && merchantLogo ? (
          <div className="mb-1 h-12 w-12 overflow-hidden rounded-full border-2 border-white/50 bg-white shadow">
            <AppImage
              src={merchantLogo}
              alt={merchantName || "Shop"}
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mb-1">
            {isFreeship ? (
              <Zap size={20} className="text-yellow-300 fill-yellow-300" />
            ) : (
              <Ticket size={20} className="text-white" />
            )}
          </div>
        )}
        <span className="max-w-full break-words px-1 text-center text-xs font-black uppercase leading-tight tracking-wide drop-shadow">
          {tagText}
        </span>
        <span className="mt-0.5 font-mono text-[9px] opacity-80">
          {scopeLabel}
        </span>
      </div>

      <div className="relative flex flex-1 items-center justify-between gap-3 border-l border-dashed border-gray-400 px-5 py-4 pl-6">
        <div className="min-w-0 flex-1 pr-2">
          <h3 className="mb-1.5 text-base font-extrabold leading-tight text-gray-900">
            {t("promotions.discountAmount", {
              amount: formatCurrency(discountAmount, ccy),
            })}
          </h3>
          <div className="space-y-1 text-xs text-gray-500">
            {minimumOrder > 0 && (
              <p
                className={`font-semibold ${
                  meetsMinimum ? "text-gray-800" : "text-red-600"
                }`}
              >
                {t("promotions.minOrder", {
                  min: formatCurrency(minimumOrder, ccy),
                })}
              </p>
            )}
            <p className="font-semibold text-gray-800">
              {t("promotions.voucherCodeLabel")}: {voucher.voucherCode}
            </p>
            {voucher.voucherValidUntil && (
              <p className="flex items-center gap-1 text-[11px] text-gray-400">
                <Clock size={11} />
                {t("promotions.validUntil", {
                  date: formatDate(voucher.voucherValidUntil, locale),
                })}
              </p>
            )}
            {usageLimit > 0 && (
              <>
                <p className={`font-semibold ${accentText}`}>
                  {t("promotions.stockLeft", { count: remaining })}
                </p>
                <div className="h-1.5 w-full max-w-[160px] overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full ${accentBar}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </>
            )}
            {!meetsMinimum && (
              <p className="text-[11px] font-bold text-red-600">
                {t("checkout.buyMore", {
                  amount: formatCurrency(minimumOrder - total, ccy, locale),
                })}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {isSelected ? (
            <button
              type="button"
              onClick={onClear}
              className="flex min-w-[104px] cursor-pointer items-center justify-center rounded-lg bg-commerce px-4 py-2 text-sm font-extrabold text-white transition-opacity hover:opacity-90"
            >
              <Check size={15} className="mr-1" />
              {t("checkout.selected")}
            </button>
          ) : meetsMinimum ? (
            <button
              type="button"
              onClick={() => onApply(voucher.voucherCode)}
              disabled={applying}
              className={`flex min-w-[104px] items-center justify-center rounded-lg border-2 bg-white px-4 py-2 text-sm font-extrabold transition-all hover:text-white ${accentBorder} ${accentText} ${accentHover} disabled:opacity-50`}
            >
              {applying ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                t("promotions.useNow")
              )}
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="flex min-w-[104px] cursor-not-allowed items-center justify-center rounded-lg border border-gray-300 bg-gray-100 px-4 py-2 text-sm font-bold text-gray-400"
            >
              {t("checkout.locked")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
