"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  Inbox,
  Package,
  PieChart,
  RotateCcw,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import AuthGuard from "@/components/auth/AuthGuard";
import { compactCurrency, smoothPath } from "@/shared/lib/chart-utils";
import { getOrderStatus } from "@/lib/domain/status/order";
import { qk } from "@/lib/query-keys";
import {
  merchantService,
  orderReturnService,
  orderService,
  productService,
} from "@/lib/services";
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

const STATUS_COLORS: Record<string, string> = {
  PLACED: "#c4b5fd",
  APPROVED: "#fbbf24",
  PREPARING: "#f59e0b",
  SHIPPED: "#38bdf8",
  COMPLETED: "#34d399",
  CANCELLED: "#fb7185",
};

function formatCompactMoney(
  value: number,
  locale: string,
  billionUnit: string,
  millionUnit: string,
) {
  const abs = Math.abs(value);
  const formatNumber = (number: number) =>
    number.toLocaleString(locale === "vi" ? "vi-VN" : "en-US", {
      maximumFractionDigits: 1,
    });
  if (abs >= 1_000_000_000) {
    return `${formatNumber(value / 1_000_000_000)} ${billionUnit} VND`;
  }
  if (abs >= 1_000_000) {
    return `${formatNumber(value / 1_000_000)} ${millionUnit} VND`;
  }
  return formatCurrency(value, "VND", locale);
}

function buildSparkline(values: number[]) {
  const width = 160;
  const height = 44;
  const safe = values.length > 0 ? values : [0, 0];
  const max = Math.max(...safe);
  const min = Math.min(...safe);
  const span = max - min || 1;
  const flat = max === min;
  const points = safe.map((value, index) => ({
    x: safe.length === 1 ? width / 2 : (index / (safe.length - 1)) * width,
    y: flat ? height / 2 : height - 6 - ((value - min) / span) * (height - 12),
  }));
  const line =
    smoothPath(points) || `M 0 ${height / 2} L ${width} ${height / 2}`;
  const area = `${line} L ${width} ${height} L 0 ${height} Z`;
  return { line, area };
}

