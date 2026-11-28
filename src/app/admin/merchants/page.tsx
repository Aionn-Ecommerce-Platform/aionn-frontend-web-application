"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Eye,
  Loader2,
  Pause,
  Percent,
  Play,
  Store,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  Button,
  Modal,
  Input,
  Pagination,
  DefinitionRow as Row,
} from "@/shared/ui";
import {
  AdminEmpty,
  AdminHeader,
  AdminPill,
  AdminSearch,
  AdminStats,
  AdminTable,
  adminPrimaryClass,
  adminRow,
  adminTd,
  adminTh,
} from "@/features/admin";
import AuthGuard from "@/components/auth/AuthGuard";
import { merchantService } from "@/lib/services";
import { getErrorMessage } from "@/shared/lib/errors";
import { formatDateTime } from "@/shared/lib/utils";
import type { Merchant, MerchantStatus } from "@/types";
import { useDebounce, useTranslation } from "@/hooks";

const statusConfig: Record<
  MerchantStatus,
  { labelKey: string; tone: "success" | "warning" | "danger" }
> = {
  ACTIVE: { labelKey: "statuses.merchant.ACTIVE", tone: "success" },
  SUSPENDED: { labelKey: "statuses.merchant.SUSPENDED", tone: "warning" },
  CLOSED: { labelKey: "statuses.merchant.CLOSED", tone: "danger" },
};

type ActionType = "suspend" | "activate" | "close";

