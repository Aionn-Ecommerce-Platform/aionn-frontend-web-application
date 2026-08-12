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
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Ticket size={18} className="text-orange-500" />
        {t("promotions.tabShop")}
      </h2>
      <div className="flex gap-6 overflow-x-auto pb-4">
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
              className="flex bg-white border border-gray-400 rounded-xl min-h-[128px] shrink-0 w-[360px]"
            >
              <div className="w-28 flex flex-col items-center justify-center text-white px-2 text-center shrink-0 bg--shop">
                {merchant.logoUrl ? (
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/50 bg-white mb-1">
                    <AppImage
                      src={merchant.logoUrl}
                      alt={merchant.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <Ticket size={20} />
                )}
                <span className="text-xs font-black uppercase truncate max-w-full">
                  {merchant.name}
                </span>
              </div>
              <div className="flex-1 flex items-center justify-between py-5 px-5 border-l border-dashed border-gray-400">
                <div className="flex-1 pr-3">
                  <h3 className="font-extrabold text-gray-900">
                    {t("promotions.discountAmount", {
                      amount: formatCurrency(
                        voucher.discountAmount,
                        voucher.currency,
                      ),
                    })}
                  </h3>
                  <p className="text-xs font-semibold">{voucher.voucherCode}</p>
                  <div className="flex items-center gap-1 text-[11px] text-gray-400">
                    <Clock size={11} />
                    {t("promotions.validUntil", {
                      date: voucher.validUntil
                        ? formatDate(voucher.validUntil, locale)
                        : "N/A",
                    })}
                  </div>
                  {voucher.usageLimit > 0 && (
                    <>
                      <p className="text-[11px] font-bold text--shop">
                        {t("promotions.stockLeft", { count: remaining })}
                      </p>
                      <div className="mt-2 bg-gray-200 h-1.5">
                        <div
                          className="h-full bg--shop"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                    </>
                  )}
                </div>
                {remaining <= 0 ? (
                  <button disabled className="text-xs text-gray-400">
                    {t("promotions.fullyClaimed")}
                  </button>
                ) : claimed ? (
                  <button
                    onClick={onUse}
                    className="font-bold text-xs text--commerce"
                  >
                    {t("promotions.useNow")}
                  </button>
                ) : (
                  <button
                    disabled={claimingCode === voucher.voucherCode}
                    onClick={() => onClaim(voucher.voucherCode)}
                    className="font-bold text-xs text--commerce"
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
          );
        })}
      </div>
    </section>
  );
}
