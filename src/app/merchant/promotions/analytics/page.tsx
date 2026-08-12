"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2, Percent, Ticket, TrendingDown } from "lucide-react";
import AuthGuard from "@/components/auth/AuthGuard";
import { StatCard } from "@/shared/ui";
import { SimpleBarChart } from "@/components/charts";
import { useTranslation } from "@/hooks";
import { qk } from "@/lib/query-keys";
import { merchantAnalyticsService } from "@/lib/services";
import { formatCurrency, formatNumber } from "@/shared/lib/utils";

function VoucherAnalyticsInner() {
  const { t, locale } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: qk.merchantVoucherAnalytics,
    queryFn: () => merchantAnalyticsService.vouchers(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-blue-600" size={28} />
      </div>
    );
  }

  const topData =
    data?.topVouchers.slice(0, 8).map((v) => ({
      name: v.voucherCode,
      redeemed: v.redeemed,
    })) ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {t("merchant.promotionAnalytics.title")}
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title={t("merchant.promotionAnalytics.totalIssued")}
            value={formatNumber(data?.totalIssued ?? 0, locale)}
            icon={Ticket}
            color="blue"
          />
          <StatCard
            title={t("merchant.promotionAnalytics.totalRedeemed")}
            value={formatNumber(data?.totalRedeemed ?? 0, locale)}
            subtitle={t("merchant.promotionAnalytics.remainingSubtitle", {
              count: formatNumber(data?.totalRemaining ?? 0, locale),
            })}
            icon={TrendingDown}
            color="green"
          />
          <StatCard
            title={t("merchant.promotionAnalytics.redemptionRate")}
            value={`${((data?.redemptionRate ?? 0) * 100).toFixed(1)}%`}
            icon={Percent}
            color="purple"
          />
          <StatCard
            title={t("merchant.promotionAnalytics.totalDiscount")}
            value={formatCurrency(data?.totalDiscountValue ?? 0, "VND")}
            subtitle={t("merchant.promotionAnalytics.totalDiscountSubtitle")}
            icon={Ticket}
            color="orange"
          />
        </div>

        <div className="bg-white rounded-md border border-gray-300 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">
            {t("merchant.promotionAnalytics.topByRedeemed")}
          </h3>
          {topData.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">
              {t("merchant.promotionAnalytics.emptyRedeemed")}
            </p>
          ) : (
            <SimpleBarChart
              data={topData}
              xKey="name"
              yKey="redeemed"
              horizontal
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function MerchantVoucherAnalyticsPage() {
  return (
    <AuthGuard requiredRoles={["MERCHANT"]}>
      <VoucherAnalyticsInner />
    </AuthGuard>
  );
}
