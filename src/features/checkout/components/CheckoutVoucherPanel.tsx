"use client";
import { Check, Clock, Loader2, Ticket, Zap } from "lucide-react";
import { Modal } from "@/shared/ui";
import { formatCurrency, formatDate } from "@/shared/lib/utils";
import type { UserVoucher } from "@/types";
type T = (key: string, values?: Record<string, string | number>) => string;
interface Props {
  locale: "vi" | "en";
  code: string | null;
  selected?: UserVoucher | null;
  meetsMinimum: boolean;
  applying: boolean;
  modalOpen: boolean;
  loading: boolean;
  vouchers: UserVoucher[];
  total: number;
  currency?: string;
  onModal: (open: boolean) => void;
  onRemove: () => void;
  onApply: (code: string) => void;
  t: T;
}
export default function CheckoutVoucherPanel(props: Props) {
  const {
    locale,
    code: rawVoucherCode,
    selected: selectedVoucher,
    meetsMinimum: voucherMeetsMinimum,
    applying: applyingVoucher,
    modalOpen: voucherModalOpen,
    loading: loadingVouchers,
    vouchers: userVouchers,
    total: totalAmount,
    currency,
    onModal: setVoucherModalOpen,
    onRemove: handleRemoveVoucher,
    onApply: handleApplyVoucher,
    t,
  } = props;
  const voucherCode = rawVoucherCode ?? "";
  return (
    <>
      {" "}
      <div className="bg-white rounded-2xl border border-gray-400 shadow-sm p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="flex items-center gap-2.5 text-base font-semibold text-gray-900">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text--commerce">
              <Ticket size={16} />
            </span>
            {locale === "vi" ? "Voucher" : "Voucher"}
          </h2>
          <div className="flex items-center gap-4">
            {voucherCode && (
              <button
                type="button"
                onClick={handleRemoveVoucher}
                disabled={applyingVoucher}
                className="text-sm font-semibold text-red-500 hover:text-red-600 disabled:opacity-50"
              >
                {t("common.remove")}
              </button>
            )}
            <button
              type="button"
              onClick={() => setVoucherModalOpen(true)}
              className="text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              {voucherCode
                ? locale === "vi"
                  ? t("checkout.changeVoucher")
                  : "Change voucher"
                : locale === "vi"
                  ? t("checkout.chooseVoucher")
                  : "Choose voucher"}
            </button>
          </div>
        </div>
        {voucherCode ? (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-orange-200 bg-gradient-to-r from-orange-50 to-rose-50 px-4 py-3">
            <div>
              <code className="font-mono text-sm font-bold text--commerce">
                {voucherCode}
              </code>
              {selectedVoucher?.voucherDiscountAmount ? (
                <p className="mt-1 text-xs text-gray-600">
                  {t("common.discount")}{" "}
                  {formatCurrency(
                    selectedVoucher.voucherDiscountAmount,
                    selectedVoucher.voucherCurrency ?? currency,
                  )}
                </p>
              ) : null}
            </div>
            <span
              className={`text-xs font-medium ${voucherMeetsMinimum ? "text-green-700" : "text-red-600"}`}
            >
              {voucherMeetsMinimum
                ? locale === "vi"
                  ? t("checkout.willApply")
                  : "Will apply"
                : locale === "vi"
                  ? t("checkout.minimumNotMet")
                  : "Minimum not met"}
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setVoucherModalOpen(true)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 py-3 text-sm font-medium text-gray-600 transition-colors hover:border-orange-300 hover:bg-orange-50 hover:text--commerce"
          >
            <Ticket size={16} />
            {locale === "vi"
              ? t("checkout.applyVoucherHint")
              : "Apply a voucher to save"}
          </button>
        )}
      </div>
      <Modal
        isOpen={voucherModalOpen}
        onClose={() => setVoucherModalOpen(false)}
        title={t("checkout.chooseVoucher")}
        size="full"
      >
        {loadingVouchers ? (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-blue-600" size={24} />
          </div>
        ) : userVouchers.filter(
            (voucher) =>
              voucher.status === "CLAIMED" || voucher.status === "RELEASED",
          ).length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">
            {locale === "vi"
              ? t("checkout.noAvailableVouchers")
              : "You do not have any available vouchers"}
          </p>
        ) : (
          <div className="space-y-4">
            {userVouchers
              .filter(
                (voucher) =>
                  voucher.status === "CLAIMED" || voucher.status === "RELEASED",
              )
              .map((voucher) => {
                const discountAmount = voucher.voucherDiscountAmount ?? 0;
                const isFreeship = voucher.voucherCode
                  .toLowerCase()
                  .includes("freeship");
                const isShop = voucher.voucherScope === "SHOP";
                const minimumOrder = voucher.minOrderValue ?? 0;
                const validUntil = voucher.voucherValidUntil;
                const meetsMinimum =
                  minimumOrder === 0 || totalAmount >= minimumOrder;
                const isSelected = voucherCode === voucher.voucherCode;
                const shortfall = Math.max(minimumOrder - totalAmount, 0);
                const ccy = voucher.voucherCurrency ?? currency;

                let leftBgColor = "bg--commerce";
                let leftTagText = t("checkout.platform");
                if (isFreeship) {
                  leftBgColor = "bg--shipping";
                  leftTagText = t("checkout.freeShippingShort");
                } else if (isShop) {
                  leftBgColor = "bg--shop";
                  leftTagText = t("checkout.shop");
                }

                return (
                  <div
                    key={voucher.userVoucherId}
                    className={`relative flex bg-white border rounded-xl transition-all min-h-[128px] ${
                      isSelected
                        ? "border--commerce shadow-md ring-2 ring--commerce/30"
                        : meetsMinimum
                          ? "border-gray-300 hover:shadow-lg hover:border--commerce"
                          : "border-gray-200 opacity-60"
                    }`}
                  >
                    <div className="absolute top-0 left-28 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border border-gray-300 z-10" />
                    <div className="absolute bottom-0 left-28 -translate-x-1/2 translate-y-1/2 w-4 h-4 rounded-full bg-white border border-gray-300 z-10" />

                    <div
                      className={`w-28 flex flex-col items-center justify-center text-white px-2 text-center select-none shrink-0 relative rounded-l-xl ${leftBgColor}`}
                    >
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
                      <span className="text-[10px] font-black tracking-wide uppercase truncate max-w-full drop-shadow leading-tight">
                        {leftTagText}
                      </span>
                    </div>
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-4 border-l border-dashed border-gray-300 px-5 py-4">
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
                                  amount: formatCurrency(
                                    minimumOrder,
                                    ccy,
                                    locale,
                                  ),
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
                                  amount: formatCurrency(
                                    shortfall,
                                    ccy,
                                    locale,
                                  ),
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
                            className="bg--commerce text-white font-extrabold px-5 py-2 text-sm rounded-xl min-w-[96px] flex items-center justify-center cursor-default"
                          >
                            <Check size={16} className="mr-1" />
                            {t("checkout.selected")}
                          </button>
                        ) : meetsMinimum ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleApplyVoucher(voucher.voucherCode)
                            }
                            disabled={applyingVoucher}
                            className="bg-white font-extrabold px-5 py-2 text-sm rounded-xl border-2 border--commerce text--commerce hover:bg--commerce hover:text-white transition-all cursor-pointer min-w-[96px] flex items-center justify-center disabled:opacity-50"
                          >
                            {applyingVoucher ? (
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
                            className="bg-gray-100 border border-gray-300 text-gray-400 font-extrabold px-5 py-2 text-sm rounded-xl min-w-[96px] cursor-not-allowed"
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
    </>
  );
}