function AdminMerchantsInner() {
  const { t, locale } = useTranslation();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const size = 20;

  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [actionType, setActionType] = useState<ActionType | null>(null);
  const [reason, setReason] = useState("");
  const [commissionModal, setCommissionModal] = useState(false);
  const [commissionInput, setCommissionInput] = useState("");
  const [globalInput, setGlobalInput] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-merchant-list", { search: debouncedSearch, page }],
    queryFn: () =>
      merchantService.listPaged(page - 1, size, {
        search: debouncedSearch.trim() || undefined,
      }),
  });

  const merchants = data?.content ?? [];
  const totalElements = data?.totalElements ?? merchants.length;
  const totalPages = Math.max(1, data?.totalPages ?? 1);

  const { data: allMerchants } = useQuery({
    queryKey: ["admin-merchant-counts"],
    queryFn: () => merchantService.listPaged(0, 100),
  });
  const countByStatus = (status: MerchantStatus) =>
    (allMerchants?.content ?? []).filter((item) => item.status === status)
      .length;

  const openDetail = (target: Merchant) => {
    setMerchant(target);
    setDetailOpen(true);
  };

  const refreshList = () => {
    qc.invalidateQueries({ queryKey: ["admin-merchant-list"] });
    void refetch();
  };

  const suspendMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      merchantService.suspend(id, { reason }),
    onSuccess: (updated) => {
      setMerchant(updated);
      toast.success(t("adminMerchants.suspendSuccess"));
      refreshList();
      closeAction();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const activateMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      merchantService.activate(id, { reason }),
    onSuccess: (updated) => {
      setMerchant(updated);
      toast.success(t("adminMerchants.activateSuccess"));
      refreshList();
      closeAction();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const closeMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      merchantService.close(id, { reason }),
    onSuccess: (updated) => {
      setMerchant(updated);
      toast.success(t("adminMerchants.closeSuccess"));
      refreshList();
      closeAction();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  function closeAction() {
    setActionType(null);
    setReason("");
  }

  const commissionMutation = useMutation({
    mutationFn: (rate: number) =>
      merchantService.updateCommissionRate(merchant!.merchantId, rate),
    onSuccess: (updated) => {
      setMerchant(updated);
      setCommissionModal(false);
      setCommissionInput("");
      toast.success(t("adminMerchants.commissionSuccess"));
      refreshList();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const globalCommissionMutation = useMutation({
    mutationFn: (rate: number) =>
      merchantService.updateGlobalCommissionRate(rate),
    onSuccess: () => {
      setGlobalInput("");
      toast.success(t("adminMerchants.globalCommissionSuccess"));
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  function submitCommission() {
    const rate = Number(commissionInput);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      toast.error(t("adminMerchants.commissionInvalid"));
      return;
    }
    commissionMutation.mutate(rate / 100);
  }

  function submitGlobalCommission() {
    const rate = Number(globalInput);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      toast.error(t("adminMerchants.commissionInvalid"));
      return;
    }
    globalCommissionMutation.mutate(rate / 100);
  }

  function submitAction() {
    if (!merchant || !actionType) return;
    if (!reason.trim()) {
      toast.error(t("adminMerchants.reasonRequired"));
      return;
    }
    const payload = { id: merchant.merchantId, reason: reason.trim() };
    if (actionType === "suspend") suspendMutation.mutate(payload);
    if (actionType === "activate") activateMutation.mutate(payload);
    if (actionType === "close") closeMutation.mutate(payload);
  }

  const isPending =
    suspendMutation.isPending ||
    activateMutation.isPending ||
    closeMutation.isPending;

  return (
    <div className="min-h-screen">
      <AdminHeader
        icon={Store}
        title={t("adminMerchants.title")}
        description={t("adminMerchants.description")}
      />

      <AdminStats
        stats={[
          {
            label: t("adminConsole.stats.total"),
            value: totalElements,
            icon: Store,
          },
          {
            label: t("adminConsole.stats.active"),
            value: countByStatus("ACTIVE"),
            icon: Play,
            iconClass: "text-emerald-300",
          },
          {
            label: t("adminConsole.stats.suspended"),
            value: countByStatus("SUSPENDED"),
            icon: Pause,
            iconClass: "text-amber-300",
          },
        ]}
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <AdminSearch
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder={t("adminMerchants.searchPlaceholder")}
        />
        <p className="text-xs text-slate-400 sm:ml-auto">
          {t("adminConsole.totalCount", { count: totalElements })}
        </p>
      </div>

      <div className="mb-5 rounded-2xl border border-gray-600 bg-white/[0.04] p-5">
        <div className="mb-2 flex items-center gap-2">
          <Percent size={16} className="text-purple-300" />
          <h2 className="text-sm font-semibold text-white">
            {t("adminMerchants.globalCommissionTitle")}
          </h2>
        </div>
        <p className="mb-3 text-xs text-slate-400">
          {t("adminMerchants.globalCommissionDescription")}
        </p>
        <div className="flex items-end gap-3">
          <div className="w-44">
            <Input
              label={t("adminMerchants.commissionRateLabel")}
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={globalInput}
              onChange={(e) => setGlobalInput(e.target.value)}
              placeholder="5.00"
            />
          </div>
          <button
            type="button"
            onClick={submitGlobalCommission}
            disabled={!globalInput.trim() || globalCommissionMutation.isPending}
            className={adminPrimaryClass}
          >
            {globalCommissionMutation.isPending && (
              <Loader2 size={16} className="animate-spin" />
            )}
            {t("common.save")}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-purple-300" size={28} />
        </div>
      ) : merchants.length === 0 ? (
        <AdminEmpty
          icon={Store}
          title={t("adminMerchants.emptyTitle")}
          description={t("adminMerchants.emptyDescription")}
        />
      ) : (
        <>
          <AdminTable>
            <thead>
              <tr className="border-b border-slate-600/60 bg-white/[0.03]">
                <th className={adminTh}>{t("adminMerchants.title")}</th>
                <th className={adminTh}>{t("common.status")}</th>
                <th className={adminTh}>
                  {t("adminMerchants.commissionRateLabel")}
                </th>
                <th className={adminTh}>{t("common.createdAt")}</th>
                <th className={`${adminTh} text-right`}>
                  {t("common.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {merchants.map((item) => (
                <tr key={item.merchantId} className={adminRow}>
                  <td className={adminTd}>
                    <p className="font-semibold text-white">{item.name}</p>
                    <p className="text-xs text-slate-400">
                      {item.provinceName ?? item.merchantId}
                    </p>
                  </td>
                  <td className={adminTd}>
                    <AdminPill tone={statusConfig[item.status].tone}>
                      {t(statusConfig[item.status].labelKey)}
                    </AdminPill>
                  </td>
                  <td className={adminTd}>
                    {item.commissionRate != null
                      ? `${(item.commissionRate * 100).toFixed(2)}%`
                      : "—"}
                  </td>
                  <td className={`${adminTd} whitespace-nowrap`}>
                    {formatDateTime(item.createdAt, locale)}
                  </td>
                  <td className={`${adminTd} text-right`}>
                    <button
                      type="button"
                      onClick={() => openDetail(item)}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-purple-200 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      <Eye size={14} />
                      {t("common.view")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </AdminTable>

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      )}

      <Modal
        isOpen={detailOpen && merchant !== null}
        onClose={() => setDetailOpen(false)}
        title={merchant?.name}
        size="lg"
      >
        {merchant && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-xs text-slate-400">
                {merchant.merchantId}
              </p>
              <AdminPill tone={statusConfig[merchant.status].tone}>
                {t(statusConfig[merchant.status].labelKey)}
              </AdminPill>
            </div>

            <dl className="divide-y divide-white/5">
              <Row label="Owner ID" value={merchant.ownerId} mono />
              <Row
                label={t("common.description")}
                value={merchant.description ?? "—"}
              />
              <Row
                label="Logo"
                value={
                  merchant.logoUrl ? (
                    <a
                      href={merchant.logoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-purple-300 hover:underline"
                    >
                      {merchant.logoUrl}
                    </a>
                  ) : (
                    "—"
                  )
                }
              />
              <Row
                label={t("adminMerchants.commissionRateLabel")}
                value={
                  merchant.commissionRate != null
                    ? `${(merchant.commissionRate * 100).toFixed(2)}%`
                    : "—"
                }
              />
              <Row
                label={t("common.createdAt")}
                value={formatDateTime(merchant.createdAt, locale)}
              />
              <Row
                label={t("common.updatedAt")}
                value={formatDateTime(merchant.updatedAt, locale)}
              />
            </dl>

            <div className="flex flex-wrap gap-2 border-t border-slate-600/60 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCommissionInput(
                    merchant.commissionRate != null
                      ? (merchant.commissionRate * 100).toFixed(2)
                      : "",
                  );
                  setCommissionModal(true);
                }}
              >
                <Percent size={14} className="mr-1.5" />
                {t("adminMerchants.changeCommission")}
              </Button>
              {merchant.status === "ACTIVE" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActionType("suspend")}
                >
                  <Pause size={14} className="mr-1.5" />
                  {t("adminMerchants.suspend")}
                </Button>
              )}
              {merchant.status === "SUSPENDED" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActionType("activate")}
                >
                  <Play size={14} className="mr-1.5" />
                  {t("adminMerchants.activate")}
                </Button>
              )}
              {merchant.status !== "CLOSED" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActionType("close")}
                  className="border-rose-400/40 text-rose-300 hover:bg-rose-500/10"
                >
                  <XCircle size={14} className="mr-1.5" />
                  {t("adminMerchants.close")}
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={actionType !== null}
        onClose={closeAction}
        title={
          actionType === "suspend"
            ? t("adminMerchants.suspendTitle")
            : actionType === "activate"
              ? t("adminMerchants.activateTitle")
              : t("adminMerchants.closeTitle")
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            {actionType === "close"
              ? t("adminMerchants.closeWarning")
              : t("adminMerchants.auditHelp")}
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("adminMerchants.reasonPlaceholder")}
            rows={4}
            className="w-full rounded-lg border border-gray-500 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={closeAction}
              disabled={isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={submitAction}
              loading={isPending}
              className={
                actionType === "close" ? "bg-rose-600 hover:bg-rose-500" : ""
              }
            >
              {t("common.confirm")}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={commissionModal}
        onClose={() => setCommissionModal(false)}
        title={t("adminMerchants.commissionTitle")}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            {t("adminMerchants.commissionDescription")}
          </p>
          <Input
            label={t("adminMerchants.commissionRateLabel")}
            type="number"
            min={0}
            max={100}
            step="0.01"
            value={commissionInput}
            onChange={(e) => setCommissionInput(e.target.value)}
            placeholder="5.00"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setCommissionModal(false)}
              disabled={commissionMutation.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={submitCommission}
              loading={commissionMutation.isPending}
              disabled={!commissionInput.trim()}
            >
              {t("common.save")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function AdminMerchantsPage() {
  return (
    <AuthGuard requiredRoles={["SYSTEM_ADMIN", "CS_ADMIN"]}>
      <AdminMerchantsInner />
    </AuthGuard>
  );
}
