"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Warehouse as WarehouseIcon,
  Plus,
  Loader2,
  Pause,
  Play,
  ArrowUpDown,
  Check,
  CheckCircle2,
  ChevronDown,
  PauseCircle,
  Search,
  ShieldAlert,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button, Modal, EmptyState } from "@/shared/ui";
import AuthGuard from "@/components/auth/AuthGuard";
import { warehouseService, merchantService } from "@/lib/services";
import { getErrorMessage } from "@/shared/lib/errors";
import { formatDateTime } from "@/shared/lib/utils";
import { useTranslation } from "@/hooks";
import type { Warehouse, WarehouseStatus } from "@/types";

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

function WarehouseStatusDropdown({
  value,
  onChange,
}: {
  value: WarehouseStatus | "all";
  onChange: (value: WarehouseStatus | "all") => void;
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
          {t("merchant.warehouses.statusFilterLabel")}:
        </span>
        <span>
          {value === "all"
            ? t("merchant.warehouses.statusAll")
            : t(warehouseStatusLabelKey(value))}
        </span>
        <ChevronDown
          size={14}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-2 w-52 overflow-hidden rounded-xl border border-gray-500 bg-console-panel-raised py-1 shadow-2xl shadow-black/40">
          {(["all", ...WAREHOUSE_STATUS_KEYS] as const).map((key) => {
            const active = value === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  onChange(key);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-purple-500/20 font-semibold text-purple-200"
                    : "text-slate-300 hover:bg-white/5"
                }`}
              >
                <span className="truncate">
                  {key === "all"
                    ? t("merchant.warehouses.statusAll")
                    : t(warehouseStatusLabelKey(key))}
                </span>
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

function MerchantWarehousesInner() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const statusLabels: Record<WarehouseStatus, string> = {
    ACTIVE: t("merchant.warehouses.statusActive"),
    INACTIVE: t("merchant.warehouses.statusInactive"),
    SUSPENDED: t("merchant.warehouses.statusSuspended"),
  };
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<WarehouseStatus | "all">(
    "all",
  );
  const [adjustingPriority, setAdjustingPriority] = useState<Warehouse | null>(
    null,
  );

  const { data: warehouses, isLoading } = useQuery({
    queryKey: ["merchant-warehouses"],
    queryFn: () => warehouseService.listMine(),
  });

  const warehouseStats = [
    {
      label: t("merchant.warehouses.stats.total"),
      value: warehouses?.length ?? 0,
      icon: WarehouseIcon,
      iconClass: "text-purple-300",
    },
    {
      label: t("merchant.warehouses.stats.active"),
      value:
        warehouses?.filter((warehouse) => warehouse.status === "ACTIVE")
          .length ?? 0,
      icon: CheckCircle2,
      iconClass: "text-emerald-300",
    },
    {
      label: t("merchant.warehouses.stats.inactive"),
      value:
        warehouses?.filter((warehouse) => warehouse.status === "INACTIVE")
          .length ?? 0,
      icon: PauseCircle,
      iconClass: "text-amber-300",
    },
    {
      label: t("merchant.warehouses.stats.suspended"),
      value:
        warehouses?.filter((warehouse) => warehouse.status === "SUSPENDED")
          .length ?? 0,
      icon: ShieldAlert,
      iconClass: "text-rose-300",
    },
  ];

  const searchQuery = search.trim().toLowerCase();
  const filteredWarehouses = (warehouses ?? []).filter(
    (warehouse) =>
      (statusFilter === "all" || warehouse.status === statusFilter) &&
      (!searchQuery ||
        warehouse.warehouseId.toLowerCase().includes(searchQuery) ||
        (warehouse.address ?? "").toLowerCase().includes(searchQuery)),
  );

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
      toast.success(t("merchant.warehouses.toastStatusUpdated"));
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  function refresh() {
    qc.invalidateQueries({ queryKey: ["merchant-warehouses"] });
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

        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {warehouseStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="flex items-center gap-3 rounded-2xl border border-gray-400 bg-white p-3.5 shadow-xs"
              >
                <Icon
                  size={24}
                  strokeWidth={2.2}
                  className={`shrink-0 ${stat.iconClass}`}
                />
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                    {stat.label}
                  </p>
                  <p className="truncate text-xl font-extrabold text-gray-950">
                    {stat.value}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="relative z-30 mb-5 flex flex-wrap items-center gap-2">
          <div className="relative min-w-64 flex-1">
            <Search
              size={17}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("merchant.warehouses.searchPlaceholder")}
              className="w-full rounded-xl border border-gray-500 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 shadow-sm focus:border-purple-400/70 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
            />
          </div>
          <WarehouseStatusDropdown
            value={statusFilter}
            onChange={setStatusFilter}
          />
        </div>

        {isLoading ? (
          <div className="bg-white rounded-2xl border border-gray-400 shadow-xs p-12 flex justify-center">
            <Loader2 className="animate-spin text-brand" size={28} />
          </div>
        ) : !warehouses || warehouses.length === 0 ? (
          <EmptyState
            icon={WarehouseIcon}
            title={t("merchant.warehouses.emptyTitle")}
            description={t("merchant.warehouses.emptyDescription")}
          />
        ) : filteredWarehouses.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-400 bg-white px-6 py-16 text-center shadow-xs">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 text-gray-500">
              <WarehouseIcon size={30} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              {t("merchant.warehouses.emptyFilteredTitle")}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {t("merchant.warehouses.emptyFilteredDescription")}
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
              }}
              className="mt-6 rounded-xl border border-gray-500 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/10"
            >
              {t("merchant.warehouses.clearFilters")}
            </button>
          </div>
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
                      {t("merchant.warehouses.colCreatedAt")}
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      {t("merchant.warehouses.colActions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWarehouses.map((wh) => (
                    <tr
                      key={wh.warehouseId}
                      className="border-b border-slate-600/60 transition-colors last:border-0 hover:bg-white/[0.04]"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-center font-mono text-xs text-slate-200">
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
                      <td className="whitespace-nowrap px-4 py-3 text-center text-xs text-slate-400">
                        {formatDateTime(wh.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          {wh.status === "ACTIVE" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              loading={
                                statusMutation.isPending &&
                                statusMutation.variables?.warehouseId ===
                                  wh.warehouseId
                              }
                              onClick={() =>
                                statusMutation.mutate({
                                  warehouseId: wh.warehouseId,
                                  status: "INACTIVE",
                                })
                              }
                            >
                              <Pause size={14} className="mr-1" />
                              {t("merchant.warehouses.pauseBtn")}
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              loading={
                                statusMutation.isPending &&
                                statusMutation.variables?.warehouseId ===
                                  wh.warehouseId
                              }
                              onClick={() =>
                                statusMutation.mutate({
                                  warehouseId: wh.warehouseId,
                                  status: "ACTIVE",
                                })
                              }
                              disabled={wh.status === "SUSPENDED"}
                            >
                              <Play size={14} className="mr-1" />
                              {t("merchant.warehouses.activateBtn")}
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            title={t("merchant.warehouses.priorityTitle")}
                            aria-label={t("merchant.warehouses.priorityTitle")}
                            onClick={() => setAdjustingPriority(wh)}
                          >
                            <ArrowUpDown size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-6 bg-brand/10 border border-brand/30 rounded-md p-4">
          <h4 className="text-sm font-medium text-brand-strong mb-2">
            {t("merchant.warehouses.aboutTitle")}
          </h4>
          <ul className="text-xs text-brand-strong space-y-1">
            <li>{t("merchant.warehouses.aboutPriority")}</li>
            <li>{t("merchant.warehouses.aboutInactive")}</li>
            <li>{t("merchant.warehouses.aboutSuspended")}</li>
          </ul>
        </div>
      </div>

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
    </div>
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
        <div className="bg-gray-50 rounded-lg p-3 text-xs">
          <p className="font-mono">{warehouse.warehouseId}</p>
          <p className="text-gray-500 mt-1">{warehouse.address || "—"}</p>
        </div>
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
