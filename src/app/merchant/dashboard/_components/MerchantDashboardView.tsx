"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, TrendingUp } from "lucide-react";
import AuthGuard from "@/components/auth/AuthGuard";
import { Card, CardTitle } from "@/shared/ui";
import { compactCurrency, smoothPath } from "@/shared/lib/chart-utils";
import { getOrderStatus } from "@/lib/domain/status/order";
import { qk } from "@/lib/query-keys";
import { merchantService, orderService, productService } from "@/lib/services";
import { formatCurrency } from "@/shared/lib/utils";
import { useAuthStore } from "@/stores/auth.store";
import { useTranslation } from "@/hooks";
import { PeriodDropdown } from "./PeriodDropdown";

const MONTH_KEYS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
] as const;

function formatIso(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function MerchantDashboardInner() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [now] = useState(() => new Date());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());

  const { data: merchant } = useQuery({
    queryKey: ["merchant", "me"],
    queryFn: () => merchantService.getMine(),
  });

  const openedAt = useMemo(
    () => (merchant?.createdAt ? new Date(merchant.createdAt) : now),
    [merchant, now],
  );
  const openedYear = openedAt.getFullYear();
  const openedMonth = openedAt.getMonth();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const yearOptions = useMemo(() => {
    const opts: { value: number; label: string }[] = [];
    for (let y = openedYear; y <= currentYear; y++) {
      opts.push({ value: y, label: String(y) });
    }
    return opts;
  }, [openedYear, currentYear]);

  const monthOptions = useMemo(() => {
    const startMonth = selectedYear === openedYear ? openedMonth : 0;
    const endMonth = selectedYear === currentYear ? currentMonth : 11;
    const opts: { value: number; label: string }[] = [];
    for (let m = startMonth; m <= endMonth; m++) {
      opts.push({
        value: m,
        label: t(`merchant.dashboard.months.${MONTH_KEYS[m]}`),
      });
    }
    return opts;
  }, [selectedYear, openedYear, openedMonth, currentYear, currentMonth, t]);

  useEffect(() => {
    if (!monthOptions.some((o) => o.value === selectedMonth)) {
      queueMicrotask(() =>
        setSelectedMonth(monthOptions[monthOptions.length - 1]?.value ?? 0),
      );
    }
  }, [monthOptions, selectedMonth]);

  const monthRange = useMemo(() => {
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    return {
      from: formatIso(selectedYear, selectedMonth, 1),
      to: formatIso(selectedYear, selectedMonth, lastDay),
      daysInMonth: lastDay,
    };
  }, [selectedYear, selectedMonth]);

  const { data: analytics } = useQuery({
    queryKey: qk.merchantOrderAnalytics({
      from: monthRange.from,
      to: monthRange.to,
    }),
    queryFn: () =>
      orderService.merchantAnalytics({
        from: monthRange.from,
        to: monthRange.to,
      }),
  });

  const allTimeRange = useMemo(() => {
    const today = new Date();
    const to = today.toISOString().slice(0, 10);
    return { from: "2000-01-01", to };
  }, []);

  const { data: allTimeAnalytics } = useQuery({
    queryKey: qk.merchantOrderAnalytics({
      from: allTimeRange.from,
      to: allTimeRange.to,
    }),
    queryFn: () =>
      orderService.merchantAnalytics({
        from: allTimeRange.from,
        to: allTimeRange.to,
      }),
  });

  const { data: orders } = useQuery({
    queryKey: qk.merchantOrders({ limit: 100 }),
    queryFn: () => orderService.listForMerchant({ limit: 100 }),
  });

  const merchantId = merchant?.merchantId;
  const { data: products } = useQuery({
    queryKey: ["merchant", "products-count", merchantId],
    queryFn: () =>
      merchantId
        ? productService.listByMerchant(merchantId, 0, 1)
        : Promise.resolve(undefined),
    enabled: !!merchantId,
  });

  const revenueTrend = useMemo(
    () => analytics?.revenueTrend ?? [],
    [analytics?.revenueTrend],
  );
  const statusRows = useMemo(
    () =>
      [...(analytics?.statusBreakdown ?? [])].sort((a, b) => b.count - a.count),
    [analytics?.statusBreakdown],
  );
  const totalOrders = analytics?.totalOrders ?? 0;
  const totalRevenue = allTimeAnalytics?.totalRevenue ?? 0;
  const productsCount = products?.totalElements ?? 0;
  const customers = new Set((orders ?? []).map((o) => o.userId)).size;

  const totalMonthRevenue = revenueTrend.reduce(
    (sum, point) => sum + point.revenue,
    0,
  );
  const avgDayRevenue =
    revenueTrend.length > 0 ? totalMonthRevenue / revenueTrend.length : 0;

  const stats = [
    {
      label: t("merchant.dashboard.statRevenue"),
      value: formatCurrency(totalRevenue),
    },
    {
      label: t("merchant.dashboard.statAvgPerDay"),
      value: formatCurrency(avgDayRevenue),
    },
    {
      label: t("merchant.dashboard.statProducts"),
      value: String(productsCount),
    },
    {
      label: t("merchant.dashboard.statCustomers"),
      value: String(customers),
    },
  ];

  const chart = useMemo(() => {
    const W = 720;
    const H = 300;
    const PAD_L = 64;
    const PAD_R = 24;
    const PAD_T = 32;
    const PAD_B = 44;
    const peakValue = Math.max(1, ...revenueTrend.map((p) => p.revenue));
    const points = revenueTrend.map((item, index) => {
      const span = revenueTrend.length > 1 ? revenueTrend.length - 1 : 1;
      const x = PAD_L + (index / span) * (W - PAD_L - PAD_R);
      const y = PAD_T + (1 - item.revenue / peakValue) * (H - PAD_T - PAD_B);
      const day = new Date(item.date).getDate();
      return { ...item, x, y, day };
    });
    const linePath = smoothPath(points);
    const firstPoint = points[0];
    const lastPoint = points.at(-1);
    const areaPath =
      firstPoint && lastPoint
        ? `${linePath} L ${lastPoint.x} ${H - PAD_B} L ${firstPoint.x} ${H - PAD_B} Z`
        : "";
    const labelEvery = Math.max(1, Math.ceil(points.length / 10));
    return {
      W,
      H,
      PAD_L,
      PAD_R,
      PAD_T,
      PAD_B,
      yTicks: [
        peakValue,
        peakValue * 0.75,
        peakValue * 0.5,
        peakValue * 0.25,
        0,
      ],
      points,
      linePath,
      areaPath,
      labelEvery,
    };
  }, [revenueTrend]);

  const completionRate =
    totalOrders > 0
      ? Math.round(
          ((statusRows.find((row) => row.status === "COMPLETED")?.count ?? 0) /
            totalOrders) *
            100,
        )
      : 0;

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            {t("merchant.dashboard.title")}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {merchant?.name ??
              user?.displayName ??
              t("merchant.dashboard.yourShop")}
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <p className="text-xs text-gray-500 uppercase font-medium tracking-wide">
                {stat.label}
              </p>
              <p className="text-xl font-bold text-gray-900 mt-2 truncate">
                {stat.value}
              </p>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <CardTitle>{t("merchant.dashboard.revenueByDay")}</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    {t("merchant.dashboard.revenueByDayDesc")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <PeriodDropdown
                    label={t("merchant.dashboard.month")}
                    value={selectedMonth}
                    options={monthOptions}
                    onChange={setSelectedMonth}
                    width="w-36"
                  />
                  <PeriodDropdown
                    label={t("merchant.dashboard.year")}
                    value={selectedYear}
                    options={yearOptions}
                    onChange={setSelectedYear}
                    width="w-28"
                  />
                </div>
              </div>

              <div className="h-72 w-full">
                <svg
                  viewBox={`0 0 ${chart.W} ${chart.H}`}
                  preserveAspectRatio="none"
                  className="h-full w-full"
                  role="img"
                  aria-label={t("merchant.dashboard.chartAria")}
                >
                  <defs>
                    <linearGradient id="revArea" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="#3b82f6"
                        stopOpacity="0.28"
                      />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="revLine" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>
                  </defs>
                  {chart.yTicks.map((tick, i) => {
                    const y =
                      chart.PAD_T +
                      (i / (chart.yTicks.length - 1)) *
                        (chart.H - chart.PAD_T - chart.PAD_B);
                    return (
                      <g key={`${tick}-${i}`}>
                        <line
                          x1={chart.PAD_L}
                          x2={chart.W - chart.PAD_R}
                          y1={y}
                          y2={y}
                          stroke="#eef2f7"
                          strokeWidth="1"
                          strokeDasharray={
                            i === chart.yTicks.length - 1 ? "0" : "4 4"
                          }
                        />
                        <text
                          x={chart.PAD_L - 12}
                          y={y + 4}
                          textAnchor="end"
                          className="fill-gray-400 text-[10px] font-medium"
                        >
                          {compactCurrency(tick)}
                        </text>
                      </g>
                    );
                  })}
                  {chart.points.length > 1 ? (
                    <>
                      <path d={chart.areaPath} fill="url(#revArea)" />
                      <path
                        d={chart.linePath}
                        fill="none"
                        stroke="url(#revLine)"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </>
                  ) : null}
                  {chart.points.map((point, index) => (
                    <g key={point.date}>
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r={4}
                        fill="#fff"
                        stroke="#3b82f6"
                        strokeWidth={2}
                      >
                        <title>
                          {t("merchant.dashboard.tooltip", {
                            day: point.day,
                            revenue: formatCurrency(point.revenue),
                            orders: point.orders,
                          })}
                        </title>
                      </circle>
                      {index % chart.labelEvery === 0 ? (
                        <text
                          x={point.x}
                          y={chart.H - chart.PAD_B + 22}
                          textAnchor="middle"
                          className="fill-gray-500 text-[11px] font-medium"
                        >
                          {point.day}
                        </text>
                      ) : null}
                    </g>
                  ))}
                </svg>
              </div>
            </Card>
          </div>

          <Card>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <BarChart3 size={18} className="text-blue-600" />
                <CardTitle>{t("merchant.dashboard.orderBreakdown")}</CardTitle>
              </div>
              <span className="text-xs text-gray-500">
                {t("merchant.dashboard.totalOrders", { count: totalOrders })}
              </span>
            </div>
            <div className="space-y-3.5">
              {statusRows.map((row) => {
                const percent =
                  totalOrders > 0
                    ? Math.round((row.count / totalOrders) * 100)
                    : 0;
                const status = getOrderStatus(row.status);
                return (
                  <div key={row.status}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 rounded-full ${status?.dot ?? "bg-gray-400"}`}
                        />
                        <span className="font-medium text-gray-700">
                          {status ? t(status.labelKey) : row.status}
                        </span>
                      </div>
                      <span className="text-gray-500">
                        <span className="font-semibold text-gray-700">
                          {row.count}
                        </span>{" "}
                        · {percent}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${status?.bar ?? "from-gray-300 to-gray-400"}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {totalOrders === 0 ? (
                <p className="text-sm text-gray-500 text-center py-2">
                  {t("merchant.dashboard.noOrderData")}
                </p>
              ) : null}
            </div>
            <div className="mt-5 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 rounded-md px-3 py-2">
                <TrendingUp size={14} />
                <span>
                  {t("merchant.dashboard.completionRate")}{" "}
                  <strong>{completionRate}%</strong>
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function MerchantDashboardPage() {
  return (
    <AuthGuard requiredRoles={["MERCHANT"]}>
      <MerchantDashboardInner />
    </AuthGuard>
  );
}
