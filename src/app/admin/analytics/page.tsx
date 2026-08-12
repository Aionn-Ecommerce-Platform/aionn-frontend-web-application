"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  DollarSign,
  Loader2,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import AuthGuard from "@/components/auth/AuthGuard";
import { StatCard } from "@/shared/ui";
import {
  SimpleBarChart,
  SimplePieChart,
  TrendLineChart,
} from "@/components/charts";
import { qk } from "@/lib/query-keys";
import { isNotImplemented } from "@/shared/lib/errors";
import { hasRole } from "@/shared/lib/role-utils";
import { getDateRange, type AnalyticsPeriod } from "@/shared/lib/date-range";
import { adminAnalyticsService, orderService } from "@/lib/services";
import { formatCurrency, formatNumber } from "@/shared/lib/utils";
import { useAuthStore } from "@/stores/auth.store";
import { useTranslation } from "@/hooks";

const EMPTY_ROLES: string[] = [];

function PeriodTabs({
  period,
  onChange,
}: {
  period: AnalyticsPeriod;
  onChange: (p: AnalyticsPeriod) => void;
}) {
  const { t } = useTranslation();
  const items: Array<{ key: AnalyticsPeriod; labelKey: string }> = [
    { key: "7d", labelKey: "adminAnalytics.days7" },
    { key: "30d", labelKey: "adminAnalytics.days30" },
    { key: "90d", labelKey: "adminAnalytics.days90" },
  ];
  return (
    <div className="inline-flex rounded-md border border-gray-300 bg-white p-0.5">
      {items.map((it) => (
        <button
          key={it.key}
          onClick={() => onChange(it.key)}
          className={`px-3 py-1.5 text-sm rounded ${
            period === it.key
              ? "bg-blue-600 text-white"
              : "text-gray-700 hover:bg-gray-50"
          }`}
        >
          {t(it.labelKey)}
        </button>
      ))}
    </div>
  );
}

function SysadminSection({ range }: { range: { from: string; to: string } }) {
  const { t, locale } = useTranslation();
  const { data: platform, isLoading: loadingPlatform } = useQuery({
    queryKey: qk.platformOrderAnalytics(range),
    queryFn: () => orderService.platformAnalytics(range),
  });
  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: qk.userAnalytics(range),
    queryFn: () => adminAnalyticsService.users(range),
  });
  const { data: products, isLoading: loadingProducts } = useQuery({
    queryKey: qk.productAnalytics,
    queryFn: () => adminAnalyticsService.products(),
  });

  if (loadingPlatform || loadingUsers || loadingProducts) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-blue-600" size={28} />
      </div>
    );
  }

  const currency = platform?.currency ?? "VND";
  const revenueData =
    platform?.revenueTrend.map((p) => ({
      date: p.date.slice(5),
      revenue: p.revenue,
    })) ?? [];
  const statusData =
    platform?.statusBreakdown.map((s) => ({
      name: s.status,
      value: s.count,
    })) ?? [];
  const topMerchantData =
    platform?.topMerchants.slice(0, 8).map((m) => ({
      name: m.merchantId,
      revenue: m.revenue,
    })) ?? [];
  const signupData =
    users?.signupTrend.map((p) => ({
      date: p.date.slice(5),
      count: p.count,
    })) ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t("adminAnalytics.totalGmv")}
          value={formatCurrency(platform?.totalGmv ?? 0, currency, locale)}
          subtitle={t("adminAnalytics.completedOrders", {
            count: platform?.completedOrders ?? 0,
          })}
          icon={DollarSign}
          color="green"
        />
        <StatCard
          title={t("adminAnalytics.totalOrders")}
          value={formatNumber(platform?.totalOrders ?? 0, locale)}
          subtitle={t("adminAnalytics.allStatuses")}
          icon={BarChart3}
          color="blue"
        />
        <StatCard
          title={t("adminAnalytics.users")}
          value={formatNumber(users?.totalUsers ?? 0, locale)}
          subtitle={t("adminAnalytics.newUsers", {
            count: users?.newUsersInRange ?? 0,
          })}
          icon={Users}
          color="purple"
        />
        <StatCard
          title={t("adminAnalytics.publishedProducts")}
          value={formatNumber(products?.totalPublished ?? 0, locale)}
          subtitle={t("adminAnalytics.pendingReview", {
            count: products?.totalPendingReview ?? 0,
          })}
          icon={TrendingUp}
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-md border border-gray-300 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">
            {t("adminAnalytics.platformRevenue")}
          </h3>
          <TrendLineChart
            data={revenueData}
            xKey="date"
            yKey="revenue"
            color="#059669"
            yFormatter={(v) => formatCurrency(v, currency, locale)}
          />
        </div>
        <div className="bg-white rounded-md border border-gray-300 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">
            {t("adminAnalytics.newUsersTitle")}
          </h3>
          <TrendLineChart
            data={signupData}
            xKey="date"
            yKey="count"
            color="#7c3aed"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-md border border-gray-300 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">
            Top merchant theo doanh thu
          </h3>
          {topMerchantData.length === 0 ? (
            <p className="text-sm text-gray-500">
              {t("adminAnalytics.noRevenue")}
            </p>
          ) : (
            <SimpleBarChart
              data={topMerchantData}
              xKey="name"
              yKey="revenue"
              horizontal
              yFormatter={(v) => formatCurrency(v, currency, locale)}
            />
          )}
        </div>
        <div className="bg-white rounded-md border border-gray-300 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">
            {t("adminAnalytics.orderStatusBreakdown")}
          </h3>
          {statusData.length === 0 ? (
            <p className="text-sm text-gray-500">
              {t("adminAnalytics.noData")}
            </p>
          ) : (
            <SimplePieChart data={statusData} />
          )}
        </div>
      </div>
    </div>
  );
}

