"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ListChecks,
  MessageSquare,
  PackageX,
  ShieldCheck,
  Store,
  TrendingUp,
  Users,
} from "lucide-react";
import AuthGuard from "@/components/auth/AuthGuard";
import { AdminHeader } from "@/features/admin";
import { PeriodDropdown } from "@/shared/ui";
import {
  adminAnalyticsService,
  adminOrderReturnService,
  productService,
} from "@/lib/services";
import { smoothPath } from "@/shared/lib/chart-utils";
import { useTranslation } from "@/hooks";

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

function AdminDashboardInner() {
  const { t, locale } = useTranslation();
  const [now] = useState(() => new Date());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const yearOptions = useMemo(() => {
    const opts: { value: number; label: string }[] = [];
    for (let year = currentYear - 1; year <= currentYear; year += 1) {
      opts.push({ value: year, label: String(year) });
    }
    return opts;
  }, [currentYear]);

  const monthFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: "long" }),
    [locale],
  );

  const monthOptions = useMemo(() => {
    const endMonth = selectedYear === currentYear ? currentMonth : 11;
    const opts: { value: number; label: string }[] = [];
    for (let month = 0; month <= endMonth; month += 1) {
      opts.push({
        value: month,
        label: monthFormatter.format(new Date(selectedYear, month, 1)),
      });
    }
    return opts;
  }, [selectedYear, currentYear, currentMonth, monthFormatter]);

  useEffect(() => {
    if (!monthOptions.some((option) => option.value === selectedMonth)) {
      queueMicrotask(() =>
        setSelectedMonth(monthOptions[monthOptions.length - 1]?.value ?? 0),
      );
    }
  }, [monthOptions, selectedMonth]);

  const range = useMemo(() => {
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const from = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-01`;
    const to = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    return { from, to };
  }, [selectedYear, selectedMonth]);

  const numberFormat = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const compactFormat = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        notation: "compact",
        maximumFractionDigits: 1,
      }),
    [locale],
  );

  const { data: users } = useQuery({
    queryKey: ["admin-dashboard-users", range],
    queryFn: () => adminAnalyticsService.users(range),
  });
  const { data: merchants } = useQuery({
    queryKey: ["admin-dashboard-merchants", range],
    queryFn: () => adminAnalyticsService.merchants(range),
  });
  const { data: kyc } = useQuery({
    queryKey: ["admin-dashboard-kyc", range],
    queryFn: () => adminAnalyticsService.kyc(range),
  });
  const { data: feedbacks } = useQuery({
    queryKey: ["admin-dashboard-feedbacks", range],
    queryFn: () => adminAnalyticsService.feedbacks(range),
  });
  const { data: pendingReturns } = useQuery({
    queryKey: ["admin-dashboard-returns"],
    queryFn: () => adminOrderReturnService.listByStatus("REQUESTED", 100),
  });
  const { data: pendingProducts } = useQuery({
    queryKey: ["admin-dashboard-products"],
    queryFn: () => productService.listPendingReviews({ page: 0, size: 1 }),
  });

  const series = useMemo(() => {
    const userMap = new Map(
      (users?.signupTrend ?? []).map((point) => [point.date, point.count]),
    );
    const merchantMap = new Map(
      (merchants?.signupTrend ?? []).map((point) => [point.date, point.count]),
    );
    const days: string[] = [];
    const cursor = new Date(`${range.from}T00:00:00Z`);
    const end = new Date(`${range.to}T00:00:00Z`);
    while (cursor <= end) {
      days.push(cursor.toISOString().slice(0, 10));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return days.map((date) => ({
      date,
      users: userMap.get(date) ?? 0,
      merchants: merchantMap.get(date) ?? 0,
    }));
  }, [users?.signupTrend, merchants?.signupTrend, range]);

  const newUsers = series.reduce((sum, point) => sum + point.users, 0);
  const newMerchants = series.reduce((sum, point) => sum + point.merchants, 0);
  const kycPending = (kyc?.pending ?? 0) + (kyc?.submitted ?? 0);

  const stats = [
    {
      label: t("adminDashboard.statUsers"),
      value: numberFormat.format(users?.totalUsers ?? 0),
      icon: Users,
      cardClass:
        "from-violet-500 via-violet-500 to-violet-300 shadow-purple-900/40",
      spark: series.map((point) => point.users),
    },
    {
      label: t("adminDashboard.statMerchants"),
      value: numberFormat.format(merchants?.total ?? 0),
      icon: Store,
      cardClass: "from-cyan-500 via-cyan-400 to-cyan-300 shadow-cyan-900/40",
      spark: series.map((point) => point.merchants),
    },
    {
      label: t("adminDashboard.statKyc"),
      value: numberFormat.format(kycPending),
      icon: ShieldCheck,
      cardClass: "from-rose-500 via-rose-400 to-orange-300 shadow-rose-900/40",
      spark: undefined,
    },
    {
      label: t("adminDashboard.statFeedback"),
      value: numberFormat.format(feedbacks?.open ?? 0),
      icon: MessageSquare,
      cardClass:
        "from-violet-400 via-violet-400 to-purple-300 shadow-indigo-900/40",
      spark: undefined,
    },
  ];

  const chart = useMemo(() => {
    const W = 720;
    const H = 300;
    const PAD_L = 56;
    const PAD_R = 24;
    const PAD_T = 32;
    const PAD_B = 44;
    const peakValue = Math.max(
      1,
      ...series.map((point) => point.users),
      ...series.map((point) => point.merchants),
    );
    const span = series.length > 1 ? series.length - 1 : 1;
    const points = series.map((item, index) => {
      const x = PAD_L + (index / span) * (W - PAD_L - PAD_R);
      const yUsers = PAD_T + (1 - item.users / peakValue) * (H - PAD_T - PAD_B);
      const yMerchants =
        PAD_T + (1 - item.merchants / peakValue) * (H - PAD_T - PAD_B);
      return { ...item, x, yUsers, yMerchants };
    });
    const usersPath = smoothPath(
      points.map((point) => ({ x: point.x, y: point.yUsers })),
    );
    const merchantsPath = smoothPath(
      points.map((point) => ({ x: point.x, y: point.yMerchants })),
    );
    const labelEvery = Math.max(1, Math.ceil(points.length / 8));
    return {
      W,
      H,
      PAD_L,
      PAD_R,
      PAD_T,
      PAD_B,
      peakValue,
      points,
      usersPath,
      merchantsPath,
      labelEvery,
    };
  }, [series]);

  const hoveredPoint =
    hoveredIndex != null ? chart.points[hoveredIndex] : undefined;
  const hoveredLeft = hoveredPoint
    ? Math.min(88, Math.max(12, (hoveredPoint.x / chart.W) * 100))
    : 0;
  const chartPointSpacing =
    chart.points.length > 1 ? chart.points[1]!.x - chart.points[0]!.x : 0;
  const hasData = series.some(
    (point) => point.users > 0 || point.merchants > 0,
  );

  const formatDay = (date: string) =>
    new Date(`${date}T00:00:00Z`).toLocaleDateString(locale, {
      day: "2-digit",
      month: "2-digit",
    });

  const queue = [
    {
      label: t("adminDashboard.pendingKyc"),
      value: kycPending,
      href: "/admin/kyc",
      icon: ShieldCheck,
      iconClass: "text-amber-300",
    },
    {
      label: t("adminDashboard.newFeedback"),
      value: feedbacks?.open ?? 0,
      href: "/admin/feedbacks",
      icon: MessageSquare,
      iconClass: "text-sky-300",
    },
    {
      label: t("adminDashboard.pendingReturns"),
      value: pendingReturns?.length ?? 0,
      href: "/admin/orders/returns",
      icon: PackageX,
      iconClass: "text-rose-300",
    },
    {
      label: t("adminDashboard.pendingProducts"),
      value: pendingProducts?.totalElements ?? 0,
      href: "/admin/products/pending",
      icon: ListChecks,
      iconClass: "text-violet-300",
    },
  ];

  const roleLabel = (role: string) => {
    const key = role.replace("ROLE_", "");
    const labels: Record<string, string> = {
      BUYER: t("account.roles.BUYER"),
      MERCHANT: t("account.roles.MERCHANT"),
      CS_ADMIN: t("account.roles.CS_ADMIN"),
      SYSTEM_ADMIN: t("account.roles.SYSTEM_ADMIN"),
    };
    return labels[key] ?? key;
  };

  const roleRows = [...(users?.roleBreakdown ?? [])]
    .sort((a, b) => b.count - a.count)
    .map((row) => ({ ...row, label: roleLabel(row.role) }));
  const roleTotal = roleRows.reduce((sum, row) => sum + row.count, 0) || 1;

  return (
    <div className="min-h-screen">
      <AdminHeader icon={TrendingUp} title={t("adminDashboard.title")} />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((stat) => {
          const StatIcon = stat.icon;
          const spark = stat.spark ? buildSparkline(stat.spark) : null;
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
                <p className="mt-1 truncate text-lg font-extrabold tracking-tight text-white drop-shadow-sm sm:text-xl">
                  {stat.value}
                </p>
              </div>
              {spark && (
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
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-gray-500 bg-white/[0.04] p-5 backdrop-blur">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <TrendingUp size={18} className="text-cyan-300" />
                <h3 className="text-base font-bold text-white">
                  {t("adminDashboard.chartTitle")}
                </h3>
              </div>
              <span className="rounded-full border border-violet-400/25 bg-violet-400/10 px-3 py-1.5 text-xs font-bold text-violet-200">
                {t("adminDashboard.newUsersInRange", { count: newUsers })}
              </span>
              <span className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1.5 text-xs font-bold text-cyan-200">
                {t("adminDashboard.newMerchantsInRange", {
                  count: newMerchants,
                })}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PeriodDropdown
              label={t("merchant.dashboard.month")}
              value={selectedMonth}
              options={monthOptions}
              onChange={(value) => {
                setSelectedMonth(value);
                setHoveredIndex(null);
              }}
            />
            <PeriodDropdown
              label={t("merchant.dashboard.year")}
              value={selectedYear}
              options={yearOptions}
              onChange={(value) => {
                setSelectedYear(value);
                setHoveredIndex(null);
              }}
            />
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-4 text-xs font-semibold">
          <span className="flex items-center gap-1.5 text-violet-200">
            <span className="h-2.5 w-2.5 rounded-full bg-violet-400" />
            {t("adminDashboard.legendUsers")}
          </span>
          <span className="flex items-center gap-1.5 text-cyan-200">
            <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
            {t("adminDashboard.legendMerchants")}
          </span>
        </div>

        {!hasData ? (
          <p className="py-16 text-center text-sm text-slate-400">
            {t("adminDashboard.noChartData")}
          </p>
        ) : (
          <div className="relative h-64 w-full sm:h-80">
            <svg
              viewBox={`0 0 ${chart.W} ${chart.H}`}
              preserveAspectRatio="none"
              className="h-full w-full"
              role="img"
              aria-label={t("adminDashboard.chartAria")}
            >
              <defs>
                <linearGradient id="adminUsersLine" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#c4b5fd" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
                <linearGradient
                  id="adminMerchantsLine"
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="0"
                >
                  <stop offset="0%" stopColor="#67e8f9" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                const y =
                  chart.PAD_T + ratio * (chart.H - chart.PAD_T - chart.PAD_B);
                return (
                  <g key={ratio}>
                    <line
                      x1={chart.PAD_L}
                      x2={chart.W - chart.PAD_R}
                      y1={y}
                      y2={y}
                      stroke="rgba(255,255,255,0.24)"
                      strokeWidth="1"
                      strokeDasharray={index === 4 ? "0" : "4 4"}
                    />
                    <text
                      x={chart.PAD_L - 10}
                      y={y + 4}
                      textAnchor="end"
                      fill="#b6b2cf"
                      className="text-[10px] font-medium"
                    >
                      {compactFormat.format(
                        Math.round(chart.peakValue * (1 - ratio)),
                      )}
                    </text>
                  </g>
                );
              })}

              <path
                d={chart.usersPath}
                fill="none"
                stroke="url(#adminUsersLine)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={chart.merchantsPath}
                fill="none"
                stroke="url(#adminMerchantsLine)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

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
                      <>
                        <circle
                          cx={point.x}
                          cy={point.yUsers}
                          r={10}
                          fill="#c4b5fd"
                          opacity={0.2}
                        />
                        <circle
                          cx={point.x}
                          cy={point.yMerchants}
                          r={10}
                          fill="#67e8f9"
                          opacity={0.2}
                        />
                      </>
                    ) : null}
                    <circle
                      cx={point.x}
                      cy={point.yUsers}
                      r={active ? 5 : 3.5}
                      fill={active ? "#ffffff" : "#151329"}
                      stroke={active ? "#ffffff" : "#c4b5fd"}
                      strokeWidth={2}
                    />
                    <circle
                      cx={point.x}
                      cy={point.yMerchants}
                      r={active ? 5 : 3.5}
                      fill={active ? "#ffffff" : "#151329"}
                      stroke={active ? "#ffffff" : "#67e8f9"}
                      strokeWidth={2}
                    />
                    {index % chart.labelEvery === 0 ? (
                      <text
                        x={point.x}
                        y={chart.H - chart.PAD_B + 22}
                        textAnchor="middle"
                        fill="#b6b2cf"
                        className="text-[11px] font-medium"
                      >
                        {formatDay(point.date)}
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
                className="pointer-events-none absolute z-20 whitespace-nowrap rounded-xl border border-gray-500 bg-console-popover/95 px-3 py-2 text-xs shadow-2xl shadow-black/30 backdrop-blur"
                style={{
                  left: `${hoveredLeft}%`,
                  top: `${(Math.min(hoveredPoint.yUsers, hoveredPoint.yMerchants) / chart.H) * 100}%`,
                  transform:
                    Math.min(hoveredPoint.yUsers, hoveredPoint.yMerchants) <
                    chart.H * 0.35
                      ? "translate(-50%, 16px)"
                      : "translate(-50%, calc(-100% - 16px))",
                }}
              >
                <p className="font-semibold text-white">
                  {t("adminDashboard.dayLabel", {
                    date: formatDay(hoveredPoint.date),
                  })}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-violet-200">
                  <span className="h-2 w-2 rounded-full bg-violet-400" />
                  {t("adminDashboard.legendUsers")}:{" "}
                  <span className="font-semibold text-white">
                    {numberFormat.format(hoveredPoint.users)}
                  </span>
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-cyan-200">
                  <span className="h-2 w-2 rounded-full bg-cyan-400" />
                  {t("adminDashboard.legendMerchants")}:{" "}
                  <span className="font-semibold text-white">
                    {numberFormat.format(hoveredPoint.merchants)}
                  </span>
                </p>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-500 bg-white/[0.04] p-5 backdrop-blur">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-base font-bold text-white">
              <ListChecks size={18} className="text-violet-300" />
              {t("adminDashboard.queueTitle")}
            </h3>
            <span className="rounded-full border border-amber-400/30 bg-amber-400/15 px-2.5 py-1 text-[11px] font-bold text-amber-200">
              {numberFormat.format(
                queue.reduce((sum, item) => sum + item.value, 0),
              )}
            </span>
          </div>
          <div className="space-y-2">
            {queue.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-between rounded-xl border border-slate-600/60 bg-white/[0.04] px-4 py-3 transition-colors hover:border-purple-400/40 hover:bg-white/[0.06]"
                >
                  <span className="flex items-center gap-2 text-sm font-medium text-slate-200">
                    <Icon size={16} className={item.iconClass} />
                    {item.label}
                  </span>
                  <span className="text-lg font-extrabold text-white">
                    {numberFormat.format(item.value)}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-500 bg-white/[0.04] p-5 backdrop-blur">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-base font-bold text-white">
              <Users size={18} className="text-cyan-300" />
              {t("adminDashboard.rolesTitle")}
            </h3>
            <span className="rounded-full border border-emerald-400/30 bg-emerald-400/15 px-2.5 py-1 text-[11px] font-bold text-emerald-200">
              {numberFormat.format(users?.totalUsers ?? 0)}
            </span>
          </div>
          {roleRows.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">
              {t("adminDashboard.noChartData")}
            </p>
          ) : (
            <div className="space-y-3">
              {roleRows.map((row) => {
                const percent = Math.round((row.count / roleTotal) * 100);
                return (
                  <div key={row.role}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-200">
                        {row.label}
                      </span>
                      <span className="text-slate-400">
                        {numberFormat.format(row.count)} · {percent}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <AuthGuard requiredRoles={["SYSTEM_ADMIN", "CS_ADMIN"]}>
      <AdminDashboardInner />
    </AuthGuard>
  );
}
