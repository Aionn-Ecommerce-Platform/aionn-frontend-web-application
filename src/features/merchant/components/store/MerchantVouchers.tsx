"use client";

import { AppImage } from "@/shared/ui";
import { Clock, Loader2, Ticket } from "lucide-react";
import { useTranslation } from "@/hooks";
import { formatCurrency, formatDate } from "@/shared/lib/utils";
import type { Merchant, Voucher } from "@/types";

interface Props {
  vouchers: Voucher[];
  merchant: Merchant;
  locale: "vi" | "en";
  claimedCodes: Set<string>;
  claimingCode: string | null;
  onClaim: (code: string) => void;
  onUse: () => void;
}

export default function MerchantVouchers({
  vouchers,
  merchant,
  locale,
  claimedCodes,
  claimingCode,
  onClaim,
  onUse,
}: Props) {
  const { t } = useTranslation();
  if (!vouchers.length) return null;
  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Ticket size={20} className="text-gray-600" />
        <span>{t("promotions.tabShop")}</span>
      </h2>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {vouchers.map((voucher) => {
          const claimed = claimedCodes.has(voucher.voucherCode);
          const remaining = Math.max(voucher.usageLimit - voucher.usedCount, 0);
          const progress =
            voucher.usageLimit > 0
              ? (voucher.usedCount / voucher.usageLimit) * 100
              : 0;
          return (
            <div
              key={voucher.voucherCode}
              className="flex bg-white border border-gray-100 rounded-2xl min-h-[128px] shrink-0 w-[360px] shadow-xs hover:shadow-md transition-all overflow-hidden"
            >
              <div className="w-28 flex flex-col items-center justify-center text-white px-3 text-center shrink-0 bg-gradient-to-br from-indigo-500 to-purple-600">
                {merchant.logoUrl ? (
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/60 bg-white mb-1.5 shadow-xs">
                    <AppImage
                      src={merchant.logoUrl}
                      alt={merchant.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-1.5">
                    <Ticket size={20} />
                  </div>
                )}
                <span className="text-xs font-bold uppercase truncate max-w-full">
                  {merchant.name}
                </span>
              </div>
              <div className="flex-1 flex items-center justify-between py-4 px-4.5 border-l border-dashed border-gray-100">
                <div className="flex-1 pr-3">
                  <h3 className="font-extrabold text-gray-950 text-sm">
                    {t("promotions.discountAmount", {
                      amount: formatCurrency(
                        voucher.discountAmount,
                        voucher.currency,
                      ),
                    })}
                  </h3>
                  <p className="text-xs font-semibold text-gray-700 mt-0.5">{voucher.voucherCode}</p>
                  <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-1">
                    <Clock size={11} />
                    <span>
                      {t("promotions.validUntil", {
                        date: voucher.validUntil
                          ? formatDate(voucher.validUntil, locale)
                          : "N/A",
                      })}
                    </span>
                  </div>
                  {voucher.usageLimit > 0 && (
                    <div className="mt-2">
                      <p className="text-[11px] font-semibold text-gray-500">
                        {t("promotions.stockLeft", { count: remaining })}
                      </p>
                      <div className="mt-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  {remaining <= 0 ? (
                    <span className="text-xs text-gray-400 font-medium px-2 py-1">
                      {t("promotions.fullyClaimed")}
                    </span>
                  ) : claimed ? (
                    <button
                      onClick={onUse}
                      className="font-bold text-xs text-gray-900 border border-gray-200 hover:border-gray-900 bg-white px-3.5 py-1.5 rounded-full transition-all cursor-pointer"
                    >
                      {t("promotions.useNow")}
                    </button>
                  ) : (
                    <button
                      disabled={claimingCode === voucher.voucherCode}
                      onClick={() => onClaim(voucher.voucherCode)}
                      className="font-bold text-xs text-white bg-gray-950 hover:bg-black active:scale-95 px-4 py-2 rounded-full transition-all cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {claimingCode === voucher.voucherCode ? (
                        <Loader2 className="animate-spin" size={14} />
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
    </section>
  );
}
