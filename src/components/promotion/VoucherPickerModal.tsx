"use client";

import { Check, Clock, Loader2, Ticket, Zap } from "lucide-react";
import { AppImage, Modal } from "@/shared/ui";
import { formatCurrency, formatDate } from "@/shared/lib/utils";
import { useMerchantDirectory } from "@/hooks/useMerchantNameMap";
import type { UserVoucher } from "@/types";

type T = (key: string, values?: Record<string, string | number>) => string;

export type VoucherPickerMode = "platform" | "shop" | "shipping";

interface VoucherPickerModalProps {
  open: boolean;
  onClose: () => void;
  locale: "vi" | "en";
  mode: VoucherPickerMode;
  merchantId?: string | null;
  vouchers: UserVoucher[];
  loading: boolean;
  total: number;
  currency?: string;
  selectedCode: string | null;
  applying: boolean;
  onApply: (code: string) => void;
  t: T;
}

export default function VoucherPickerModal({
  open,
  onClose,
  locale,
  mode,
  merchantId,
  vouchers,
  loading,
  total,
  currency,
  selectedCode,
  applying,
  onApply,
  t,
}: VoucherPickerModalProps) {
  const merchantDirectory = useMerchantDirectory();
  const selectable = vouchers.filter((voucher) => {
    if (voucher.status !== "CLAIMED" && voucher.status !== "RELEASED") {
      return false;
    }
    if (mode === "shipping") {
      return (
        voucher.voucherType === "FREE_SHIPPING" &&
        voucher.voucherScope === "PLATFORM"
      );
    }
    const scope = mode === "platform" ? "PLATFORM" : "SHOP";
    if (mode === "shop" && merchantId && voucher.merchantId !== merchantId) {
      return false;
    }
    return (
      voucher.voucherScope === scope && voucher.voucherType !== "FREE_SHIPPING"
    );
  });
  const title =
    mode === "shipping"
      ? t("checkout.chooseShippingVoucher")
      : mode === "shop"
        ? t("checkout.chooseShopVoucher")
        : t("checkout.choosePlatformVoucher");

  return (
    <Modal isOpen={open} onClose={onClose} title={title} size="full">
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin text-brand" size={24} />
        </div>
      ) : selectable.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500">
          {locale === "vi"
            ? t("checkout.noAvailableVouchers")
            : "You do not have any available vouchers"}
        </p>
      ) : (
        <div className="space-y-4">
          {selectable.map((voucher) => {
            const discountAmount = voucher.voucherDiscountAmount ?? 0;
            const isFreeship = voucher.voucherType === "FREE_SHIPPING";
            const isShop = voucher.voucherScope === "SHOP";
            const minimumOrder = voucher.minOrderValue ?? 0;
            const validUntil = voucher.voucherValidUntil;
            const meetsMinimum = minimumOrder === 0 || total >= minimumOrder;
            const isSelected = selectedCode === voucher.voucherCode;
            const shortfall = Math.max(minimumOrder - total, 0);
            const ccy = voucher.voucherCurrency ?? currency;
            const merchant = voucher.merchantId
              ? merchantDirectory.get(voucher.merchantId)
              : undefined;
            const shopName = merchant?.name;
            const shopLogo = merchant?.logoUrl;

            let leftBgColor = "bg-commerce";
            let leftTagText = t("checkout.platform");
            if (isFreeship) {
              leftBgColor = "bg-shipping";
              leftTagText = t("checkout.freeShippingShort");
            } else if (isShop) {
              leftBgColor = "bg-shop";
              leftTagText = t("checkout.shop");
            }

            return (
              <div
                key={voucher.userVoucherId}
                className={`relative flex bg-white border rounded-xl transition-all min-h-[128px] ${
                  isSelected
                    ? "border-commerce shadow-md ring-2 ring-commerce/30"
                    : meetsMinimum
                      ? "border-gray-400 hover:shadow-lg hover:border-commerce"
                      : "border-gray-400 opacity-60"
                }`}
              >
                <div className="absolute top-0 left-28 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border border-gray-400 z-10" />
                <div className="absolute bottom-0 left-28 -translate-x-1/2 translate-y-1/2 w-4 h-4 rounded-full bg-white border border-gray-400 z-10" />

                <div
                  className={`w-28 flex flex-col items-center justify-center text-white px-2 text-center select-none shrink-0 relative rounded-l-xl ${leftBgColor}`}
                >
                  {isShop && shopLogo ? (
                    <div className="mb-1 h-12 w-12 overflow-hidden rounded-full border-2 border-white/50 bg-white shadow">
                      <AppImage
                        src={shopLogo}
                        alt={shopName ?? t("cart.shopFallback")}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mb-1">
                      {isFreeship ? (
                        <Zap
                          size={20}
                          className="text-yellow-300 fill-yellow-300"
                        />
                      ) : (
                        <Ticket size={20} className="text-white" />
                      )}
                    </div>
                  )}
                  <span className="max-w-full break-words px-1 text-center text-[10px] font-black uppercase leading-tight tracking-wide drop-shadow">
                    {isShop ? (shopName ?? leftTagText) : leftTagText}
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 items-center justify-between gap-4 border-l border-dashed border-gray-400 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-extrabold text-gray-900">
                      {t("common.discount")}{" "}
                      {formatCurrency(discountAmount, ccy)}
                    </p>
                    <p
                      className={`mt-1.5 text-xs font-semibold ${meetsMinimum ? "text-gray-800" : "text-red-600"}`}
                    >
                      {minimumOrder > 0
                        ? locale === "vi"
                          ? t("checkout.minimumOrder", {
                              amount: formatCurrency(minimumOrder, ccy, locale),
                            })
                          : `Min. order ${formatCurrency(minimumOrder, ccy)}`
                        : locale === "vi"
                          ? t("checkout.noMinimumOrder")
                          : "No minimum order"}
                    </p>
                    <p className="mt-1 font-mono text-xs font-semibold text-gray-700">
                      {locale === "vi"
                        ? t("checkout.code", {
                            code: voucher.voucherCode,
                          })
                        : `Code: ${voucher.voucherCode}`}
                    </p>
                    {validUntil && (
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-gray-400">
                        <Clock size={11} />
                        {locale === "vi"
                          ? t("checkout.expiry")
                          : "Valid until"}{" "}
                        {formatDate(validUntil, locale)}
                      </p>
                    )}
                    {!meetsMinimum && shortfall > 0 && (
                      <p className="mt-1.5 text-[11px] font-bold text-red-600">
                        {locale === "vi"
                          ? t("checkout.buyMore", {
                              amount: formatCurrency(shortfall, ccy, locale),
                            })
                          : `Add ${formatCurrency(shortfall, ccy)} more`}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0">
                    {isSelected ? (
                      <button
                        type="button"
                        disabled
                        className="bg-commerce text-white font-extrabold px-5 py-2 text-sm rounded-xl min-w-[96px] flex items-center justify-center cursor-default"
                      >
                        <Check size={16} className="mr-1" />
                        {t("checkout.selected")}
                      </button>
                    ) : meetsMinimum ? (
                      <button
                        type="button"
                        onClick={() => onApply(voucher.voucherCode)}
                        disabled={applying}
                        className="bg-white font-extrabold px-5 py-2 text-sm rounded-xl border-2 border-commerce text-commerce hover:bg-commerce hover:text-white transition-all cursor-pointer min-w-[96px] flex items-center justify-center disabled:opacity-50"
                      >
                        {applying ? (
                          <Loader2 className="animate-spin" size={16} />
                        ) : locale === "vi" ? (
                          t("checkout.select")
                        ) : (
                          "Select"
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="bg-gray-100 border border-gray-400 text-gray-400 font-extrabold px-5 py-2 text-sm rounded-xl min-w-[96px] cursor-not-allowed"
                      >
                        {t("checkout.locked")}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