function MerchantDashboardInner() {
  const { t, locale } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [now] = useState(() => new Date());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [hoveredStatus, setHoveredStatus] = useState<string | null>(null);

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

  const merchantCreatedAt = merchant?.createdAt;
  const allTimeRange = useMemo(() => {
    const today = new Date();
    const to = today.toISOString().slice(0, 10);
    const from = merchantCreatedAt
      ? `${new Date(merchantCreatedAt).getFullYear()}-01-01`
      : "2000-01-01";
    return { from, to };
  }, [merchantCreatedAt]);

  const { data: allTimeAnalytics } = useQuery({
    queryKey: qk.merchantOrderAnalytics({
      from: allTimeRange.from,
      to: allTimeRange.to,
      scope: "all-time",
    }),
    queryFn: () => orderService.merchantRevenueTotal(allTimeRange),
    enabled: !!merchant?.createdAt,
  });

  const { data: orders } = useQuery({
    queryKey: qk.merchantOrders({ limit: 100 }),
    queryFn: () => orderService.listForMerchant({ limit: 100 }),
  });

  const { data: returnSummary } = useQuery({
    queryKey: ["merchant-return-summary", monthRange.from, monthRange.to],
    queryFn: () =>
      orderReturnService.summaryForMerchant({
        from: monthRange.from,
        to: monthRange.to,
      }),
  });

  const { data: allTimeReturnSummary } = useQuery({
    queryKey: ["merchant-return-summary", "all-time"],
    queryFn: () => orderReturnService.summaryForMerchant(),
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
  const chartTrend = useMemo(() => {
    const openedDate = merchantCreatedAt ? new Date(merchantCreatedAt) : null;
    const openedIso = openedDate
      ? formatIso(
          openedDate.getFullYear(),
          openedDate.getMonth(),
          openedDate.getDate(),
        )
      : null;
    const todayIso = formatIso(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const from =
      openedIso && openedIso > monthRange.from ? openedIso : monthRange.from;
    const to = todayIso < monthRange.to ? todayIso : monthRange.to;
    if (from > to) return [];
    return revenueTrend.filter(
      (point) => point.date >= from && point.date <= to,
    );
  }, [revenueTrend, merchantCreatedAt, monthRange.from, monthRange.to, now]);
  const statusRows = useMemo(
    () =>
      [...(analytics?.statusBreakdown ?? [])].sort((a, b) => b.count - a.count),
    [analytics?.statusBreakdown],
  );
  const totalOrders = analytics?.totalOrders ?? 0;
  const totalRevenue = allTimeAnalytics?.totalRevenue ?? 0;
  const productsCount = products?.totalElements ?? 0;
  const customers = new Set((orders ?? []).map((o) => o.userId)).size;

  const totalMonthRevenue = chartTrend.reduce(
    (sum, point) => sum + point.revenue,
    0,
  );
  const allTimeRefundTotal = allTimeReturnSummary?.refundTotal ?? 0;
  const monthRefundTotal = returnSummary?.refundTotal ?? 0;
  const allTimeNetRevenue = Math.max(0, totalRevenue - allTimeRefundTotal);
  const merchantActiveDays = useMemo(() => {
    const start = merchantCreatedAt
      ? new Date(merchantCreatedAt)
      : new Date(now);
    const startDay = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate(),
    );
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startUtc = Date.UTC(
      startDay.getFullYear(),
      startDay.getMonth(),
      startDay.getDate(),
    );
    const todayUtc = Date.UTC(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    return Math.max(1, Math.floor((todayUtc - startUtc) / 86_400_000) + 1);
  }, [merchantCreatedAt, now]);
  const avgDayRevenue = allTimeNetRevenue / merchantActiveDays;
  const selectedMonthLabel =
    monthOptions.find((option) => option.value === selectedMonth)?.label ?? "";

  const stats = [
    {
      label: t("merchant.dashboard.statRevenue"),
      value: formatCompactMoney(
        allTimeNetRevenue,
        locale,
        t("merchant.dashboard.currencyBillion"),
        t("merchant.dashboard.currencyMillion"),
      ),
      fullValue: formatCurrency(allTimeNetRevenue),
      icon: Wallet,
      cardClass:
        "from-[#7c5cff] via-[#8b5cf6] to-[#b18cff] shadow-purple-900/40",
      spark: chartTrend.map((point) => point.revenue),
    },
    {
      label: t("merchant.dashboard.statAvgPerDay"),
      value: formatCompactMoney(
        avgDayRevenue,
        locale,
        t("merchant.dashboard.currencyBillion"),
        t("merchant.dashboard.currencyMillion"),
      ),
      fullValue: formatCurrency(avgDayRevenue),
      icon: TrendingUp,
      cardClass: "from-[#12b8d0] via-[#22c7d8] to-[#4dd0e1] shadow-cyan-900/40",
      spark: chartTrend.map((point) => point.revenue),
    },
    {
      label: t("merchant.dashboard.statProducts"),
      value: String(productsCount),
      icon: Package,
      cardClass: "from-[#ff7b8e] via-[#ff8e95] to-[#ffb08a] shadow-rose-900/40",
      spark: statusRows.map((row) => row.count),
    },
    {
      label: t("merchant.dashboard.statCustomers"),
      value: String(customers),
      icon: Users,
      cardClass:
        "from-[#9d7bff] via-[#b48cff] to-[#d8b4fe] shadow-indigo-900/40",
      spark: chartTrend.map((point) => point.orders),
    },
  ];

  const chart = useMemo(() => {
    const W = 720;
    const H = 300;
    const PAD_L = 64;
    const PAD_R = 24;
    const PAD_T = 32;
    const PAD_B = 44;
    const peakValue = Math.max(1, ...chartTrend.map((p) => p.revenue));
    const points = chartTrend.map((item, index) => {
      const span = chartTrend.length > 1 ? chartTrend.length - 1 : 1;
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
  }, [chartTrend]);

  const completionRate =
    totalOrders > 0
      ? Math.round(
          ((statusRows.find((row) => row.status === "COMPLETED")?.count ?? 0) /
            totalOrders) *
            100,
        )
      : 0;

  const donutRadius = 54;
  const donutCircumference = 2 * Math.PI * donutRadius;
  const segmentLength = (count: number) =>
    totalOrders > 0 ? (count / totalOrders) * donutCircumference : 0;
  const donutSegments = statusRows.map((row, index) => ({
    ...row,
    length: segmentLength(row.count),
    offset: statusRows
      .slice(0, index)
      .reduce((sum, previous) => sum + segmentLength(previous.count), 0),
    color: STATUS_COLORS[row.status] ?? "#a78bfa",
  }));

  const hoveredStatusRow = statusRows.find(
    (row) => row.status === hoveredStatus,
  );
  const hoveredStatusConfig = hoveredStatusRow
    ? getOrderStatus(hoveredStatusRow.status)
    : null;

  const hoveredPoint =
    hoveredIndex != null ? chart.points[hoveredIndex] : undefined;
  const chartPointSpacing =
    chart.points.length > 1 ? chart.points[1]!.x - chart.points[0]!.x : 0;
  const hoveredLeft = hoveredPoint
    ? Math.min(88, Math.max(12, (hoveredPoint.x / chart.W) * 100))
    : 0;

  const renderPeriodFilter = () => (
    <div className="flex flex-wrap items-center gap-2">
      <PeriodDropdown
        label={t("merchant.dashboard.month")}
        value={selectedMonth}
        options={monthOptions}
        onChange={(value) => {
          setSelectedMonth(value);
          setHoveredStatus(null);
          setHoveredIndex(null);
        }}
        width="w-32"
      />
      <PeriodDropdown
        label={t("merchant.dashboard.year")}
        value={selectedYear}
        options={yearOptions}
        onChange={(value) => {
          setSelectedYear(value);
          setHoveredStatus(null);
          setHoveredIndex(null);
        }}
        width="w-24"
      />
    </div>
  );

  return (
    <div className="relative rounded-2xl bg-[#100d24] p-4 text-white shadow-2xl shadow-purple-950/30 sm:p-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
        <div className="absolute -left-28 -top-28 h-80 w-80 rounded-full bg-purple-600/20 blur-3xl" />
        <div className="absolute -right-24 top-1/4 h-72 w-72 rounded-full bg-fuchsia-600/10 blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
            backgroundSize: "36px 36px",
          }}
        />
      </div>

      <div className="relative">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="min-w-0 truncate text-2xl font-extrabold tracking-tight">
            <span className="text-purple-300">
              {merchant?.name ??
                user?.displayName ??
                t("merchant.dashboard.yourShop")}
            </span>{" "}
            <span className="text-white">Dashboard</span>
          </h1>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {stats.map((stat) => {
            const StatIcon = stat.icon;
            const spark = buildSparkline(stat.spark);
            return (
              <div
                key={stat.label}
                className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br p-3.5 shadow-lg transition-transform duration-300 hover:-translate-y-1 ${stat.cardClass}`}
              >
                <div className="pointer-events-none absolute inset-0 bg-white/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <StatIcon
                  className="absolute right-3 top-3 text-white/90 group-hover:text-white"
                  size={22}
                  strokeWidth={2.2}
                />
                <div className="relative z-10 pb-4">
                  <p className="text-[13px] font-medium text-white/80">
                    {stat.label}
                  </p>
                  <p
                    className="mt-1 truncate text-lg font-extrabold tracking-tight text-white drop-shadow-sm sm:text-xl"
                    title={stat.fullValue ?? stat.value}
                  >
                    {stat.value}
                  </p>
                </div>
                <svg
                  viewBox="0 0 160 44"
                  preserveAspectRatio="none"
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-7 w-full text-white/70"
                  style={{
                    filter: "blur(0.3px)",
                    maskImage:
                      "linear-gradient(to top, rgba(0,0,0,0.95) 24%, transparent 100%)",
                    WebkitMaskImage:
                      "linear-gradient(to top, rgba(0,0,0,0.95) 24%, transparent 100%)",
                  }}
                  aria-hidden="true"
                >
                  <path d={spark.area} fill="currentColor" fillOpacity="0.12" />
                  <path
                    d={spark.line}
                    fill="none"
                    stroke="currentColor"
                    strokeOpacity="0.9"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-4">
          <div className="order-2 rounded-2xl border border-gray-500 bg-white/[0.04] p-5 backdrop-blur">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <PieChart size={18} className="text-purple-300" />
                  <h3 className="text-base font-bold text-white">
                    {t("merchant.dashboard.orderBreakdown")}
                  </h3>
                </div>
                <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-[11px] font-semibold text-amber-300">
                  {t("merchant.dashboard.totalOrders", { count: totalOrders })}
                </span>
              </div>
              {renderPeriodFilter()}
            </div>

            <div className="flex flex-col items-center gap-5 xl:flex-row">
              <div className="relative h-40 w-40 shrink-0">
                <svg viewBox="0 0 160 160" className="h-full w-full">
                  <circle
                    cx="80"
                    cy="80"
                    r={donutRadius}
                    fill="none"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth="17"
                  />
                  {donutSegments.map((segment) =>
                    segment.length > 0 ? (
                      <circle
                        key={segment.status}
                        cx="80"
                        cy="80"
                        r={donutRadius}
                        fill="none"
                        stroke={segment.color}
                        strokeWidth={hoveredStatus === segment.status ? 20 : 17}
                        strokeDasharray={`${segment.length} ${donutCircumference - segment.length}`}
                        strokeDashoffset={-segment.offset}
                        transform="rotate(-90 80 80)"
                        opacity={
                          hoveredStatus && hoveredStatus !== segment.status
                            ? 0.35
                            : 1
                        }
                        className="cursor-pointer transition-all duration-150"
                        onPointerEnter={() => setHoveredStatus(segment.status)}
                        onPointerLeave={() => setHoveredStatus(null)}
                      >
                        <title>
                          {getOrderStatus(segment.status)
                            ? t(getOrderStatus(segment.status)!.labelKey)
                            : segment.status}
                          {` · ${segment.count} · ${Math.round(
                            (segment.count / Math.max(1, totalOrders)) * 100,
                          )}%`}
                        </title>
                      </circle>
                    ) : null,
                  )}
                </svg>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-extrabold text-white">
                    {hoveredStatusRow
                      ? hoveredStatusRow.count
                      : `${completionRate}%`}
                  </span>
                  <span className="max-w-[86px] text-center text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                    {hoveredStatusRow && hoveredStatusConfig
                      ? t(hoveredStatusConfig.labelKey)
                      : t("merchant.dashboard.completionRate")}
                  </span>
                </div>
              </div>

              <div className="grid w-full min-w-0 grid-cols-1 gap-x-10 gap-y-2.5 sm:grid-cols-2">
                {statusRows.map((row) => {
                  const percent =
                    totalOrders > 0
                      ? Math.round((row.count / totalOrders) * 100)
                      : 0;
                  const status = getOrderStatus(row.status);
                  return (
                    <div
                      key={row.status}
                      className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-1 -mx-2 transition-colors ${
                        hoveredStatus === row.status
                          ? "bg-white/5"
                          : "hover:bg-white/5"
                      }`}
                      onPointerEnter={() => setHoveredStatus(row.status)}
                      onPointerLeave={() => setHoveredStatus(null)}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{
                            backgroundColor:
                              STATUS_COLORS[row.status] ?? "#a78bfa",
                          }}
                        />
                        <span className="truncate text-sm text-slate-300">
                          {status ? t(status.labelKey) : row.status}
                        </span>
                      </div>
                      <span className="shrink-0 text-xs font-semibold text-white">
                        {row.count}
                        <span className="ml-1 font-normal text-slate-500">
                          {percent}%
                        </span>
                      </span>
                    </div>
                  );
                })}
                {totalOrders === 0 ? (
                  <p className="py-2 text-center text-sm text-slate-400">
                    {t("merchant.dashboard.noOrderData")}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="order-1 rounded-2xl border border-gray-500 bg-white/[0.04] p-5 backdrop-blur">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={18} className="text-cyan-300" />
                    <h3 className="text-base font-bold text-white">
                      {t("merchant.dashboard.revenueByDay")}
                    </h3>
                  </div>
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-300">
                    {selectedMonthLabel} · {formatCurrency(totalMonthRevenue)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-400">
                  {t("merchant.dashboard.revenueByDayDesc")}
                </p>
              </div>
              {renderPeriodFilter()}
            </div>

            <div className="relative h-64 w-full sm:h-80">
              <svg
                viewBox={`0 0 ${chart.W} ${chart.H}`}
                preserveAspectRatio="none"
                className="h-full w-full"
                role="img"
                aria-label={t("merchant.dashboard.chartAria")}
              >
                <defs>
                  <linearGradient id="revArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.55" />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="revLine" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#c4b5fd" />
                    <stop offset="55%" stopColor="#a78bfa" />
                    <stop offset="100%" stopColor="#22d3ee" />
                  </linearGradient>
                  <clipPath id="revPlotClip">
                    <rect
                      x={chart.PAD_L}
                      y={chart.PAD_T - 12}
                      width={chart.W - chart.PAD_L - chart.PAD_R}
                      height={chart.H - chart.PAD_T - chart.PAD_B + 12}
                    />
                  </clipPath>
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
                        stroke="rgba(255,255,255,0.24)"
                        strokeWidth="1"
                        strokeDasharray={
                          i === chart.yTicks.length - 1 ? "0" : "4 4"
                        }
                      />
                      <text
                        x={chart.PAD_L - 12}
                        y={y + 4}
                        textAnchor="end"
                        fill="#b6b2cf"
                        className="text-[10px] font-medium"
                      >
                        {compactCurrency(tick)}
                      </text>
                    </g>
                  );
                })}
                {chart.points.length > 1 ? (
                  <g clipPath="url(#revPlotClip)">
                    <path d={chart.areaPath} fill="url(#revArea)" />
                    <path
                      d={chart.linePath}
                      fill="none"
                      stroke="url(#revLine)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                ) : null}
                {hoveredPoint ? (
                  <line
                    x1={hoveredPoint.x}
                    x2={hoveredPoint.x}
                    y1={chart.PAD_T}
                    y2={chart.H - chart.PAD_B}
                    stroke="rgba(255,255,255,0.32)"
                    strokeWidth="1.5"
                    strokeDasharray="4 5"
                  />
                ) : null}
                {chart.points.map((point, index) => {
                  const active = hoveredIndex === index;
                  return (
                    <g key={point.date}>
                      {active ? (
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r={11}
                          fill="#c4b5fd"
                          opacity={0.2}
                        />
                      ) : null}
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r={active ? 5.5 : 4}
                        fill={active ? "#ffffff" : "#151329"}
                        stroke={active ? "#ffffff" : "#c4b5fd"}
                        strokeWidth={2.2}
                      />
                      {index % chart.labelEvery === 0 ? (
                        <text
                          x={point.x}
                          y={chart.H - chart.PAD_B + 22}
                          textAnchor="middle"
                          fill="#b6b2cf"
                          className="text-[11px] font-medium"
                        >
                          {point.day}
                        </text>
                      ) : null}
                    </g>
                  );
                })}
                <rect
                  x={chart.PAD_L}
                  y={chart.PAD_T}
                  width={chart.W - chart.PAD_L - chart.PAD_R}
                  height={chart.H - chart.PAD_T - chart.PAD_B}
                  fill="transparent"
                  onPointerMove={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    const x =
                      chart.PAD_L +
                      ((event.clientX - rect.left) / rect.width) *
                        (chart.W - chart.PAD_L - chart.PAD_R);
                    let nearest = 0;
                    let best = Number.POSITIVE_INFINITY;
                    chart.points.forEach((point, index) => {
                      const distance = Math.abs(point.x - x);
                      if (distance < best) {
                        best = distance;
                        nearest = index;
                      }
                    });
                    const threshold =
                      chartPointSpacing > 0 ? chartPointSpacing * 0.4 : 12;
                    setHoveredIndex(best <= threshold ? nearest : null);
                  }}
                  onPointerLeave={() => setHoveredIndex(null)}
                />
              </svg>

              {hoveredPoint ? (
                <div
                  className="pointer-events-none absolute z-20 whitespace-nowrap rounded-xl border border-white/15 bg-[#1b1735]/95 px-3 py-2 text-xs shadow-2xl shadow-black/30 backdrop-blur"
                  style={{
                    left: `${hoveredLeft}%`,
                    top: `${(hoveredPoint.y / chart.H) * 100}%`,
                    transform:
                      hoveredPoint.y < chart.H * 0.35
                        ? "translate(-50%, 16px)"
                        : "translate(-50%, calc(-100% - 16px))",
                  }}
                >
                  <p className="font-semibold text-white">
                    {t("merchant.dashboard.dayLabel", {
                      day: hoveredPoint.day,
                    })}
                  </p>
                  <p className="mt-0.5 font-bold text-emerald-300">
                    {formatCurrency(hoveredPoint.revenue)}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {t("merchant.dashboard.ordersLabel", {
                      count: hoveredPoint.orders,
                    })}
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="order-3 rounded-2xl border border-gray-500 bg-white/[0.04] p-5 backdrop-blur">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <RotateCcw size={18} className="text-rose-300" />
                <h3 className="text-base font-bold text-white">
                  {t("merchant.dashboard.returnsTitle")}
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {renderPeriodFilter()}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-gray-600 bg-white/[0.03] p-3.5">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Inbox size={14} className="text-purple-300" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider">
                    {t("merchant.dashboard.returnsRequests")}
                  </span>
                </div>
                <p className="mt-2 text-xl font-extrabold text-white">
                  {returnSummary?.requests ?? 0}
                </p>
              </div>
              <div className="rounded-xl border border-gray-600 bg-white/[0.03] p-3.5">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <BadgeCheck size={14} className="text-amber-300" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider">
                    {t("merchant.dashboard.returnsApproved")}
                  </span>
                </div>
                <p className="mt-2 text-xl font-extrabold text-white">
                  {returnSummary?.approved ?? 0}
                </p>
              </div>
              <div className="rounded-xl border border-gray-600 bg-white/[0.03] p-3.5">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <RotateCcw size={14} className="text-rose-300" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider">
                    {t("merchant.dashboard.returnsRefund")}
                  </span>
                </div>
                <p
                  className="mt-2 truncate text-xl font-extrabold text-white"
                  title={formatCurrency(monthRefundTotal)}
                >
                  {formatCompactMoney(
                    monthRefundTotal,
                    locale,
                    t("merchant.dashboard.currencyBillion"),
                    t("merchant.dashboard.currencyMillion"),
                  )}
                </p>
              </div>
            </div>
          </div>
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
