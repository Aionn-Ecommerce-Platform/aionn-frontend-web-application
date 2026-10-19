"use client";

import { useMemo, useState } from "react";
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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";
import { Badge, EmptyState } from "@/shared/ui";
import MemberPageLayout from "@/components/layout/MemberPageLayout";
import AuthGuard from "@/components/auth/AuthGuard";
import { voucherService } from "@/lib/services";
import { getVoucherStatus } from "@/lib/domain/status/voucher";
import { qk } from "@/lib/query-keys";
import { formatCurrency, formatDate } from "@/shared/lib/utils";
import { getErrorMessage } from "@/shared/lib/errors";
import { useTranslation } from "@/hooks";
import type { UserVoucher } from "@/types";

type TabFilter = "ALL" | "AVAILABLE" | "USED" | "EXPIRED";

function getEstimatedDiscount(code: string): number | null {
  if (code.includes("50K")) return 50000;
  if (code.includes("30K")) return 30000;
  if (code.includes("100")) return 100000;
  return null;
}

function getVoucherCardStyle(
  isFreeship: boolean,
  isShop: boolean,
  inactive: boolean,
  t: (key: string) => string,
) {
  if (inactive) {
    let scope = t("myVouchers.platformScope");
    let icon = Sparkles;
    if (isFreeship) {
      scope = t("myVouchers.freeshipScope");
      icon = Zap;
    } else if (isShop) {
      scope = t("myVouchers.shopScope");
      icon = Store;
    }
    return {
      stubGradient: "bg-gradient-to-br from-gray-400 to-gray-500",
      scopeLabel: scope,
      StubIcon: icon,
    };
  }
  if (isFreeship) {
    return {
      stubGradient: "bg-gradient-to-br from-emerald-500 to-teal-600",
      scopeLabel: t("myVouchers.freeshipScope"),
      StubIcon: Zap,
    };
  }
  if (isShop) {
    return {
      stubGradient: "bg-gradient-to-br from-indigo-500 to-purple-600",
      scopeLabel: t("myVouchers.shopScope"),
      StubIcon: Store,
    };
  }
  return {
    stubGradient: "bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500",
    scopeLabel: t("myVouchers.platformScope"),
    StubIcon: Sparkles,
  };
}

function VoucherActionButton({
  available,
  used,
  onUse,
  t,
}: {
  available: boolean;
  used: boolean;
  onUse: () => void;
  t: (key: string) => string;
}) {
  if (available) {
    return (
      <button
        onClick={onUse}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full bg-gray-950 hover:bg-black text-white text-xs font-bold transition-all shadow-xs cursor-pointer group-hover:scale-102"
      >
        <span>{t("myVouchers.useNow")}</span>
        <ArrowRight size={14} />
      </button>
    );
  }
  if (used) {
    return (
      <button
        disabled
        className="w-full sm:w-auto px-4 py-2 rounded-full bg-gray-100 text-gray-400 text-xs font-bold cursor-not-allowed"
      >
        {t("myVouchers.used")}
      </button>
    );
  }
  return (
    <button
      disabled
      className="w-full sm:w-auto px-4 py-2 rounded-full bg-gray-100 text-gray-400 text-xs font-bold cursor-not-allowed"
    >
      {t("myVouchers.expired")}
    </button>
  );
}

