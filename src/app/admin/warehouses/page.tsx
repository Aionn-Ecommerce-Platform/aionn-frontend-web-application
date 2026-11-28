"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Loader2,
  PauseCircle,
  Warehouse as WarehouseIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button, Modal, Pagination, Textarea } from "@/shared/ui";
import {
  AdminEmpty,
  AdminHeader,
  AdminPill,
  AdminSearch,
  AdminTable,
  AdminTabs,
  adminPrimaryClass,
  adminRow,
  adminTd,
  adminTh,
} from "@/features/admin";
import AuthGuard from "@/components/auth/AuthGuard";
import { warehouseService } from "@/lib/services/warehouse.service";
import { getErrorMessage } from "@/shared/lib/errors";
import { formatDateTime } from "@/shared/lib/utils";
import { useDebounce, useTranslation } from "@/hooks";
import type { Warehouse, WarehouseStatus } from "@/types";

type StatusTab = "ALL" | WarehouseStatus;

const PAGE_SIZE = 20;

const STATUS_TABS: Array<{ value: StatusTab; labelKey: string }> = [
  { value: "ALL", labelKey: "common.all" },
  { value: "ACTIVE", labelKey: "merchant.warehouses.statusActive" },
  { value: "SUSPENDED", labelKey: "merchant.warehouses.statusSuspended" },
  { value: "INACTIVE", labelKey: "merchant.warehouses.statusInactive" },
];

const STATUS_LABEL_KEY: Record<string, string> = {
  ACTIVE: "merchant.warehouses.statusActive",
  SUSPENDED: "merchant.warehouses.statusSuspended",
  INACTIVE: "merchant.warehouses.statusInactive",
};

const STATUS_TONE: Record<string, "success" | "danger" | "neutral"> = {
  ACTIVE: "success",
  SUSPENDED: "danger",
  INACTIVE: "neutral",
};

