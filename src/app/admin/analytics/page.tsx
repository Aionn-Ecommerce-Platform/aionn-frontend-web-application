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
import { AdminHeader, AdminTabs } from "@/features/admin";
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
import { returnReasonLabelKey } from "@/lib/domain/return-reasons";
import type { LucideIcon } from "lucide-react";
import type { ReturnReasonType } from "@/types";

const EMPTY_ROLES: string[] = [];

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-2xl border border-gray-600 bg-white/[0.04] p-4">
      <Icon size={22} className="mb-2.5 text-purple-300" />
      <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {title}
      </p>
      <p className="mt-1 truncate text-xl font-extrabold text-white">{value}</p>
      {subtitle && (
        <p className="mt-0.5 truncate text-xs text-slate-400">{subtitle}</p>
      )}
    </div>
  );
}

function PeriodTabs({
  period,
  onChange,
}: {
  period: AnalyticsPeriod;
  onChange: (p: AnalyticsPeriod) => void;
}) {
  const { t } = useTranslation();
  const items: Array<{ value: AnalyticsPeriod; labelKey: string }> = [
    { value: "7d", labelKey: "adminAnalytics.days7" },
    { value: "30d", labelKey: "adminAnalytics.days30" },
    { value: "90d", labelKey: "adminAnalytics.days90" },
  ];
  return (
    <AdminTabs
      value={period}
      onChange={onChange}
      tabs={items.map((item) => ({
        value: item.value,
        label: t(item.labelKey),
      }))}
    />
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

  const topMerchantIds =
    platform?.topMerchants.slice(0, 8).map((m) => m.merchantId) ?? [];
  const { data: merchantNames } = useQuery({
    queryKey: ["analytics-merchant-names", topMerchantIds.join(",")],
    queryFn: async () => {
      const { merchantService } = await import("@/lib/services");
      const rows = await Promise.all(
        topMerchantIds.map((id) => merchantService.get(id).catch(() => null)),
      );
      return new Map(
        rows
          .filter((row): row is NonNullable<typeof row> => row !== null)
          .map((row) => [row.merchantId, row.name]),
      );
    },
    enabled: topMerchantIds.length > 0,
  });

  if (loadingPlatform || loadingUsers || loadingProducts) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-purple-300" size={28} />
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
      name: merchantNames?.get(m.merchantId) ?? m.merchantId,
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
        <MetricCard
          title={t("adminAnalytics.totalGmv")}
          value={formatCurrency(platform?.totalGmv ?? 0, currency, locale)}
          subtitle={t("adminAnalytics.completedOrders", {
            count: platform?.completedOrders ?? 0,
          })}
          icon={DollarSign}
        />
        <MetricCard
          title={t("adminAnalytics.totalOrders")}
          value={formatNumber(platform?.totalOrders ?? 0, locale)}
          subtitle={t("adminAnalytics.allStatuses")}
          icon={BarChart3}
        />
        <MetricCard
          title={t("adminAnalytics.users")}
          value={formatNumber(users?.totalUsers ?? 0, locale)}
          subtitle={t("adminAnalytics.newUsers", {
            count: users?.newUsersInRange ?? 0,
          })}
          icon={Users}
        />
        <MetricCard
          title={t("adminAnalytics.publishedProducts")}
          value={formatNumber(products?.totalPublished ?? 0, locale)}
          subtitle={t("adminAnalytics.pendingReview", {
            count: products?.totalPendingReview ?? 0,
          })}
          icon={TrendingUp}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-gray-600 bg-white/[0.04] p-5">
          <h3 className="font-semibold text-white mb-4">
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
        <div className="rounded-2xl border border-gray-600 bg-white/[0.04] p-5">
          <h3 className="font-semibold text-white mb-4">
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
        <div className="rounded-2xl border border-gray-600 bg-white/[0.04] p-5">
          <h3 className="font-semibold text-white mb-4">
            {t("adminAnalytics.topMerchants")}
          </h3>
          {topMerchantData.length === 0 ? (
            <p className="text-sm text-slate-400">
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
        <div className="rounded-2xl border border-gray-600 bg-white/[0.04] p-5">
          <h3 className="font-semibold text-white mb-4">
            {t("adminAnalytics.orderStatusBreakdown")}
          </h3>
          {statusData.length === 0 ? (
            <p className="text-sm text-slate-400">
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
        <Loader2 className="animate-spin text-purple-300" size={28} />
      </div>
    );
  }

  const currency = payments?.currency ?? "VND";
  const reasonData =
    returns?.returnsByReasonType.slice(0, 8).map((r) => ({
      name: t(returnReasonLabelKey(r.reasonType as ReturnReasonType)),
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
        <MetricCard
          title={t("adminAnalytics.returnRequests")}
          value={formatNumber(returns?.totalReturns ?? 0, locale)}
          subtitle={t("adminAnalytics.rate", {
            value: ((returns?.returnRate ?? 0) * 100).toFixed(1),
          })}
          icon={RefreshCw}
        />
        <MetricCard
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
        />
        <MetricCard
          title={t("adminAnalytics.kycPending")}
          value={formatNumber(
            (kyc?.pending ?? 0) + (kyc?.submitted ?? 0),
            locale,
          )}
          subtitle={t("adminAnalytics.avgProcessing", {
            hours: (kyc?.avgProcessingHours ?? 0).toFixed(1),
          })}
          icon={ShieldCheck}
        />
        <MetricCard
          title={t("adminAnalytics.openFeedback")}
          value={formatNumber(feedbacks?.open ?? 0, locale)}
          subtitle={t("adminAnalytics.avgResolution", {
            hours: (feedbacks?.avgResolutionHours ?? 0).toFixed(1),
          })}
          icon={UserPlus}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-gray-600 bg-white/[0.04] p-5">
          <h3 className="font-semibold text-white mb-4">
            {t("adminAnalytics.returnReasons")}
          </h3>
          {reasonData.length === 0 ? (
            <p className="text-sm text-slate-400">
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
        <div className="rounded-2xl border border-gray-600 bg-white/[0.04] p-5">
          <h3 className="font-semibold text-white mb-4">
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
        <div className="rounded-2xl border border-gray-600 bg-white/[0.04] p-5">
          <p className="text-sm text-slate-400 mb-1">
            {t("adminAnalytics.kycApproved")}
          </p>
          <p className="text-2xl font-bold text-emerald-300">
            {kyc?.approved ?? 0}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {t("adminAnalytics.approvalRate", {
              value: ((kyc?.approvalRate ?? 0) * 100).toFixed(1),
            })}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-600 bg-white/[0.04] p-5">
          <p className="text-sm text-slate-400 mb-1">
            {t("adminAnalytics.kycRejected")}
          </p>
          <p className="text-2xl font-bold text-rose-300">
            {kyc?.rejected ?? 0}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-600 bg-white/[0.04] p-5">
          <p className="text-sm text-slate-400 mb-1">
            {t("adminAnalytics.feedbackResolved")}
          </p>
          <p className="text-2xl font-bold text-purple-200">
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
    <div className="min-h-screen">
      <AdminHeader
        icon={BarChart3}
        title={t("adminAnalytics.title")}
        description={`${range.from} → ${range.to}`}
      />
      <div className="mb-6">
        <PeriodTabs period={period} onChange={setPeriod} />
      </div>

      {isSystemAdmin && (
        <section className="mb-10">
          <h2 className="mb-4 text-lg font-semibold text-white">
            {t("adminAnalytics.platformOverview")}
          </h2>
          <SysadminSection range={range} />
        </section>
      )}

      {(isCsAdmin || isSystemAdmin) && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-white">
            {t("adminAnalytics.customerService")}
          </h2>
          <CsAdminSection range={range} />
        </section>
      )}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  return (
    <AuthGuard requiredRoles={["SYSTEM_ADMIN"]}>
      <AdminAnalyticsInner />
    </AuthGuard>
  );
}