function VoucherCard({
  voucher,
  locale,
  copiedCode,
  onCopy,
  onUse,
  t,
}: {
  voucher: UserVoucher;
  locale: string;
  copiedCode: string | null;
  onCopy: (code: string) => void;
  onUse: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const expired = voucher.status === "EXPIRED";
  const used = voucher.status === "APPLIED" || voucher.status === "RESERVED";
  const available = voucher.status === "CLAIMED" || voucher.status === "RELEASED";

  const upperCode = voucher.voucherCode.toUpperCase();
  const isFreeship = upperCode.includes("SHIP") || upperCode.includes("FREE");
  const isShop = voucher.voucherScope === "SHOP" || upperCode.includes("SHOP");

  const discount =
    voucher.voucherDiscountAmount ??
    voucher.appliedAmount ??
    getEstimatedDiscount(voucher.voucherCode);

  const ccy = voucher.voucherCurrency ?? voucher.currency ?? "VND";
  const minOrder = voucher.minOrderValue ?? 0;
  const validUntil = voucher.voucherValidUntil ?? voucher.reservedExpiresAt;

  const { stubGradient, scopeLabel, StubIcon } = getVoucherCardStyle(
    isFreeship,
    isShop,
    used || expired,
    t,
  );

  const statusCfg = getVoucherStatus(voucher.status);

  return (
    <div
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
                onClick={() => onCopy(voucher.voucherCode)}
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

            <Badge variant={statusCfg?.variant ?? "info"}>
              {statusCfg ? t(statusCfg.labelKey) : voucher.status}
            </Badge>
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
          <VoucherActionButton
            available={available}
            used={used}
            onUse={onUse}
            t={t}
          />
        </div>
      </div>
    </div>
  );
}

function VouchersInner() {
  const router = useRouter();
  const qc = useQueryClient();
  const { t, locale } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabFilter>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;
  const [inputCode, setInputCode] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: qk.myVouchers(),
    queryFn: () => voucherService.listMine(50),
  });
  const vouchers = useMemo(() => data ?? [], [data]);

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
    void navigator.clipboard.writeText(code);
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

  const handleTabChange = (tab: TabFilter) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const filteredVouchers = useMemo(() => {
    const list = vouchers.filter((v) => {
      if (activeTab === "AVAILABLE") return isAvailable(v);
      if (activeTab === "USED") return isUsed(v);
      if (activeTab === "EXPIRED") return isExpired(v);
      return true;
    });

    return [...list].sort((a, b) => {
      // Prioritize available vouchers first (0), then used (1), then expired (2)
      const aRank = isAvailable(a) ? 0 : isUsed(a) ? 1 : 2;
      const bRank = isAvailable(b) ? 0 : isUsed(b) ? 1 : 2;
      if (aRank !== bRank) return aRank - bRank;

      // Within same status, newest claimed first
      const aTime = a.claimedAt ? new Date(a.claimedAt).getTime() : 0;
      const bTime = b.claimedAt ? new Date(b.claimedAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [vouchers, activeTab]);

  const totalItems = filteredVouchers.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedVouchers = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredVouchers.slice(start, start + PAGE_SIZE);
  }, [filteredVouchers, safeCurrentPage]);

  const renderVoucherList = () => {
    if (isLoading) {
      return (
        <div className="bg-white rounded-2xl border border-gray-200/90 py-20 flex justify-center shadow-xs">
          <Loader2 className="animate-spin text-brand" size={32} />
        </div>
      );
    }
    if (filteredVouchers.length === 0) {
      return (
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
      );
    }
    return paginatedVouchers.map((voucher) => (
      <VoucherCard
        key={voucher.userVoucherId}
        voucher={voucher}
        locale={locale}
        copiedCode={copiedCode}
        onCopy={handleCopy}
        onUse={() => router.push("/products")}
        t={t}
      />
    ));
  };

  return (
    <MemberPageLayout>
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight">
            {t("myVouchers.title")}
          </h1>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          {t("myVouchers.subtitle")}
        </p>
      </div>

      {/* Enter Voucher Code Form */}
      <div className="bg-white rounded-2xl border border-gray-200/90 p-5 sm:p-6 mb-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
        <form
          onSubmit={handleClaim}
          className="flex flex-col sm:flex-row items-center gap-3"
        >
          <div className="relative flex-1 w-full">
            <Ticket
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              placeholder={t("myVouchers.inputPlaceholder")}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 uppercase tracking-wider font-semibold placeholder:normal-case placeholder:font-normal placeholder:text-gray-400"
            />
          </div>
          <button
            type="submit"
            disabled={!inputCode.trim() || claimMutation.isPending}
            className="w-full sm:w-auto px-6 py-2.5 bg-gray-950 hover:bg-black text-white text-xs font-bold rounded-xl disabled:opacity-50 transition-all shadow-xs cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {claimMutation.isPending && (
              <Loader2 size={14} className="animate-spin" />
            )}
            <span>{t("myVouchers.applyCode")}</span>
          </button>
        </form>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-3 overflow-x-auto scrollbar-none">
        {(
          [
            { key: "ALL", label: t("myVouchers.all") },
            { key: "AVAILABLE", label: t("myVouchers.available") },
            { key: "USED", label: t("myVouchers.used") },
            { key: "EXPIRED", label: t("myVouchers.expired") },
          ] as const
        ).map((tab) => {
          const count = counts[tab.key];
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                active
                  ? "bg-gray-950 text-white shadow-xs"
                  : "bg-gray-100/80 text-gray-600 hover:bg-gray-200/80 hover:text-gray-900"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  active
                    ? "bg-white/20 text-white"
                    : "bg-white text-gray-500 border border-gray-200"
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
        {renderVoucherList()}

        {totalPages > 1 && (
          <div className="flex items-center justify-center pt-8 pb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setCurrentPage((p) => Math.max(1, p - 1));
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                disabled={safeCurrentPage <= 1}
                aria-label="Previous Page"
                className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-gray-900 bg-white text-gray-900 transition-colors hover:bg-gray-100 disabled:opacity-30 disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-white cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="flex items-center gap-1.5">
                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(
                  (pageNum) => {
                    const isSelected = pageNum === safeCurrentPage;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => {
                          setCurrentPage(pageNum);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className={`h-9 min-w-9 px-2 text-xs font-bold rounded-full transition-all cursor-pointer ${
                          isSelected
                            ? "bg-gray-950 text-white border-2 border-gray-950 shadow-xs"
                            : "bg-white text-gray-800 border-2 border-gray-900 hover:bg-gray-100"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  },
                )}
              </div>

              <button
                onClick={() => {
                  setCurrentPage((p) => Math.min(totalPages, p + 1));
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                disabled={safeCurrentPage >= totalPages}
                aria-label="Next Page"
                className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-gray-900 bg-white text-gray-900 transition-colors hover:bg-gray-100 disabled:opacity-30 disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-white cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
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
