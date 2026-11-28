"use client";

import { Loader2, Ticket, Zap } from "lucide-react";
import { AppImage, Button, Modal } from "@/shared/ui";
import { formatCurrency } from "@/shared/lib/utils";
import type { UserVoucher } from "@/types";
import VoucherOptionCard from "./VoucherOptionCard";
import type { VoucherPickerMode } from "./VoucherPickerModal";

type T = (key: string, values?: Record<string, string | number>) => string;

export interface MerchantVoucherInfo {
  name: string;
  logoUrl: string | null;
}

interface VoucherAllModalProps {
  open: boolean;
  onClose: () => void;
  locale: "vi" | "en";
  vouchers: UserVoucher[];
  loading: boolean;
  total: number;
  currency?: string;
  codes: Record<VoucherPickerMode, string | null>;
  applying: VoucherPickerMode | null;
  merchantIds?: string[];
  merchantDirectory?: Map<string, MerchantVoucherInfo>;
  onApply: (mode: VoucherPickerMode, code: string) => void;
  onClear: (mode: VoucherPickerMode) => void;
  t: T;
}

const SECTIONS: { mode: VoucherPickerMode; labelKey: string }[] = [
  { mode: "platform", labelKey: "cart.voucherPlatform" },
  { mode: "shop", labelKey: "cart.voucherShop" },
  { mode: "shipping", labelKey: "cart.voucherShipping" },
];

function matchesMode(voucher: UserVoucher, mode: VoucherPickerMode) {
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
  return (
    voucher.voucherScope === scope && voucher.voucherType !== "FREE_SHIPPING"
  );
}

export default function VoucherAllModal({
  open,
  onClose,
  locale,
  vouchers,
  loading,
  total,
  currency,
  codes,
  applying,
  merchantIds,
  merchantDirectory,
  onApply,
  onClear,
  t,
}: VoucherAllModalProps) {
  const selected = (["platform", "shop", "shipping"] as VoucherPickerMode[])
    .map((mode) => {
      const code = codes[mode];
      if (!code) return null;
      return {
        mode,
        code,
        voucher: vouchers.find((item) => item.voucherCode === code),
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const goodsDiscountTotal = selected.reduce(
    (sum, item) =>
      item.mode === "shipping"
        ? sum
        : sum + (item.voucher?.voucherDiscountAmount ?? 0),
    0,
  );
  const shippingDiscountTotal = selected.reduce(
    (sum, item) =>
      item.mode === "shipping"
        ? sum + (item.voucher?.voucherDiscountAmount ?? 0)
        : sum,
    0,
  );

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={t("checkout.chooseVoucher")}
      size="full"
    >
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin text-brand" size={24} />
        </div>
      ) : (
        <div className="space-y-7">
          {SECTIONS.map((section) => {
            const items = vouchers.filter((voucher) =>
              matchesMode(voucher, section.mode),
            );
            const shopGroups =
              section.mode === "shop"
                ? (merchantIds?.length
                    ? Array.from(new Set(merchantIds))
                    : Array.from(
                        new Set(
                          items
                            .map((voucher) => voucher.merchantId)
                            .filter((id): id is string => Boolean(id)),
                        ),
                      )
                  ).map((merchantId) => ({
                    merchantId,
                    info: merchantDirectory?.get(merchantId),
                    items: items.filter(
                      (voucher) => voucher.merchantId === merchantId,
                    ),
                  }))
                : [{ merchantId: null, info: undefined, items }];
            const visibleGroups =
              section.mode === "shop"
                ? shopGroups.filter((group) => group.items.length > 0)
                : shopGroups;
            const hasCards = visibleGroups.some(
              (group) => group.items.length > 0,
            );
            return (
              <section key={section.mode}>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900">
                  {section.mode === "shipping" ? (
                    <Zap size={15} className="text-shipping" />
                  ) : (
                    <Ticket size={15} className="text-commerce" />
                  )}
                  {t(section.labelKey)}
                </h3>
                <p className="mb-3 text-xs text-gray-500">
                  {t("cart.voucherOncePerOrder")}
                </p>
                <div className="max-h-[490px] space-y-5 overflow-y-auto pr-1">
                  {!hasCards ? (
                    <p className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-xs text-gray-500">
                      {t("cart.noMatchingVouchers")}
                    </p>
                  ) : (
                    visibleGroups.map((group) => (
                      <div key={group.merchantId ?? "all"}>
                        {section.mode === "shop" && (
                          <div className="mb-2 flex items-center gap-2.5">
                            {group.info?.logoUrl ? (
                              <div className="h-8 w-8 overflow-hidden rounded-full border border-gray-200 bg-white">
                                <AppImage
                                  src={group.info.logoUrl}
                                  alt={group.info.name}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                                <Ticket size={15} />
                              </div>
                            )}
                            <span className="text-sm font-semibold text-gray-800">
                              {group.info?.name ?? t("cart.shopFallback")}
                            </span>
                          </div>
                        )}
                        <div className="space-y-4">
                          {group.items.map((voucher) => (
                            <VoucherOptionCard
                              key={voucher.userVoucherId}
                              voucher={voucher}
                              locale={locale}
                              total={total}
                              currency={currency}
                              isSelected={
                                codes[section.mode] === voucher.voucherCode
                              }
                              applying={applying === section.mode}
                              onApply={(code) => onApply(section.mode, code)}
                              onClear={() => onClear(section.mode)}
                              merchantName={group.info?.name}
                              merchantLogo={group.info?.logoUrl}
                              t={t}
                            />
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            );
          })}
          <div className="pt-1">
            <p className="mb-2 text-sm font-bold text-gray-950">
              {t("cart.selectedVouchersTitle")}
            </p>
            {selected.length === 0 ? (
              <p className="text-xs font-medium text-gray-700">
                {t("cart.noVoucherSelected")}
              </p>
            ) : (
              <>
                <ul className="space-y-1 text-sm">
                  {selected.map((item) => {
                    const label =
                      SECTIONS.find((section) => section.mode === item.mode)
                        ?.labelKey ?? "";
                    return (
                      <li
                        key={item.mode}
                        className="flex items-center justify-between gap-3"
                      >
                        <span className="min-w-0 truncate">
                          <span className="text-gray-800">
                            {label ? `${t(label)}: ` : ""}
                          </span>
                          <span className="font-mono font-bold text-gray-950">
                            {item.code}
                          </span>
                        </span>
                        <span className="shrink-0 font-semibold text-commerce">
                          -
                          {formatCurrency(
                            item.voucher?.voucherDiscountAmount ?? 0,
                            item.voucher?.voucherCurrency ?? currency,
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-2 flex items-center justify-between text-sm font-bold text-gray-950">
                  <span>{t("cart.totalDiscount")}</span>
                  <span className="text-commerce">
                    -{formatCurrency(goodsDiscountTotal, currency)}
                  </span>
                </div>
                {shippingDiscountTotal > 0 && (
                  <div className="mt-1 flex items-center justify-between text-xs font-semibold text-gray-700">
                    <span>
                      {t("cart.shippingDiscountTotal")}
                      <span className="ml-1 font-normal text-gray-500">
                        ({t("cart.shippingDiscountNote")})
                      </span>
                    </span>
                    <span className="text-commerce">
                      -{formatCurrency(shippingDiscountTotal, currency)}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="flex justify-end border-t border-gray-100 pt-4">
            <Button type="button" onClick={onClose} className="rounded-xl">
              {t("cart.done")}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
