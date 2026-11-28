"use client";

import { useState } from "react";
import { Ticket, X } from "lucide-react";
import { formatCurrency } from "@/shared/lib/utils";
import type { UserVoucher } from "@/types";
import VoucherPickerModal, {
  type VoucherPickerMode,
} from "@/components/promotion/VoucherPickerModal";

type T = (key: string, values?: Record<string, string | number>) => string;

interface Props {
  locale: "vi" | "en";
  platformCode: string | null;
  shopCode: string | null;
  shippingCode: string | null;
  selected: {
    platform: UserVoucher | null;
    shop: UserVoucher | null;
    shipping: UserVoucher | null;
  };
  applying: VoucherPickerMode | null;
  loading: boolean;
  vouchers: UserVoucher[];
  total: number;
  shippingFee: number;
  currency?: string;
  onApply: (mode: VoucherPickerMode, code: string) => void;
  onClear: (mode: VoucherPickerMode) => void;
  t: T;
}

const SLOT_LABELS: Record<VoucherPickerMode, string> = {
  platform: "cart.voucherPlatform",
  shop: "cart.voucherShop",
  shipping: "cart.voucherShipping",
};

export default function CheckoutVoucherPanel({
  locale,
  platformCode,
  shopCode,
  shippingCode,
  selected,
  applying,
  loading,
  vouchers,
  total,
  shippingFee,
  currency,
  onApply,
  onClear,
  t,
}: Props) {
  const [picker, setPicker] = useState<VoucherPickerMode>("platform");
  const [pickerOpen, setPickerOpen] = useState(false);
  const codes: Record<VoucherPickerMode, string | null> = {
    platform: platformCode,
    shop: shopCode,
    shipping: shippingCode,
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-400 shadow-sm p-6">
        <h2 className="mb-4 flex items-center gap-2.5 text-base font-semibold text-gray-900">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-commerce">
            <Ticket size={16} />
          </span>
          {locale === "vi" ? "Voucher" : "Voucher"}
        </h2>
        <div>
          {(["platform", "shipping"] as VoucherPickerMode[]).map((mode) => {
            const code = codes[mode];
            const voucher = selected[mode];
            const discount = voucher?.voucherDiscountAmount ?? 0;
            return (
              <div
                key={mode}
                className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800">
                    {t(SLOT_LABELS[mode])}
                  </p>
                  {code ? (
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs">
                      <span className="font-mono font-semibold text-commerce">
                        {code}
                      </span>
                      {discount > 0 && (
                        <span className="text-commerce">
                          -
                          {formatCurrency(
                            mode === "shipping"
                              ? Math.min(discount, shippingFee)
                              : discount,
                            voucher?.voucherCurrency ?? currency,
                          )}
                        </span>
                      )}
                    </p>
                  ) : (
                    <p className="mt-0.5 text-xs text-gray-400">
                      {t("checkout.notSelected")}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPicker(mode);
                      setPickerOpen(true);
                    }}
                    className="text-sm font-semibold text-brand hover:text-brand-strong"
                  >
                    {code ? t("checkout.change") : t("checkout.select")}
                  </button>
                  {code && (
                    <button
                      type="button"
                      onClick={() => onClear(mode)}
                      disabled={applying !== null}
                      aria-label={t("cart.removeVoucher")}
                      className="flex h-6 w-6 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-500 disabled:opacity-50"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <VoucherPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        locale={locale}
        mode={picker}
        vouchers={vouchers}
        loading={loading}
        total={total}
        currency={currency}
        selectedCode={codes[picker]}
        applying={applying !== null}
        onApply={(code) => {
          onApply(picker, code);
          setPickerOpen(false);
        }}
        t={t}
      />
    </>
  );
}
