"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowLeftRight,
  CheckCircle2,
  Loader2,
  Plus,
  XCircle,
} from "lucide-react";
import AuthGuard from "@/components/auth/AuthGuard";
import { Button, Pagination } from "@/shared/ui";
import { useTranslation } from "@/hooks";
import { stockTransferService, warehouseService } from "@/lib/services";
import type { StockTransfer, StockTransferStatus } from "@/types";
import { ConsoleFilterDropdown } from "../shared/ConsoleFilterDropdown";
import { ConsoleEmptyState, ConsolePanel } from "../shared/ConsoleShell";
import {
  CancelModal,
  CompleteModal,
  CreateTransferModal,
} from "./TransferParts";

type StatusFilter = StockTransferStatus | "all";

const STATUS_VARIANT: Record<StockTransferStatus, string> = {
  INITIATED: "border-sky-400/30 bg-sky-400/10 text-sky-300",
  IN_TRANSIT: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  COMPLETED: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  CANCELLED: "border-rose-400/30 bg-rose-400/10 text-rose-300",
};

function statusLabelKey(status: StockTransferStatus) {
  if (status === "COMPLETED") return "merchant.transfers.statusCompleted";
  if (status === "CANCELLED") return "merchant.transfers.statusCancelled";
  if (status === "IN_TRANSIT") return "merchant.transfers.statusInTransit";
  return "merchant.transfers.statusInitiated";
}

