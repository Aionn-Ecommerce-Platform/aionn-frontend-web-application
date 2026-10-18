"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Ticket,
  Clock,
  Loader2,
  Copy,
  Check,
  Zap,
  Store,
  Sparkles,
  ShoppingBag,
  ArrowRight,
  Search,
} from "lucide-react";
import toast from "react-hot-toast";
import { Badge, EmptyState } from "@/shared/ui";
import MemberPageLayout from "@/components/layout/MemberPageLayout";
import AuthGuard from "@/components/auth/AuthGuard";
import { voucherService } from "@/lib/services";
import { qk } from "@/lib/query-keys";
import { formatCurrency, formatDate } from "@/shared/lib/utils";
import { getErrorMessage } from "@/shared/lib/errors";
import { useTranslation } from "@/hooks";
import type { UserVoucher } from "@/types";

type TabFilter = "ALL" | "AVAILABLE" | "USED" | "EXPIRED";

function VouchersInner() {
  const router = useRouter();
  const qc = useQueryClient();
  const { t, locale } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabFilter>("ALL");
  const [inputCode, setInputCode] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: qk.myVouchers(),
    queryFn: () => voucherService.listMine(50),
  });
  const vouchers = data ?? [];

  const claimMutation = useMutation({
    mutationFn: (code: string) => voucherService.claim(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.myVouchers() });
      toast.success(t("myVouchers.claimSuccess"));
      setInputCode("");
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    },
  });

  const handleClaim = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputCode.trim().toUpperCase();
    if (!clean) return;
    claimMutation.mutate(clean);
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`${t("myVouchers.copied")} ${code}`, { id: "copy-voucher" });
    setTimeout(() => {
      setCopiedCode((prev) => (prev === code ? null : prev));
    }, 2000);
  };

  const isAvailable = (v: UserVoucher) =>
    v.status === "CLAIMED" || v.status === "RELEASED";
  const isUsed = (v: UserVoucher) =>
    v.status === "APPLIED" || v.status === "RESERVED";
  const isExpired = (v: UserVoucher) => v.status === "EXPIRED";

  const counts = {
    ALL: vouchers.length,
    AVAILABLE: vouchers.filter(isAvailable).length,
    USED: vouchers.filter(isUsed).length,
    EXPIRED: vouchers.filter(isExpired).length,
  };

  const filteredVouchers = vouchers.filter((v) => {
    if (activeTab === "AVAILABLE") return isAvailable(v);
    if (activeTab === "USED") return isUsed(v);
    if (activeTab === "EXPIRED") return isExpired(v);
    return true;
  });

  return (
    <MemberPageLayout>
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">
            {t("myVouchers.title")}
          </h1>
          {vouchers.length > 0 && (
            <span className="bg-gray-900 text-white text-xs font-bold px-2.5 py-0.5 rounded-full shadow-xs">
              {vouchers.length}
            </span>
          )}
        </div>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          {t("myVouchers.subtitle")}
        </p>
      </div>

      {/* Claim Voucher Box */}
      <div className="bg-white rounded-2xl border border-gray-200/90 p-4 sm:p-5 mb-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
        <form
          onSubmit={handleClaim}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
        >
          <div className="relative flex-1">
            <Ticket
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              placeholder={t("myVouchers.inputPlaceholder")}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-none focus:border-gray-950 focus:ring-1 focus:ring-gray-950 transition-all uppercase tracking-wider"
            />
          </div>
          <button
            type="submit"
            disabled={!inputCode.trim() || claimMutation.isPending}
            className="px-6 py-2.5 rounded-xl bg-gray-950 hover:bg-black text-white text-sm font-bold shadow-xs disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {claimMutation.isPending && (
              <Loader2 size={16} className="animate-spin" />
            )}
            <span>{t("myVouchers.saveVoucher")}</span>
          </button>
        </form>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-5 no-scrollbar">
        {(
          [
            { key: "ALL", label: t("myVouchers.tabAll") },
            { key: "AVAILABLE", label: t("myVouchers.tabAvailable") },
            { key: "USED", label: t("myVouchers.tabUsed") },
            { key: "EXPIRED", label: t("myVouchers.tabExpired") },
          ] as const
        ).map((tab) => {
          const active = activeTab === tab.key;
          const count = counts[tab.key];
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 border ${
                active
                  ? "bg-gray-950 text-white border-gray-950 shadow-xs"
                  : "bg-white text-gray-600 border-gray-200/90 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full font-semibold ${
                  active
                    ? "bg-white/20 text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Vouchers List Container */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-gray-200/90 py-20 flex justify-center shadow-xs">
            <Loader2 className="animate-spin text-brand" size={32} />
          </div>
        ) : filteredVouchers.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200/90 p-8 shadow-xs">
            <EmptyState
              icon={Ticket}
              title={t("myVouchers.emptyTitle")}
              description={t("myVouchers.emptyDescription")}
              action={
                <button
                  onClick={() => router.push("/products")}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gray-950 hover:bg-black text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <ShoppingBag size={15} />
                  <span>{t("myVouchers.exploreMore")}</span>
                </button>
              }
            />
          </div>
        ) : (
          filteredVouchers.map((voucher) => {
            const expired = isExpired(voucher);
            const used = isUsed(voucher);
            const available = isAvailable(voucher);

            const isFreeship =
              voucher.voucherCode.toUpperCase().includes("SHIP") ||
              voucher.voucherCode.toUpperCase().includes("FREE");
            const isShop =
              voucher.voucherScope === "SHOP" ||
              voucher.voucherCode.toUpperCase().includes("SHOP");

            const discount =
              voucher.voucherDiscountAmount ??
              voucher.appliedAmount ??
              (voucher.voucherCode.includes("50K")
                ? 50000
                : voucher.voucherCode.includes("30K")
                  ? 30000
                  : voucher.voucherCode.includes("100")
                    ? 100000
                    : null);

            const ccy = voucher.voucherCurrency ?? voucher.currency ?? "VND";
            const minOrder = voucher.minOrderValue ?? 0;
            const validUntil =
              voucher.voucherValidUntil ?? voucher.reservedExpiresAt;

            // Gradient style for the left ticket stub
            let stubGradient =
              "bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500";
            let scopeLabel = t("myVouchers.platformScope");
            let StubIcon = Sparkles;

            if (isFreeship) {
              stubGradient = "bg-gradient-to-br from-emerald-500 to-teal-600";
              scopeLabel = t("myVouchers.freeshipScope");
              StubIcon = Zap;
            } else if (isShop) {
              stubGradient = "bg-gradient-to-br from-indigo-500 to-purple-600";
              scopeLabel = t("myVouchers.shopScope");
              StubIcon = Store;
            }

            if (used || expired) {
              stubGradient = "bg-gradient-to-br from-gray-400 to-gray-500";
            }

            return (
              <div
                key={voucher.userVoucherId}
                className={`relative bg-white rounded-2xl border border-gray-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:border-gray-300 transition-all overflow-hidden flex flex-col sm:flex-row items-stretch group ${
                  used || expired ? "opacity-75" : ""
                }`}
              >
                {/* Perforated ticket cutouts */}
                <div className="hidden sm:block absolute top-0 left-36 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-gray-50 border-b border-gray-300/80 z-10" />
                <div className="hidden sm:block absolute bottom-0 left-36 -translate-x-1/2 translate-y-1/2 w-4 h-4 rounded-full bg-gray-50 border-t border-gray-300/80 z-10" />

                {/* Left Ticket Stub */}
                <div
                  className={`w-full sm:w-36 flex flex-col items-center justify-center p-4 text-center shrink-0 relative text-white ${stubGradient} transition-colors`}
                >
                  <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center mb-1.5 shadow-inner">
                    <StubIcon size={20} className="text-white drop-shadow-xs" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-white/90 drop-shadow-xs">
                    {scopeLabel}
                  </span>
                  {discount ? (
                    <span className="text-lg font-black tracking-tight text-white mt-0.5 drop-shadow-xs">
                      {formatCurrency(discount, ccy, locale)}
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-white/95 mt-0.5">
                      VOUCHER
                    </span>
                  )}
                </div>

                {/* Right Ticket Body */}
                <div className="flex-1 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t sm:border-t-0 sm:border-l border-dashed border-gray-200">
                  <div className="min-w-0 flex-1">
                    {/* Voucher Code & Status */}
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <div className="inline-flex items-center gap-1.5 bg-gray-100/90 hover:bg-gray-200/80 border border-gray-200 text-gray-900 px-2.5 py-1 rounded-lg transition-colors">
                        <code className="text-xs font-mono font-bold tracking-wider">
                          {voucher.voucherCode}
                        </code>
                        <button
                          type="button"
                          onClick={() => handleCopy(voucher.voucherCode)}
                          className="text-gray-500 hover:text-gray-900 transition-colors p-0.5 cursor-pointer"
                          title={t("myVouchers.copyCode")}
                        >
                          {copiedCode === voucher.voucherCode ? (
                            <Check size={13} className="text-green-600" />
                          ) : (
                            <Copy size={13} />
                          )}
                        </button>
                      </div>

                      {used ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          {t("myVouchers.used")}
                        </span>
                      ) : expired ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                          {t("myVouchers.expired")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {t("myVouchers.tabAvailable")}
                        </span>
                      )}
                    </div>

                    {/* Headline Discount text */}
                    <h3 className="text-base font-bold text-gray-950 mt-2">
                      {discount
                        ? t("myVouchers.discountApplied", {
                            amount: formatCurrency(discount, ccy, locale),
                          })
                        : voucher.voucherCode}
                    </h3>

                    {/* Min Order & Expiry */}
                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-1.5 flex-wrap font-medium">
                      <span>
                        {minOrder > 0
                          ? t("myVouchers.minOrder", {
                              amount: formatCurrency(minOrder, ccy, locale),
                            })
                          : t("myVouchers.noMinOrder")}
                      </span>

                      {validUntil && (
                        <span className="flex items-center gap-1 text-gray-400">
                          <Clock size={12} />
                          {t("myVouchers.validUntil", {
                            date: formatDate(validUntil, locale),
                          })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                    {available ? (
                      <button
                        onClick={() => router.push("/products")}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full bg-gray-950 hover:bg-black text-white text-xs font-bold transition-all shadow-xs cursor-pointer group-hover:scale-102"
                      >
                        <span>{t("myVouchers.useNow")}</span>
                        <ArrowRight size={14} />
                      </button>
                    ) : used ? (
                      <button
                        disabled
                        className="w-full sm:w-auto px-4 py-2 rounded-full bg-gray-100 text-gray-400 text-xs font-bold cursor-not-allowed"
                      >
                        {t("myVouchers.used")}
                      </button>
                    ) : (
                      <button
                        disabled
                        className="w-full sm:w-auto px-4 py-2 rounded-full bg-gray-100 text-gray-400 text-xs font-bold cursor-not-allowed"
                      >
                        {t("myVouchers.expired")}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </MemberPageLayout>
  );
}

export default function VouchersPage() {
  return (
    <AuthGuard>
      <VouchersInner />
    </AuthGuard>
  );
}