function AdminWarehousesInner() {
  const { t, locale } = useTranslation();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState<StatusTab>("ALL");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<Warehouse | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<Warehouse | null>(null);
  const [reason, setReason] = useState("");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [
      "admin-warehouses",
      {
        status: statusFilter,
        search: debouncedSearch.trim(),
        page,
      },
    ],
    queryFn: () =>
      warehouseService.adminList({
        search: debouncedSearch.trim() || undefined,
        status: statusFilter === "ALL" ? undefined : statusFilter,
        page: page - 1,
        size: PAGE_SIZE,
      }),
  });

  const warehouses = useMemo(() => data?.content ?? [], [data]);
  const totalElements = data?.totalElements ?? warehouses.length;
  const totalPages = Math.max(1, data?.totalPages ?? 1);

  const refreshList = () =>
    qc.invalidateQueries({ queryKey: ["admin-warehouses"] });

  const applyUpdated = (updated: Warehouse) => {
    setDetail((current) =>
      current && current.warehouseId === updated.warehouseId
        ? updated
        : current,
    );
  };

  const suspendMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      warehouseService.suspend(id, { reason }),
    onSuccess: (updated) => {
      toast.success(t("adminWarehouses.suspendSuccess"));
      applyUpdated(updated);
      setSuspendTarget(null);
      setReason("");
      void refreshList();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const liftMutation = useMutation({
    mutationFn: (id: string) => warehouseService.liftSuspension(id),
    onSuccess: (updated) => {
      toast.success(t("adminWarehouses.resumeSuccess"));
      applyUpdated(updated);
      void refreshList();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <div className="min-h-screen">
      <AdminHeader
        icon={WarehouseIcon}
        title={t("adminWarehouses.title")}
        description={t("adminWarehouses.description")}
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <AdminSearch
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder={t("adminWarehouses.searchPlaceholder")}
        />
        <p className="text-xs text-slate-400 sm:ml-auto">
          {t("adminConsole.totalCount", { count: totalElements })}
        </p>
      </div>

      <AdminTabs
        tabs={STATUS_TABS.map((tab) => ({
          value: tab.value,
          label: t(tab.labelKey),
        }))}
        value={statusFilter}
        onChange={(value) => {
          setStatusFilter(value);
          setPage(1);
        }}
      />

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-purple-300" size={28} />
        </div>
      ) : isError ? (
        <AdminEmpty
          icon={AlertCircle}
          title={t("common.error")}
          description={getErrorMessage(error)}
          action={
            <Button variant="outline" onClick={() => void refetch()}>
              {t("common.tryAgain")}
            </Button>
          }
        />
      ) : warehouses.length === 0 ? (
        <AdminEmpty
          icon={WarehouseIcon}
          title={t("common.noResults")}
          description={t("adminConsole.totalCount", { count: 0 })}
        />
      ) : (
        <>
          <AdminTable>
            <thead>
              <tr className="border-b border-slate-600/60 bg-white/[0.03]">
                <th className={adminTh}>
                  {t("adminWarehouses.warehouseColumn")}
                </th>
                <th className={adminTh}>{t("adminCod.merchant")}</th>
                <th className={adminTh}>{t("common.address")}</th>
                <th className={adminTh}>{t("common.status")}</th>
                <th className={`${adminTh} text-right`}>
                  {t("common.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {warehouses.map((warehouse) => (
                <tr key={warehouse.warehouseId} className={adminRow}>
                  <td className={adminTd}>
                    <p className="font-semibold text-white">
                      {warehouse.pickupName ?? warehouse.warehouseId}
                    </p>
                    <p className="font-mono text-[11px] text-slate-500">
                      {warehouse.warehouseId}
                    </p>
                  </td>
                  <td className={`${adminTd} font-mono text-xs`}>
                    {warehouse.merchantId}
                  </td>
                  <td className={adminTd}>
                    <span className="line-clamp-2 text-xs text-slate-300">
                      {warehouse.address ?? t("adminWarehouses.notUpdated")}
                    </span>
                  </td>
                  <td className={adminTd}>
                    <AdminPill
                      tone={STATUS_TONE[warehouse.status] ?? "neutral"}
                    >
                      {t(
                        STATUS_LABEL_KEY[warehouse.status] ?? warehouse.status,
                      )}
                    </AdminPill>
                  </td>
                  <td className={`${adminTd} text-right`}>
                    <button
                      type="button"
                      onClick={() => setDetail(warehouse)}
                      aria-label={t("common.view")}
                      className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      <ChevronRight size={16} />
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
        isOpen={detail !== null}
        onClose={() => setDetail(null)}
        title={t("adminWarehouses.title")}
        size="lg"
      >
        {detail && (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold text-gray-900">
                  {detail.pickupName ?? detail.warehouseId}
                </h2>
                <p className="font-mono text-xs text-gray-500">
                  {detail.warehouseId}
                </p>
              </div>
              <AdminPill tone={STATUS_TONE[detail.status] ?? "neutral"}>
                {t(STATUS_LABEL_KEY[detail.status] ?? detail.status)}
              </AdminPill>
            </div>

            <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-gray-500">{t("adminCod.merchant")}</dt>
                <dd className="mt-0.5 font-mono font-medium text-gray-900">
                  {detail.merchantId}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">
                  {t("adminWarehouses.priority")}
                </dt>
                <dd className="mt-0.5 font-medium text-gray-900">
                  {detail.priorityLevel}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-gray-500">{t("common.address")}</dt>
                <dd className="mt-0.5 font-medium text-gray-900">
                  {detail.address ?? t("adminWarehouses.notUpdated")}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">{t("common.name")}</dt>
                <dd className="mt-0.5 font-medium text-gray-900">
                  {detail.pickupName ?? t("adminWarehouses.notUpdated")}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">{t("common.phone")}</dt>
                <dd className="mt-0.5 font-medium text-gray-900">
                  {detail.pickupPhone ?? t("adminWarehouses.notUpdated")}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">{t("common.createdAt")}</dt>
                <dd className="mt-0.5 font-medium text-gray-900">
                  {detail.createdAt
                    ? formatDateTime(detail.createdAt, locale)
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">{t("common.updatedAt")}</dt>
                <dd className="mt-0.5 font-medium text-gray-900">
                  {detail.updatedAt
                    ? formatDateTime(detail.updatedAt, locale)
                    : "—"}
                </dd>
              </div>
            </dl>

            <div className="flex flex-wrap gap-2 border-t border-gray-300 pt-4">
              {detail.status === "SUSPENDED" ? (
                <Button
                  className={adminPrimaryClass}
                  size="sm"
                  onClick={() => liftMutation.mutate(detail.warehouseId)}
                  loading={
                    liftMutation.isPending &&
                    liftMutation.variables === detail.warehouseId
                  }
                >
                  <CheckCircle2 size={14} />
                  {t("adminWarehouses.resume")}
                </Button>
              ) : detail.status === "ACTIVE" ? (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    setSuspendTarget(detail);
                    setReason("");
                  }}
                >
                  <PauseCircle size={14} className="mr-1" />
                  {t("adminWarehouses.suspend")}
                </Button>
              ) : (
                <p className="text-sm text-gray-500">
                  {t("adminWarehouses.closedHelp")}
                </p>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={suspendTarget !== null}
        onClose={() => {
          setSuspendTarget(null);
          setReason("");
        }}
        title={t("adminWarehouses.suspend")}
      >
        <div className="space-y-4">
          {suspendTarget && (
            <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-1">
              <p>
                <span className="text-gray-500">
                  {t("merchant.inventory.warehouseDropdownLabel")}:
                </span>{" "}
                <span className="font-mono">{suspendTarget.warehouseId}</span>
              </p>
              <p>
                <span className="text-gray-500">{t("adminCod.merchant")}:</span>{" "}
                <span className="font-mono">{suspendTarget.merchantId}</span>
              </p>
            </div>
          )}
          <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 p-3 rounded-lg">
            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
            <p>{t("adminWarehouses.suspendWarning")}</p>
          </div>
          <Textarea
            label={t("adminWarehouses.reason")}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("adminWarehouses.reasonPlaceholder")}
            rows={3}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSuspendTarget(null);
                setReason("");
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="danger"
              loading={suspendMutation.isPending}
              disabled={!reason.trim()}
              onClick={() =>
                suspendTarget &&
                suspendMutation.mutate({
                  id: suspendTarget.warehouseId,
                  reason: reason.trim(),
                })
              }
            >
              {t("adminWarehouses.suspendAction")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function AdminWarehousesPage() {
  return (
    <AuthGuard requiredRoles={["SYSTEM_ADMIN", "CS_ADMIN"]}>
      <AdminWarehousesInner />
    </AuthGuard>
  );
}