function MerchantTransfersInner() {
  const { t, locale } = useTranslation();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [completing, setCompleting] = useState<StockTransfer | null>(null);
  const [cancelling, setCancelling] = useState<StockTransfer | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const { data: warehousePage } = useQuery({
    queryKey: ["merchant-warehouses", "transfer-options"],
    queryFn: () => warehouseService.listMine({ limit: 100 }),
  });

  const {
    data: transferPage,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["merchant-transfers", page, statusFilter],
    queryFn: () =>
      stockTransferService.list({
        page: page - 1,
        size: PAGE_SIZE,
        status: statusFilter === "all" ? undefined : statusFilter,
      }),
  });

  const transfers = transferPage?.content ?? [];
  const totalPages = Math.max(1, transferPage?.totalPages ?? 1);
  const safePage = Math.min(page, totalPages);
  if (transferPage && page > safePage) {
    setPage(safePage);
  }

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["merchant-transfers"] });
  };

  let content;
  if (isLoading) {
    content = (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-purple-400" size={28} />
      </div>
    );
  } else if (isError) {
    content = (
      <ConsoleEmptyState
        icon={ArrowLeftRight}
        iconClassName="text-rose-300"
        title={t("common.error")}
        description={t("common.tryAgain")}
      >
        <button
          type="button"
          onClick={() => void refetch()}
          className="rounded-xl border border-gray-500 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/10"
        >
          {t("common.retry")}
        </button>
      </ConsoleEmptyState>
    );
  } else if (transfers.length === 0) {
    content = (
      <ConsoleEmptyState
        icon={ArrowLeftRight}
        title={t("merchant.transfers.historyEmptyTitle")}
        description={t("merchant.transfers.historyEmptyDescription")}
      >
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-purple-900/40 transition-all hover:from-purple-500 hover:to-fuchsia-500"
        >
          <Plus size={16} />
          {t("merchant.transfers.createBtn")}
        </button>
      </ConsoleEmptyState>
    );
  } else {
    content = (
      <div className="overflow-hidden rounded-2xl border border-gray-600 bg-white/[0.04]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-600/60 bg-white/[0.03]">
                {[
                  "merchant.transfers.colTransfer",
                  "merchant.transfers.colSku",
                  "merchant.transfers.colRoute",
                  "merchant.transfers.colQty",
                  "merchant.transfers.colStatus",
                  "merchant.transfers.colActions",
                ].map((key) => (
                  <th
                    key={key}
                    className="whitespace-nowrap px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                  >
                    {t(key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transfers.map((transfer) => (
                <tr
                  key={transfer.transferId}
                  className="border-b border-slate-600/60 transition-colors last:border-0 hover:bg-white/[0.04]"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-center">
                    <p className="font-mono text-[13px] font-semibold text-white">
                      {transfer.transferId}
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Intl.DateTimeFormat(
                        locale === "vi" ? "vi-VN" : "en-US",
                        { dateStyle: "short", timeStyle: "short" },
                      ).format(new Date(transfer.initiatedAt))}
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-center">
                    <span
                      className="block max-w-[220px] truncate font-mono text-xs text-slate-200"
                      title={transfer.skuId}
                    >
                      {transfer.skuId}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-slate-300">
                    <p className="font-mono">{transfer.fromWarehouseId}</p>
                    <p className="text-slate-500">↓</p>
                    <p className="font-mono">{transfer.toWarehouseId}</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-center text-sm font-semibold text-white">
                    {transfer.qty}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_VARIANT[transfer.status]}`}
                    >
                      {t(statusLabelKey(transfer.status))}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      {transfer.status === "INITIATED" ? (
                        <>
                          <button
                            type="button"
                            title={t("merchant.transfers.completeBtn")}
                            aria-label={t("merchant.transfers.completeBtn")}
                            onClick={() => setCompleting(transfer)}
                            className="rounded-lg p-1.5 text-emerald-300 transition-colors hover:text-emerald-200"
                          >
                            <CheckCircle2 size={15} />
                          </button>
                          <button
                            type="button"
                            title={t("merchant.transfers.cancelTransferBtn")}
                            aria-label={t("merchant.transfers.cancelTransferBtn")}
                            onClick={() => setCancelling(transfer)}
                            className="rounded-lg p-1.5 text-rose-300 transition-colors hover:text-rose-200"
                          >
                            <XCircle size={15} />
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-slate-500">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <ConsolePanel>
      <Link
        href="/merchant/inventory"
        className="group mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-400 transition-colors hover:text-white"
      >
        <ArrowLeft
          size={16}
          className="text-slate-500 transition-transform group-hover:-translate-x-0.5 group-hover:text-white"
        />
        {t("merchant.transfers.backToInventory")}
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
          <ArrowLeftRight size={22} className="text-purple-300" />
          <span className="text-purple-300">
            {t("merchant.transfers.title")}
          </span>
        </h1>
        <Button onClick={() => setCreating(true)}>
          <Plus size={16} className="mr-1.5" />
          {t("merchant.transfers.createBtn")}
        </Button>
      </div>

      <div className="relative z-30 mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-300">
          {t("merchant.transfers.historyTitle")}
        </p>
        <ConsoleFilterDropdown
          label={t("merchant.transfers.statusFilterLabel")}
          value={statusFilter}
          options={[
            { value: "all", label: t("merchant.transfers.statusAll") },
            {
              value: "INITIATED",
              label: t("merchant.transfers.statusInitiated"),
            },
            {
              value: "COMPLETED",
              label: t("merchant.transfers.statusCompleted"),
            },
            {
              value: "CANCELLED",
              label: t("merchant.transfers.statusCancelled"),
            },
          ]}
          onChange={(value) => {
            setStatusFilter(value as StatusFilter);
            setPage(1);
          }}
          menuClassName="w-48"
        />
      </div>

      {content}

      <Pagination
        currentPage={safePage}
        totalPages={totalPages}
        onPageChange={setPage}
      />

      {creating && (
        <CreateTransferModal
          warehouses={warehousePage?.content ?? []}
          onClose={() => setCreating(false)}
          onSuccess={() => {
            setCreating(false);
            setStatusFilter("all");
            setPage(1);
            refresh();
          }}
        />
      )}
      {completing && (
        <CompleteModal
          transfer={completing}
          onClose={() => setCompleting(null)}
          onSuccess={() => {
            setCompleting(null);
            refresh();
          }}
        />
      )}
      {cancelling && (
        <CancelModal
          transfer={cancelling}
          onClose={() => setCancelling(null)}
          onSuccess={() => {
            setCancelling(null);
            refresh();
          }}
        />
      )}
    </ConsolePanel>
  );
}

export default function MerchantTransfersPage() {
  return (
    <AuthGuard requiredRoles={["MERCHANT"]}>
      <MerchantTransfersInner />
    </AuthGuard>
  );
}
