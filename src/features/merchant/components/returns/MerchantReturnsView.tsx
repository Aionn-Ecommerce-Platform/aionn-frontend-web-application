"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Loader2,
  PackageX,
  RotateCcw,
  Search,
  XCircle,
} from "lucide-react";
import AuthGuard from "@/components/auth/AuthGuard";
import { useTranslation } from "@/hooks";
import { Pagination } from "@/shared/ui";
import { orderReturnService } from "@/lib/services";
import {
  RETURN_REASON_TYPES,
  returnReasonLabelKey,
} from "@/lib/domain/return-reasons";
import type { OrderReturn, ReturnReasonType } from "@/types";
import {
  ApproveModal,
  ReceiveModal,
  RejectModal,
  ReturnDetailModal,
  ReturnRow,
} from "./ReturnParts";

const TAB_KEYS = [
  "all",
  "REQUESTED",
  "APPROVED",
  "ITEM_RECEIVED",
  "REJECTED",
] as const;
const TAB_MESSAGE_KEYS = {
  all: "all",
  REQUESTED: "requested",
  APPROVED: "approved",
  ITEM_RECEIVED: "itemReceived",
  REJECTED: "rejected",
} as const;

type ReturnTabKey = (typeof TAB_KEYS)[number];

function ReturnStatusDropdown({
  value,
  counts,
  onChange,
}: {
  value: ReturnTabKey;
  counts: Record<ReturnTabKey, number>;
  onChange: (value: ReturnTabKey) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 rounded-xl border border-gray-500 bg-white/5 px-3.5 py-2.5 text-sm font-medium text-slate-200 shadow-sm transition-all hover:border-gray-400 hover:bg-white/10 focus:border-purple-400/70 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
        aria-expanded={open}
      >
        <span className="text-slate-400">
          {t("merchant.returns.statusFilterLabel")}:
        </span>
        <span>{t(`merchant.returns.tabs.${TAB_MESSAGE_KEYS[value]}`)}</span>
        <ChevronDown
          size={14}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-gray-500 bg-console-panel-raised py-1 shadow-2xl shadow-black/40">
          {TAB_KEYS.map((key) => {
            const active = value === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  onChange(key);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-purple-500/20 font-semibold text-purple-200"
                    : "text-slate-300 hover:bg-white/5"
                }`}
              >
                <span className="truncate">
                  {t(`merchant.returns.tabs.${TAB_MESSAGE_KEYS[key]}`)}
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <span
                    className={active ? "text-purple-200" : "text-slate-500"}
                  >
                    ({counts[key] ?? 0})
                  </span>
                  {active && (
                    <Check size={14} className="shrink-0 text-purple-300" />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ReasonDropdown({
  value,
  onChange,
}: {
  value: "all" | ReturnReasonType;
  onChange: (value: "all" | ReturnReasonType) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const options: Array<{ value: "all" | ReturnReasonType; label: string }> = [
    { value: "all", label: t("orders.returns.allReasonTypes") },
    ...RETURN_REASON_TYPES.map((type) => ({
      value: type,
      label: t(returnReasonLabelKey(type)),
    })),
  ];

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 rounded-xl border border-gray-500 bg-white/5 px-3.5 py-2.5 text-sm font-medium text-slate-200 shadow-sm transition-all hover:border-gray-400 hover:bg-white/10 focus:border-purple-400/70 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
        aria-expanded={open}
      >
        <span className="text-slate-400">
          {t("orders.returns.reasonType")}:
        </span>
        <span className="max-w-[180px] truncate">
          {options.find((option) => option.value === value)?.label}
        </span>
        <ChevronDown
          size={14}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-2 max-h-72 w-64 overflow-y-auto rounded-xl border border-gray-500 bg-console-panel-raised py-1 shadow-2xl shadow-black/40">
          {options.map((option) => {
            const active = value === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-purple-500/20 font-semibold text-purple-200"
                    : "text-slate-300 hover:bg-white/5"
                }`}
              >
                <span className="truncate">{option.label}</span>
                {active && (
                  <Check size={14} className="ml-2 shrink-0 text-purple-300" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MerchantReturnsInner() {
  const { t, locale } = useTranslation();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<ReturnTabKey>("REQUESTED");
  const [reasonFilter, setReasonFilter] = useState<"all" | ReturnReasonType>(
    "all",
  );
  const [search, setSearch] = useState("");
  const [approving, setApproving] = useState<OrderReturn | null>(null);
  const [rejecting, setRejecting] = useState<OrderReturn | null>(null);
  const [receiving, setReceiving] = useState<OrderReturn | null>(null);
  const [detailItem, setDetailItem] = useState<OrderReturn | null>(null);
  const PAGE_SIZE = 10;
  const filterKey = [search, tab, reasonFilter].join("|");
  const [pageState, setPageState] = useState({ key: filterKey, page: 1 });
  const page = pageState.key === filterKey ? pageState.page : 1;
  const setPage = (next: number) =>
    setPageState({ key: filterKey, page: next });

  const {
    data: returnPage,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["merchant-returns", page, tab, reasonFilter, search.trim()],
    queryFn: () =>
      orderReturnService.listForMerchant({
        status: tab === "all" ? undefined : tab,
        reasonType: reasonFilter === "all" ? undefined : reasonFilter,
        search: search.trim() || undefined,
        page: page - 1,
        limit: PAGE_SIZE,
      }),
    retry: false,
  });
  const returns = returnPage?.content ?? [];
  const totalPages = returnPage?.totalPages ?? 1;
  const safePage = Math.min(page, totalPages);

  const { data: statsData } = useQuery({
    queryKey: ["merchant-return-stats"],
    queryFn: () => orderReturnService.merchantReturnStats(),
  });
  const numberFormat = new Intl.NumberFormat(
    locale === "vi" ? "vi-VN" : "en-US",
  );
  const countStatus = (...statuses: string[]) =>
    statuses.reduce((sum, status) => sum + (statsData?.[status] ?? 0), 0);
  const totalReturns = Object.values(statsData ?? {}).reduce(
    (sum, value) => sum + value,
    0,
  );
  const returnStats = [
    {
      label: t("merchant.returns.stats.total"),
      value: numberFormat.format(totalReturns),
      icon: RotateCcw,
      iconClass: "text-rose-300",
    },
    {
      label: t("merchant.returns.stats.requested"),
      value: numberFormat.format(countStatus("REQUESTED")),
      icon: Clock3,
      iconClass: "text-amber-300",
    },
    {
      label: t("merchant.returns.stats.approved"),
      value: numberFormat.format(countStatus("APPROVED")),
      icon: CheckCircle2,
      iconClass: "text-emerald-300",
    },
    {
      label: t("merchant.returns.stats.itemReceived"),
      value: numberFormat.format(countStatus("ITEM_RECEIVED")),
      icon: PackageX,
      iconClass: "text-sky-300",
    },
    {
      label: t("merchant.returns.stats.rejected"),
      value: numberFormat.format(countStatus("REJECTED")),
      icon: XCircle,
      iconClass: "text-slate-300",
    },
  ];
  const returnCounts: Record<ReturnTabKey, number> = {
    all: totalReturns,
    REQUESTED: statsData?.REQUESTED ?? 0,
    APPROVED: statsData?.APPROVED ?? 0,
    ITEM_RECEIVED: statsData?.ITEM_RECEIVED ?? 0,
    REJECTED: statsData?.REJECTED ?? 0,
  };
  const hasFilters = Boolean(search || tab !== "all" || reasonFilter !== "all");
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["merchant-returns"] });
    queryClient.invalidateQueries({ queryKey: ["merchant-return-stats"] });
  };

  let content: ReactNode;
  if (isError) {
    content = (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-600 bg-white/[0.03] px-6 py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-300">
          <AlertCircle size={32} />
        </div>
        <h3 className="text-lg font-semibold text-white">
          {t("common.error")}
        </h3>
        <p className="mt-1 text-sm text-slate-400">{t("common.tryAgain")}</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-6 rounded-xl border border-gray-500 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/10"
        >
          {t("common.retry")}
        </button>
      </div>
    );
  } else if (isLoading) {
    content = (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-purple-400" size={28} />
      </div>
    );
  } else if (returns.length === 0) {
    content = (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-600 bg-white/[0.03] px-6 py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/15 text-purple-300">
          <PackageX size={34} />
        </div>
        <h3 className="text-lg font-semibold text-white">
          {t(
            hasFilters
              ? "merchant.returns.emptyFilteredTitle"
              : "merchant.returns.emptyTitle",
          )}
        </h3>
        <p className="mt-1 max-w-sm text-sm text-slate-400">
          {t(
            hasFilters
              ? "merchant.returns.emptyFilteredDesc"
              : tab === "REQUESTED"
                ? "merchant.returns.emptyDescRequested"
                : "merchant.returns.emptyDescOther",
          )}
        </p>
        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setTab("all");
              setReasonFilter("all");
            }}
            className="mt-6 rounded-xl border border-gray-500 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/10"
          >
            {t("merchant.returns.clearFilters")}
          </button>
        )}
      </div>
    );
  } else {
    content = (
      <div className="overflow-hidden rounded-2xl border border-gray-600 bg-white/[0.04]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-600/60 bg-white/[0.03]">
                <th className="whitespace-nowrap px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {t("merchant.returns.colReturn")}
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {t("merchant.returns.colRequestedAt")}
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {t("merchant.returns.colReason")}
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {t("merchant.returns.colRefund")}
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {t("merchant.returns.colStatus")}
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {t("merchant.returns.colActions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {returns.map((item) => (
                <ReturnRow
                  key={item.returnId}
                  rtn={item}
                  onApprove={() => setApproving(item)}
                  onReject={() => setRejecting(item)}
                  onReceive={() => setReceiving(item)}
                  onDetail={() => setDetailItem(item)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl bg-console-panel p-4 text-white shadow-2xl shadow-purple-950/30 sm:p-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
        <div className="absolute -left-28 -top-28 h-80 w-80 rounded-full bg-purple-600/20 blur-3xl" />
        <div className="absolute -right-24 top-1/4 h-72 w-72 rounded-full bg-fuchsia-600/10 blur-3xl" />
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
        <div className="mb-6">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
              <RotateCcw size={22} className="text-rose-300" />
              <span className="text-purple-300">
                {t("merchant.returns.title")}
              </span>
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {t("merchant.returns.subtitle")}
            </p>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
          {returnStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="flex items-center gap-3 rounded-2xl border border-gray-600 bg-white/[0.04] p-3.5"
              >
                <Icon
                  size={24}
                  strokeWidth={2.2}
                  className={`shrink-0 ${stat.iconClass}`}
                />
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    {stat.label}
                  </p>
                  <p className="truncate text-xl font-extrabold text-white">
                    {stat.value}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {!isError && (
          <div className="relative z-30 mb-5 flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-64 flex-1">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                size={17}
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("merchant.returns.searchPlaceholder")}
                className="w-full rounded-xl border border-gray-500 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-purple-400/70 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
              />
            </div>
            <ReturnStatusDropdown
              value={tab}
              counts={returnCounts}
              onChange={setTab}
            />
            <ReasonDropdown value={reasonFilter} onChange={setReasonFilter} />
          </div>
        )}
        {content}
        <Pagination
          currentPage={safePage}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>

      {approving && (
        <ApproveModal
          rtn={approving}
          onClose={() => setApproving(null)}
          onSuccess={() => {
            refresh();
            setApproving(null);
          }}
        />
      )}
      {rejecting && (
        <RejectModal
          rtn={rejecting}
          onClose={() => setRejecting(null)}
          onSuccess={() => {
            refresh();
            setRejecting(null);
          }}
        />
      )}
      {receiving && (
        <ReceiveModal
          rtn={receiving}
          onClose={() => setReceiving(null)}
          onSuccess={() => {
            refresh();
            setReceiving(null);
          }}
        />
      )}
      {detailItem && (
        <ReturnDetailModal
          rtn={detailItem}
          onClose={() => setDetailItem(null)}
        />
      )}
    </div>
  );
}

export default function MerchantReturnsPage() {
  return (
    <AuthGuard requiredRoles={["MERCHANT"]}>
      <MerchantReturnsInner />
    </AuthGuard>
  );
}
