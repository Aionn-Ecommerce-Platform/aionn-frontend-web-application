"use client";

import { Clock, Loader2, Store, Ticket, Zap } from "lucide-react";
import { useTranslation } from "@/hooks";
import { formatCurrency, formatDate } from "@/shared/lib/utils";
import type { Voucher } from "@/types";

interface Props {
  vouchers: Voucher[];
  locale: "vi" | "en";
  claimedCodes: Set<string>;
  claimingCode: string | null;
  onClaim: (code: string) => void;
  onUse: () => void;
}

export default function MerchantVouchers({
  vouchers,
  locale,
  claimedCodes,
  claimingCode,
  onClaim,
  onUse,
}: Props) {
  const { t } = useTranslation();
  if (!vouchers.length) return null;

  return (
    <div className="space-y-4">
      {vouchers.map((voucher) => {
        const claimed = claimedCodes.has(voucher.voucherCode);
        const remaining = Math.max(
          voucher.usageLimit - voucher.usedCount,
          0,
        );
        const progress =
          voucher.usageLimit > 0
            ? (voucher.usedCount / voucher.usageLimit) * 100
            : 0;
        const minOrder = voucher.minOrderValue ?? 0;
        const isFreeship = voucher.type === "FREE_SHIPPING";
        const ScopeIcon = isFreeship ? Zap : Store;
        const stubGradient = isFreeship
          ? "bg-gradient-to-br from-emerald-500 to-teal-600"
          : "bg-gradient-to-br from-indigo-500 to-purple-600";

        return (
          <div
            key={voucher.voucherCode}
            className="relative flex flex-col items-stretch overflow-hidden rounded-2xl border border-gray-400 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all hover:border-gray-950 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] sm:flex-row"
          >
            {/* Ticket stub */}
            <div
              className={`flex w-full shrink-0 flex-col items-center justify-center p-4 text-center text-white sm:w-36 ${stubGradient}`}
            >
              <div className="mb-1.5 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 shadow-inner backdrop-blur-xs">
                <ScopeIcon size={20} className="text-white drop-shadow-xs" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-white/90 drop-shadow-xs">
                {isFreeship
                  ? t("myVouchers.freeshipScope")
                  : t("myVouchers.shopScope")}
              </span>
              <span className="mt-0.5 text-lg font-black tracking-tight text-white drop-shadow-xs">
                {formatCurrency(
                  voucher.discountAmount,
                  voucher.currency,
                  locale,
                )}
              </span>
            </div>

            {/* Ticket body */}
            <div className="flex flex-1 flex-col justify-between gap-4 border-t border-dashed border-gray-200 p-4 sm:flex-row sm:items-center sm:border-l sm:border-t-0 sm:p-5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-100/90 px-2.5 py-1 text-xs font-mono font-bold tracking-wider text-gray-900">
                    {voucher.voucherCode}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                    {t("promotions.stockLeft", { count: remaining })}
                  </span>
                </div>

                <h3 className="mt-2 text-base font-bold text-gray-950">
                  {t("promotions.discountAmount", {
                    amount: formatCurrency(
                      voucher.discountAmount,
                      voucher.currency,
                      locale,
                    ),
                  })}
                </h3>

                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-gray-500">
                  <span>
                    {minOrder > 0
                      ? t("myVouchers.minOrder", {
                          amount: formatCurrency(
                            minOrder,
                            voucher.currency,
                            locale,
                          ),
                        })
                      : t("myVouchers.noMinOrder")}
                  </span>
                  <span className="flex items-center gap-1 text-gray-400">
                    <Clock size={12} />
                    {t("myVouchers.validUntil", {
                      date: voucher.validUntil
                        ? formatDate(voucher.validUntil, locale)
                        : "N/A",
                    })}
                  </span>
                </div>

                {voucher.usageLimit > 0 && (
                  <div className="mt-3 max-w-xs">
                    <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full ${
                          isFreeship ? "bg-emerald-500" : "bg-indigo-500"
                        }`}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="shrink-0 border-t border-gray-100 pt-2 sm:border-t-0 sm:pt-0">
                {claimed ? (
                  <button
                    type="button"
                    onClick={onUse}
                    className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full border border-gray-300 bg-white px-5 py-2.5 text-xs font-bold text-gray-950 transition-all hover:border-gray-950 sm:w-auto"
                  >
                    <Ticket size={14} />
                    {t("myVouchers.useNow")}
                  </button>
                ) : remaining <= 0 ? (
                  <span className="inline-flex w-full items-center justify-center rounded-full bg-gray-100 px-4 py-2 text-xs font-bold text-gray-400 sm:w-auto">
                    {t("promotions.fullyClaimed")}
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={claimingCode === voucher.voucherCode}
                    onClick={() => onClaim(voucher.voucherCode)}
                    className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full bg-gray-950 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-black active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  >
                    {claimingCode === voucher.voucherCode ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      t("promotions.save")
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
