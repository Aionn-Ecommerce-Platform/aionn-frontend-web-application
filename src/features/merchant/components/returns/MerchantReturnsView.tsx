"use client";

import { useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Loader2, PackageX, RotateCcw } from "lucide-react";
import AuthGuard from "@/components/auth/AuthGuard";
import { useTranslation } from "@/hooks";
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
  ReturnCard,
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

function MerchantReturnsInner() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<(typeof TAB_KEYS)[number]>("REQUESTED");
  const [reasonFilter, setReasonFilter] = useState<"all" | ReturnReasonType>(
    "all",
  );
  const [approving, setApproving] = useState<OrderReturn | null>(null);
  const [rejecting, setRejecting] = useState<OrderReturn | null>(null);
  const [receiving, setReceiving] = useState<OrderReturn | null>(null);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["merchant-returns"],
    queryFn: () => orderReturnService.listForMerchant(100),
    retry: false,
  });
  const returns = data ?? [];
  const filtered = returns.filter(
    (item) =>
      (tab === "all" || item.status === tab) &&
      (reasonFilter === "all" || item.reasonType === reasonFilter),
  );
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["merchant-returns"] });

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
  } else if (filtered.length === 0) {
    content = (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-600 bg-white/[0.03] px-6 py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/15 text-purple-300">
          <PackageX size={34} />
        </div>
        <h3 className="text-lg font-semibold text-white">
          {t("merchant.returns.emptyTitle")}
        </h3>
        <p className="mt-1 max-w-sm text-sm text-slate-400">
          {t(
            tab === "REQUESTED"
              ? "merchant.returns.emptyDescRequested"
              : "merchant.returns.emptyDescOther",
          )}
        </p>
      </div>
    );
  } else {
    content = (
      <div className="space-y-3">
        {filtered.map((item) => (
          <ReturnCard
            key={item.returnId}
            rtn={item}
            onApprove={() => setApproving(item)}
            onReject={() => setRejecting(item)}
            onReceive={() => setReceiving(item)}
          />
        ))}
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
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
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
          <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-300">
            {t("merchant.orders.resultCount", { count: filtered.length })}
          </span>
        </div>

        {!isError && (
          <div className="relative z-30 mb-5 flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
              {TAB_KEYS.map((key) => {
                const count =
                  key === "all"
                    ? returns.length
                    : returns.filter((item) => item.status === key).length;
                return (
                  <button
                    key={key}
                    onClick={() => setTab(key)}
                    className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-semibold transition-all duration-150 sm:text-sm ${
                      tab === key
                        ? "border-purple-500 bg-purple-600 text-white shadow-md shadow-purple-900/40"
                        : "border-gray-600 bg-white/5 text-slate-300 hover:border-gray-400 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {t(`merchant.returns.tabs.${TAB_MESSAGE_KEYS[key]}`)}
                    {count > 0 && (
                      <span
                        className={`ml-1.5 text-xs ${
                          tab === key ? "text-purple-100" : "text-slate-500"
                        }`}
                      >
                        ({count})
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <select
              value={reasonFilter}
              onChange={(e) =>
                setReasonFilter(e.target.value as "all" | ReturnReasonType)
              }
              className="ml-auto shrink-0 rounded-xl border border-gray-500 bg-white/5 px-3 py-2.5 text-xs font-medium text-slate-200 focus:border-purple-400/70 focus:outline-none focus:ring-2 focus:ring-purple-500/30 [&>option]:bg-console-panel-raised [&>option]:text-white"
              aria-label={t("orders.returns.reasonType")}
            >
              <option value="all">{t("orders.returns.allReasonTypes")}</option>
              {RETURN_REASON_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(returnReasonLabelKey(type))}
                </option>
              ))}
            </select>
          </div>
        )}
        {content}
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
