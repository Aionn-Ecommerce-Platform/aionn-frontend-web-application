"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Warehouse as WarehouseIcon,
  Plus,
  Loader2,
  Pause,
  Play,
  ArrowUpDown,
  CheckCircle2,
  Eye,
  Info,
  PauseCircle,
  Search,
  ShieldAlert,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button, Modal, EmptyState, Pagination, Badge } from "@/shared/ui";
import AuthGuard from "@/components/auth/AuthGuard";
import { warehouseService, merchantService } from "@/lib/services";
import {
  ConsoleFilterDropdown,
  ConsoleEmptyState,
  ConsolePanel,
  ConsoleStatGrid,
} from "@/features/merchant";
import { getErrorMessage } from "@/shared/lib/errors";
import { formatDateTime } from "@/shared/lib/utils";
import { useTranslation } from "@/hooks";
import type { Warehouse, WarehouseStatus } from "@/types";
import { WarehouseLocationPicker } from "./_components/WarehouseLocationPicker";

const WAREHOUSE_STATUS_CLASS: Record<WarehouseStatus, string> = {
  ACTIVE: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  INACTIVE: "border-slate-500/40 bg-white/5 text-slate-300",
  SUSPENDED: "border-amber-400/30 bg-amber-400/10 text-amber-300",
};

const WAREHOUSE_STATUS_KEYS: WarehouseStatus[] = [
  "ACTIVE",
  "INACTIVE",
  "SUSPENDED",
];

function warehouseStatusLabelKey(status: WarehouseStatus) {
  return `merchant.warehouses.${
    status === "ACTIVE"
      ? "statusActive"
      : status === "INACTIVE"
        ? "statusInactive"
        : "statusSuspended"
  }`;
}

