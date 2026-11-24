"use client";

import { useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
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
import { ConsoleFilterDropdown } from "../shared/ConsoleFilterDropdown";
import { ConsoleStatGrid } from "../shared/ConsoleStatGrid";
import { ConsoleEmptyState } from "../shared/ConsoleShell";
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
  ReturnPickupModal,
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
  const [pickupFor, setPickupFor] = useState<OrderReturn | null>(null);
  const [detailItem, setDetailItem] = useState<OrderReturn | null>(null);
  const PAGE_SIZE = 10;
  const filterKey = [search, tab, reasonFilter].join("|");
  const [pageState, setPageState] = useState({ key: filterKey, page: 1 });
  const page = pageState.key === filterKey ? pageState.page : 1;
  const resetPage = () => setPageState((prev) => ({ ...prev, page: 1 }));
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
  if (returnPage && page > safePage) {
    setPageState({ key: filterKey, page: safePage });
  }

  const { data: statsData, isError: statsError } = useQuery({
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
  const formatStat = (value: number) =>
    statsError ? "—" : numberFormat.format(value);

  const returnStats = [
    {
      label: t("merchant.returns.stats.total"),
      value: formatStat(totalReturns),
      icon: RotateCcw,
      iconClass: "text-rose-300",
    },
    {
      label: t("merchant.returns.stats.requested"),
      value: formatStat(countStatus("REQUESTED")),
      icon: Clock3,
      iconClass: "text-amber-300",
    },
    {
      label: t("merchant.returns.stats.approved"),
      value: formatStat(countStatus("APPROVED")),
      icon: CheckCircle2,
      iconClass: "text-emerald-300",
    },
    {
      label: t("merchant.returns.stats.itemReceived"),
      value: formatStat(countStatus("ITEM_RECEIVED")),
      icon: PackageX,
      iconClass: "text-sky-300",
    },
    {
      label: t("merchant.returns.stats.rejected"),
      value: formatStat(countStatus("REJECTED")),
      icon: XCircle,
      iconClass: "text-slate-300",
    },
  ];
  const returnCounts: Record<ReturnTabKey, number | undefined> = {
    all: totalReturns,
    REQUESTED: statsError ? undefined : (statsData?.REQUESTED ?? 0),
    APPROVED: statsError ? undefined : (statsData?.APPROVED ?? 0),
    ITEM_RECEIVED: statsError ? undefined : (statsData?.ITEM_RECEIVED ?? 0),
    REJECTED: statsError ? undefined : (statsData?.REJECTED ?? 0),
  };
  const hasFilters = Boolean(search || tab !== "all" || reasonFilter !== "all");
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["merchant-returns"] });
    queryClient.invalidateQueries({ queryKey: ["merchant-return-stats"] });
  };

  let content: ReactNode;
  if (isError) {
    content = (
      <ConsoleEmptyState
        icon={AlertCircle}
        iconClassName="text-rose-300"
        title={t("common.error")}
        description={t("common.tryAgain")}
      >
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded-xl border border-gray-500 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/10"
        >
          {t("common.retry")}
        </button>
      </ConsoleEmptyState>
    );
  } else if (isLoading) {
    content = (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-purple-400" size={28} />
      </div>
    );
  } else if (returns.length === 0) {
    content = (
      <ConsoleEmptyState
        icon={PackageX}
        title={t(
          hasFilters
            ? "merchant.returns.emptyFilteredTitle"
            : "merchant.returns.emptyTitle",
        )}
        description={t(
          hasFilters
            ? "merchant.returns.emptyFilteredDesc"
            : tab === "REQUESTED"
              ? "merchant.returns.emptyDescRequested"
              : "merchant.returns.emptyDescOther",
        )}
      >
        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setTab("all");
              setReasonFilter("all");
              resetPage();
            }}
            className="rounded-xl border border-gray-500 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/10"
          >
            {t("merchant.returns.clearFilters")}
          </button>
        )}
      </ConsoleEmptyState>
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
                  onPickup={() => setPickupFor(item)}
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
          </div>
        </div>

        <ConsoleStatGrid
          stats={returnStats}
          columnsClassName="lg:grid-cols-5"
        />

        {!isError && (
          <div className="relative z-30 mb-5 flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-64 flex-1">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                size={17}
              />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  resetPage();
                }}
                placeholder={t("merchant.returns.searchPlaceholder")}
                className="w-full rounded-xl border border-gray-500 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-purple-400/70 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
              />
            </div>
            <ConsoleFilterDropdown
              label={t("merchant.returns.statusFilterLabel")}
              value={tab}
              options={TAB_KEYS.map((key) => ({
                value: key,
                label: t(`merchant.returns.tabs.${TAB_MESSAGE_KEYS[key]}`),
                count: returnCounts[key],
              }))}
              onChange={(value) => {
                setTab(value);
                resetPage();
              }}
              menuClassName="w-56"
            />
            <ConsoleFilterDropdown
              label={t("orders.returns.reasonType")}
              value={reasonFilter}
              options={[
                { value: "all", label: t("orders.returns.allReasonTypes") },
                ...RETURN_REASON_TYPES.map((type) => ({
                  value: type,
                  label: t(returnReasonLabelKey(type)),
                })),
              ]}
              onChange={(value) => {
                setReasonFilter(value);
                resetPage();
              }}
              menuClassName="w-48"
            />
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
      {pickupFor && (
        <ReturnPickupModal
          rtn={pickupFor}
          onClose={() => setPickupFor(null)}
          onSuccess={refresh}
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