function CsAdminSection({ range }: { range: { from: string; to: string } }) {
  const { t, locale } = useTranslation();
  const { data: returns, isLoading: loadingReturns } = useQuery({
    queryKey: qk.returnAnalytics(range),
    queryFn: () =>
      import("@/lib/services").then(({ adminOrderReturnService }) =>
        adminOrderReturnService.analytics(range),
      ),
  });
  const {
    data: payments,
    isLoading: loadingPayments,
    error: paymentsError,
  } = useQuery({
    queryKey: qk.paymentAnalytics(range),
    queryFn: () => adminAnalyticsService.payments(range),
  });
  const { data: kyc, isLoading: loadingKyc } = useQuery({
    queryKey: qk.kycAnalytics(range),
    queryFn: () => adminAnalyticsService.kyc(range),
  });
  const { data: feedbacks, isLoading: loadingFb } = useQuery({
    queryKey: qk.feedbackAnalytics(range),
    queryFn: () => adminAnalyticsService.feedbacks(range),
  });

  if (loadingReturns || loadingPayments || loadingKyc || loadingFb) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-blue-600" size={28} />
      </div>
    );
  }

  const currency = payments?.currency ?? "VND";
  const reasonData =
    returns?.returnsByReason.slice(0, 8).map((r) => ({
      name: r.reason.length > 20 ? r.reason.slice(0, 20) + "…" : r.reason,
      value: r.count,
    })) ?? [];
  const payoutTrend =
    payments?.payoutVolumeTrend.map((p) => ({
      date: p.date.slice(5),
      amount: p.amount,
    })) ?? [];

  return (
    <div className="space-y-6">
      {isNotImplemented(paymentsError) && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          {t("adminAnalytics.paymentUnavailable")}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t("adminAnalytics.returnRequests")}
          value={formatNumber(returns?.totalReturns ?? 0, locale)}
          subtitle={t("adminAnalytics.rate", {
            value: ((returns?.returnRate ?? 0) * 100).toFixed(1),
          })}
          icon={RefreshCw}
          color="orange"
        />
        <StatCard
          title={t("adminAnalytics.totalRefunds")}
          value={formatCurrency(
            payments?.totalRefundAmount ?? 0,
            currency,
            locale,
          )}
          subtitle={t("adminAnalytics.transactions", {
            count: payments?.totalRefundCount ?? 0,
          })}
          icon={DollarSign}
          color="red"
        />
        <StatCard
          title={t("adminAnalytics.kycPending")}
          value={formatNumber(
            (kyc?.pending ?? 0) + (kyc?.submitted ?? 0),
            locale,
          )}
          subtitle={t("adminAnalytics.avgProcessing", {
            hours: (kyc?.avgProcessingHours ?? 0).toFixed(1),
          })}
          icon={ShieldCheck}
          color="blue"
        />
        <StatCard
          title={t("adminAnalytics.openFeedback")}
          value={formatNumber(feedbacks?.open ?? 0, locale)}
          subtitle={t("adminAnalytics.avgResolution", {
            hours: (feedbacks?.avgResolutionHours ?? 0).toFixed(1),
          })}
          icon={UserPlus}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-md border border-gray-300 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">
            {t("adminAnalytics.returnReasons")}
          </h3>
          {reasonData.length === 0 ? (
            <p className="text-sm text-gray-500">
              {t("adminAnalytics.noReturnData")}
            </p>
          ) : (
            <SimpleBarChart
              data={reasonData}
              xKey="name"
              yKey="value"
              horizontal
              color="#dc2626"
            />
          )}
        </div>
        <div className="bg-white rounded-md border border-gray-300 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">
            {t("adminAnalytics.dailyPayoutVolume")}
          </h3>
          <TrendLineChart
            data={payoutTrend}
            xKey="date"
            yKey="amount"
            color="#0891b2"
            yFormatter={(v) => formatCurrency(v, currency, locale)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-md border border-gray-300 p-5">
          <p className="text-sm text-gray-600 mb-1">
            {t("adminAnalytics.kycApproved")}
          </p>
          <p className="text-2xl font-bold text-green-700">
            {kyc?.approved ?? 0}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {t("adminAnalytics.approvalRate", {
              value: ((kyc?.approvalRate ?? 0) * 100).toFixed(1),
            })}
          </p>
        </div>
        <div className="bg-white rounded-md border border-gray-300 p-5">
          <p className="text-sm text-gray-600 mb-1">
            {t("adminAnalytics.kycRejected")}
          </p>
          <p className="text-2xl font-bold text-red-700">
            {kyc?.rejected ?? 0}
          </p>
        </div>
        <div className="bg-white rounded-md border border-gray-300 p-5">
          <p className="text-sm text-gray-600 mb-1">
            {t("adminAnalytics.feedbackResolved")}
          </p>
          <p className="text-2xl font-bold text-blue-700">
            {feedbacks?.resolved ?? 0}
          </p>
        </div>
      </div>
    </div>
  );
}

function AdminAnalyticsInner() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<AnalyticsPeriod>("30d");
  const range = useMemo(() => getDateRange(period), [period]);
  const userRoles = useAuthStore((s) => s.user?.roles ?? EMPTY_ROLES);
  const isSystemAdmin = hasRole(userRoles, "SYSTEM_ADMIN");
  const isCsAdmin = hasRole(userRoles, "CS_ADMIN");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {t("adminAnalytics.title")}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {range.from} → {range.to}
            </p>
          </div>
          <PeriodTabs period={period} onChange={setPeriod} />
        </div>

        {isSystemAdmin && (
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              {t("adminAnalytics.platformOverview")}
            </h2>
            <SysadminSection range={range} />
          </section>
        )}

        {(isCsAdmin || isSystemAdmin) && (
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              {t("adminAnalytics.customerService")}
            </h2>
            <CsAdminSection range={range} />
          </section>
        )}
      </div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  return (
    <AuthGuard requiredRoles={["SYSTEM_ADMIN", "CS_ADMIN"]}>
      <AdminAnalyticsInner />
    </AuthGuard>
  );
}