function MerchantWarehousesInner() {
  const { t, locale } = useTranslation();
  const qc = useQueryClient();
  const statusLabels: Record<WarehouseStatus, string> = {
    ACTIVE: t("merchant.warehouses.statusActive"),
    INACTIVE: t("merchant.warehouses.statusInactive"),
    SUSPENDED: t("merchant.warehouses.statusSuspended"),
  };
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<Warehouse | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<WarehouseStatus | "all">(
    "all",
  );
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const [adjustingPriority, setAdjustingPriority] = useState<Warehouse | null>(
    null,
  );

  const { data: warehousePage, isLoading } = useQuery({
    queryKey: ["merchant-warehouses", page, statusFilter, search.trim()],
    queryFn: () =>
      warehouseService.listMine({
        page: page - 1,
        limit: PAGE_SIZE,
        status: statusFilter === "all" ? undefined : statusFilter,
        search: search.trim() || undefined,
      }),
  });
  const warehouses = warehousePage?.content ?? [];
  const totalPages = Math.max(1, warehousePage?.totalPages ?? 1);
  const safePage = Math.min(page, totalPages);
  if (warehousePage && page > safePage) {
    setPage(safePage);
  }

  const { data: stats, isError: statsError } = useQuery({
    queryKey: ["merchant-warehouse-stats"],
    queryFn: () => warehouseService.stats(),
  });

  const statValue = (value: number | undefined) =>
    statsError || value == null ? "—" : value;
  const warehouseStats = [
    {
      label: t("merchant.warehouses.stats.total"),
      value: statValue(stats?.total),
      icon: WarehouseIcon,
      iconClass: "text-purple-300",
    },
    {
      label: t("merchant.warehouses.stats.active"),
      value: statValue(stats?.active),
      icon: CheckCircle2,
      iconClass: "text-emerald-300",
    },
    {
      label: t("merchant.warehouses.stats.inactive"),
      value: statValue(stats?.inactive),
      icon: PauseCircle,
      iconClass: "text-amber-300",
    },
    {
      label: t("merchant.warehouses.stats.suspended"),
      value: statValue(stats?.suspended),
      icon: ShieldAlert,
      iconClass: "text-rose-300",
    },
  ];

  const hasFilters = Boolean(search.trim() || statusFilter !== "all");

  const statusMutation = useMutation({
    mutationFn: ({
      warehouseId,
      status,
    }: {
      warehouseId: string;
      status: WarehouseStatus;
    }) => warehouseService.changeStatus(warehouseId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["merchant-warehouses"] });
      qc.invalidateQueries({ queryKey: ["merchant-warehouse-stats"] });
      setSelected(null);
      toast.success(t("merchant.warehouses.toastStatusUpdated"));
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  function refresh() {
    qc.invalidateQueries({ queryKey: ["merchant-warehouses"] });
    qc.invalidateQueries({ queryKey: ["merchant-warehouse-stats"] });
  }

  return (
    <ConsolePanel>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
          <WarehouseIcon size={22} className="text-purple-300" />
          <span className="text-purple-300">
            {t("merchant.warehouses.title")}
          </span>
        </h1>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-purple-900/40 transition-all hover:from-purple-500 hover:to-fuchsia-500"
        >
          <Plus size={16} />
          {t("merchant.warehouses.addWarehouse")}
        </button>
      </div>

      <ConsoleStatGrid stats={warehouseStats} />

      <div className="mb-5 rounded-2xl border border-purple-500/30 bg-purple-500/10 p-4">
        <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
          <Info size={15} className="text-purple-300" />
          {t("merchant.warehouses.aboutTitle")}
        </h4>
        <ul className="space-y-1.5 text-sm text-slate-300">
          <li>{t("merchant.warehouses.aboutPriority")}</li>
          <li>{t("merchant.warehouses.aboutInactive")}</li>
          <li>{t("merchant.warehouses.aboutSuspended")}</li>
        </ul>
      </div>

      <div className="relative z-30 mb-5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-64 flex-1">
          <Search
            size={17}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder={t("merchant.warehouses.searchPlaceholder")}
            className="w-full rounded-xl border border-gray-500 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 shadow-sm focus:border-purple-400/70 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
          />
        </div>
        <ConsoleFilterDropdown
          label={t("merchant.warehouses.statusFilterLabel")}
          value={statusFilter}
          options={(["all", ...WAREHOUSE_STATUS_KEYS] as const).map((key) => ({
            value: key,
            label:
              key === "all"
                ? t("merchant.warehouses.statusAll")
                : t(warehouseStatusLabelKey(key)),
          }))}
          onChange={(value) => {
            setStatusFilter(value);
            setPage(1);
          }}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-purple-400" size={28} />
        </div>
      ) : warehouses.length === 0 && !hasFilters ? (
        <EmptyState
          icon={WarehouseIcon}
          title={t("merchant.warehouses.emptyTitle")}
          description={t("merchant.warehouses.emptyDescription")}
        />
      ) : warehouses.length === 0 ? (
        <ConsoleEmptyState
          icon={<WarehouseIcon size={30} />}
          title={t("merchant.warehouses.emptyFilteredTitle")}
          description={t("merchant.warehouses.emptyFilteredDescription")}
        >
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
              setPage(1);
            }}
            className="mt-6 rounded-xl border border-gray-500 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/10"
          >
            {t("merchant.warehouses.clearFilters")}
          </button>
        </ConsoleEmptyState>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-600 bg-white/[0.04]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-600/60 bg-white/[0.03]">
                  <th className="whitespace-nowrap px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {t("merchant.warehouses.colWarehouse")}
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {t("merchant.warehouses.colAddress")}
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {t("merchant.warehouses.colPriority")}
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {t("merchant.warehouses.colStatus")}
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {t("merchant.warehouses.colActions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {warehouses.map((wh) => (
                  <tr
                    key={wh.warehouseId}
                    className="border-b border-slate-600/60 transition-colors last:border-0 hover:bg-white/[0.04]"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-center font-mono text-[13px] font-semibold text-white">
                      {wh.warehouseId}
                    </td>
                    <td className="max-w-[320px] px-4 py-3 text-center text-sm text-slate-300">
                      <span className="line-clamp-2">
                        {wh.address || t("merchant.warehouses.noAddress")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-semibold text-white">
                      {wh.priorityLevel}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold ${WAREHOUSE_STATUS_CLASS[wh.status]}`}
                      >
                        {statusLabels[wh.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => setSelected(wh)}
                          aria-label={t("merchant.warehouses.detailTitle")}
                          className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                        >
                          <Eye size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination
        currentPage={safePage}
        totalPages={totalPages}
        onPageChange={setPage}
      />

      <Modal
        isOpen={selected !== null}
        onClose={() => setSelected(null)}
        title={t("merchant.warehouses.detailTitle")}
        size="full"
      >
        {selected && (
          <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-2 text-sm">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-gray-500">
                  {t("merchant.warehouses.colWarehouse")}
                </p>
                <p className="mt-1 break-all font-mono text-sm font-semibold text-gray-900">
                  {selected.warehouseId}
                </p>
              </div>
              <div>
                <p className="text-gray-500">
                  {t("merchant.warehouses.colStatus")}
                </p>
                <Badge
                  variant={
                    selected.status === "ACTIVE"
                      ? "success"
                      : selected.status === "SUSPENDED"
                        ? "warning"
                        : "default"
                  }
                  className="!mt-1 !rounded-full !px-3 !py-1 !text-xs"
                >
                  {statusLabels[selected.status]}
                </Badge>
              </div>
              <div>
                <p className="text-gray-500">
                  {t("merchant.warehouses.colAddress")}
                </p>
                <p className="mt-1 font-medium text-gray-900">
                  {selected.address || t("merchant.warehouses.noAddress")}
                </p>
              </div>
              <div>
                <p className="text-gray-500">
                  {t("merchant.warehouses.colPriority")}
                </p>
                <p className="mt-1 font-medium text-gray-900">
                  {selected.priorityLevel}
                </p>
              </div>
              <div>
                <p className="text-gray-500">
                  {t("merchant.warehouses.colCreatedAt")}
                </p>
                <p className="mt-1 font-medium text-gray-900">
                  {formatDateTime(selected.createdAt, locale)}
                </p>
              </div>
              <div>
                <p className="text-gray-500">
                  {t("merchant.warehouses.detailUpdatedAt")}
                </p>
                <p className="mt-1 font-medium text-gray-900">
                  {formatDateTime(selected.updatedAt, locale)}
                </p>
              </div>
            </div>

            {selected.status === "SUSPENDED" && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                {t("merchant.warehouses.aboutSuspended")}
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2 border-t border-gray-300 pt-4">
              {selected.status !== "SUSPENDED" && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setAdjustingPriority(selected)}
                  >
                    <ArrowUpDown size={14} className="mr-1.5" />
                    {t("merchant.warehouses.priorityTitle")}
                  </Button>
                  {selected.status === "ACTIVE" ? (
                    <Button
                      variant="warning"
                      loading={
                        statusMutation.isPending &&
                        statusMutation.variables?.warehouseId ===
                          selected.warehouseId
                      }
                      onClick={() =>
                        statusMutation.mutate({
                          warehouseId: selected.warehouseId,
                          status: "INACTIVE",
                        })
                      }
                    >
                      <Pause size={14} className="mr-1.5" />
                      {t("merchant.warehouses.pauseBtn")}
                    </Button>
                  ) : (
                    <Button
                      variant="success"
                      loading={
                        statusMutation.isPending &&
                        statusMutation.variables?.warehouseId ===
                          selected.warehouseId
                      }
                      onClick={() =>
                        statusMutation.mutate({
                          warehouseId: selected.warehouseId,
                          status: "ACTIVE",
                        })
                      }
                    >
                      <Play size={14} className="mr-1.5" />
                      {t("merchant.warehouses.activateBtn")}
                    </Button>
                  )}
                </>
              )}
              <Button variant="outline" onClick={() => setSelected(null)}>
                {t("common.close")}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {creating && (
        <CreateModal
          onClose={() => setCreating(false)}
          onSuccess={() => {
            refresh();
            setCreating(false);
          }}
        />
      )}

      {adjustingPriority && (
        <PriorityModal
          warehouse={adjustingPriority}
          onClose={() => setAdjustingPriority(null)}
          onSuccess={() => {
            refresh();
            setAdjustingPriority(null);
          }}
        />
      )}
    </ConsolePanel>
  );
}

function CreateModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const [address, setAddress] = useState("");
  const [priority, setPriority] = useState("1");

  const { data: merchant } = useQuery({
    queryKey: ["merchant", "me"],
    queryFn: () => merchantService.getMine(),
  });

  const mutation = useMutation({
    mutationFn: () =>
      warehouseService.create({
        merchantId: merchant!.merchantId,
        address: address.trim() || undefined,
        priorityLevel: Number(priority) || 1,
      }),
    onSuccess: () => {
      toast.success(t("merchant.warehouses.toastCreated"));
      onSuccess();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={t("merchant.warehouses.createTitle")}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            {t("merchant.warehouses.addressLabel")}
          </label>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={3}
            placeholder={t("merchant.warehouses.addressPlaceholder")}
            className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
          <div className="mt-3">
            <WarehouseLocationPicker
              address={address}
              onAddressChange={setAddress}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            {t("merchant.warehouses.priorityRangeLabel")}
          </label>
          <input
            type="number"
            min="1"
            max="100"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            {t("merchant.warehouses.cancelBtn")}
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={!merchant}
          >
            {t("merchant.warehouses.createBtn")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function PriorityModal({
  warehouse,
  onClose,
  onSuccess,
}: {
  warehouse: Warehouse;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const [value, setValue] = useState(String(warehouse.priorityLevel));
  const mutation = useMutation({
    mutationFn: () =>
      warehouseService.adjustPriority(warehouse.warehouseId, Number(value)),
    onSuccess: () => {
      toast.success(t("merchant.warehouses.toastPriorityUpdated"));
      onSuccess();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={t("merchant.warehouses.priorityTitle")}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            {t("merchant.warehouses.priorityRangeHelp")}
          </label>
          <input
            type="number"
            min="1"
            max="100"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            {t("merchant.warehouses.cancelBtn")}
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={!value || Number(value) < 1 || Number(value) > 100}
          >
            {t("merchant.warehouses.saveBtn")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default function MerchantWarehousesPage() {
  return (
    <AuthGuard requiredRoles={["MERCHANT"]}>
      <MerchantWarehousesInner />
    </AuthGuard>
  );
}
