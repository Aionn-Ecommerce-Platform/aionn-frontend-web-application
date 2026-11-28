"use client";

import { FormEvent, useDeferredValue, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Clock,
  Eye,
  Gift,
  Loader2,
  PauseCircle,
  PlayCircle,
  Plus,
  Search,
  Ticket,
} from "lucide-react";
import toast from "react-hot-toast";
import { Badge, Button, EmptyState, Modal, Select } from "@/shared/ui";
import { ConsoleFilterDropdown } from "@/features/merchant";
import StateView from "@/shared/ui/StateView";
import type { IssueVoucherInput } from "@/lib/services";
import type { Voucher } from "@/types";
import { formatCurrency, formatDate, formatDateTime } from "@/shared/lib/utils";
import { getErrorMessage } from "@/shared/lib/errors";
import { useTranslation } from "@/hooks";

type Props = {
  title: string;
  description?: string;
  queryKey: readonly unknown[];
  load: (params?: VoucherQuery) => Promise<Voucher[]>;
  issue: (input: IssueVoucherInput) => Promise<Voucher>;
  setActive?: (voucherCode: string, active: boolean) => Promise<Voucher>;
  variant?: "light" | "console";
};

const initialForm = {
  voucherCode: "",
  discountAmount: "",
  minOrderValue: "",
  usageLimit: "",
  validFrom: "",
  validUntil: "",
  type: "ORDER_DISCOUNT" as "ORDER_DISCOUNT" | "FREE_SHIPPING",
};

type DiscountFilter = "all" | "lt50" | "50to100" | "100to200" | "gte200";

type VoucherQuery = {
  search?: string;
  active?: boolean;
  discountMin?: number;
  discountMax?: number;
};

export default function VoucherManagement({
  title,
  description,
  queryKey,
  load,
  issue,
  setActive,
  variant = "light",
}: Props) {
  const { t, locale } = useTranslation();
  const isConsole = variant === "console";
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [search, setSearch] = useState("");
  const [discountFilter, setDiscountFilter] = useState<DiscountFilter>("all");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "ACTIVE" | "INACTIVE"
  >("all");
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const deferredSearch = useDeferredValue(search);

  const discountRange = (() => {
    switch (discountFilter) {
      case "lt50":
        return { discountMax: 50000 };
      case "50to100":
        return { discountMin: 50000, discountMax: 100000 };
      case "100to200":
        return { discountMin: 100000, discountMax: 200000 };
      case "gte200":
        return { discountMin: 200000 };
      default:
        return {};
    }
  })();

  const { data: vouchers, isLoading } = useQuery({
    queryKey: [
      ...queryKey,
      "list",
      deferredSearch,
      statusFilter,
      discountFilter,
    ],
    queryFn: () =>
      load({
        search: deferredSearch.trim() || undefined,
        active: statusFilter === "all" ? undefined : statusFilter === "ACTIVE",
        ...discountRange,
      }),
  });
  const { data: statsVouchers } = useQuery({
    queryKey: [...queryKey, "stats"],
    queryFn: () => load(),
    enabled: isConsole,
  });

  const mutation = useMutation({
    mutationFn: issue,
    onSuccess: () => {
      toast.success(t("promotions.mgmtCreateSuccess"));
      setForm(initialForm);
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const activeMutation = useMutation({
    mutationFn: ({
      voucherCode,
      active,
    }: {
      voucherCode: string;
      active: boolean;
    }) => setActive!(voucherCode, active),
    onSuccess: (updated, variables) => {
      toast.success(
        variables.active
          ? t("merchant.vouchers.toastActivated")
          : t("merchant.vouchers.toastDeactivated"),
      );
      setSelectedVoucher((current) =>
        current && current.voucherCode === updated.voucherCode
          ? updated
          : current,
      );
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    mutation.mutate({
      voucherCode: form.voucherCode.trim().toUpperCase(),
      discountAmount: Number(form.discountAmount),
      currency: "VND",
      minOrderValue: form.minOrderValue
        ? Number(form.minOrderValue)
        : undefined,
      usageLimit: Number(form.usageLimit),
      validFrom: new Date(form.validFrom).toISOString(),
      validUntil: new Date(form.validUntil).toISOString(),
      type: form.type,
    });
  };

  const voucherList = statsVouchers ?? vouchers ?? [];
  const [now] = useState(() => Date.now());
  const activeVoucherCount = voucherList.filter(
    (voucher) =>
      voucher.validUntil != null &&
      new Date(voucher.validUntil).getTime() > now &&
      (voucher.usageLimit === 0 || voucher.usedCount < voucher.usageLimit),
  ).length;
  const usedVoucherCount = voucherList.reduce(
    (sum, voucher) => sum + voucher.usedCount,
    0,
  );
  const remainingVoucherCount = voucherList.reduce(
    (sum, voucher) =>
      sum +
      (voucher.usageLimit > 0
        ? Math.max(voucher.usageLimit - voucher.usedCount, 0)
        : 0),
    0,
  );
  const voucherStats = [
    {
      label: t("merchant.vouchers.statsTotal"),
      value: voucherList.length,
      icon: Ticket,
      iconClass: "text-purple-300",
    },
    {
      label: t("merchant.vouchers.statsActive"),
      value: activeVoucherCount,
      icon: CheckCircle2,
      iconClass: "text-emerald-300",
    },
    {
      label: t("merchant.vouchers.statsUsed"),
      value: usedVoucherCount,
      icon: Clock,
      iconClass: "text-sky-300",
    },
    {
      label: t("merchant.vouchers.statsRemaining"),
      value: remainingVoucherCount,
      icon: Gift,
      iconClass: "text-amber-300",
    },
  ];

  const filteredVouchers = vouchers ?? [];

  return (
    <>
      <div className={isConsole ? "console-dark" : "bg-gray-50 min-h-screen"}>
        <div
          className={
            isConsole ? "" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
          }
        >
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
            <div>
              <h1
                className={
                  isConsole
                    ? "flex items-center gap-2 text-2xl font-extrabold tracking-tight text-purple-300"
                    : "text-2xl font-bold text-gray-900"
                }
              >
                {isConsole && <Ticket size={22} className="text-purple-300" />}
                {title}
              </h1>
              {description && (
                <p className="text-sm text-gray-500 mt-1">{description}</p>
              )}
            </div>
            {isConsole ? (
              <button
                type="button"
                onClick={() => setShowForm((value) => !value)}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-purple-900/40 transition-all hover:from-purple-500 hover:to-fuchsia-500"
              >
                <Plus size={16} />
                {t("promotions.mgmtCreateBtn")}
              </button>
            ) : (
              <Button onClick={() => setShowForm((value) => !value)}>
                <Plus size={16} className="mr-1" />{" "}
                {t("promotions.mgmtCreateBtn")}
              </Button>
            )}
          </div>

          {isConsole && (
            <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {voucherStats.map((stat) => {
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
          )}

          {isConsole && (
            <div className="relative z-30 mb-5 flex flex-wrap items-center gap-2.5">
              <div className="relative min-w-64 flex-1">
                <Search
                  size={17}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t("merchant.vouchers.searchPlaceholder")}
                  className="w-full rounded-xl border border-gray-500 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-purple-400/70 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                />
              </div>
              <ConsoleFilterDropdown
                label={t("merchant.vouchers.statusFilterLabel")}
                value={statusFilter}
                options={[
                  {
                    value: "all",
                    label: t("merchant.vouchers.statusAll"),
                  },
                  {
                    value: "ACTIVE",
                    label: t("merchant.vouchers.statusActive"),
                  },
                  {
                    value: "INACTIVE",
                    label: t("merchant.vouchers.statusInactive"),
                  },
                ]}
                onChange={(value) =>
                  setStatusFilter(value as "all" | "ACTIVE" | "INACTIVE")
                }
                menuClassName="w-52"
              />
              <ConsoleFilterDropdown
                label={t("merchant.vouchers.discountFilterLabel")}
                value={discountFilter}
                options={[
                  {
                    value: "all",
                    label: t("merchant.vouchers.filterAll"),
                  },
                  {
                    value: "lt50",
                    label: t("merchant.vouchers.filterUnder50"),
                  },
                  {
                    value: "50to100",
                    label: t("merchant.vouchers.filter50To100"),
                  },
                  {
                    value: "100to200",
                    label: t("merchant.vouchers.filter100To200"),
                  },
                  {
                    value: "gte200",
                    label: t("merchant.vouchers.filterOver200"),
                  },
                ]}
                onChange={(value) => setDiscountFilter(value as DiscountFilter)}
                menuClassName="w-56"
              />
            </div>
          )}

          {isLoading ? (
            <div className="py-16 flex justify-center">
              <Loader2
                className={
                  isConsole
                    ? "animate-spin text-purple-400"
                    : "animate-spin text-blue-600"
                }
              />
            </div>
          ) : !vouchers?.length ? (
            isConsole ? (
              <StateView
                tone="dark"
                icon={Ticket}
                title={t("promotions.mgmtEmptyTitle")}
                description={t("promotions.mgmtEmptyDesc")}
                className="rounded-2xl border border-gray-600 bg-white/[0.03]"
              />
            ) : (
              <EmptyState
                icon={Ticket}
                title={t("promotions.mgmtEmptyTitle")}
                description={t("promotions.mgmtEmptyDesc")}
              />
            )
          ) : isConsole && filteredVouchers.length === 0 ? (
            <StateView
              tone="dark"
              icon={Ticket}
              title={t("merchant.vouchers.noResultsTitle")}
              description={t("merchant.vouchers.noResultsDescription")}
              className="rounded-2xl border border-gray-600 bg-white/[0.03]"
            />
          ) : isConsole ? (
            <div className="overflow-hidden rounded-2xl border border-gray-600 bg-white/[0.04]">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-600/60 bg-white/[0.03]">
                      {[
                        "mgmtColCode",
                        "mgmtColStatus",
                        "mgmtColDiscount",
                        "mgmtColMinOrder",
                        "mgmtColUsage",
                        "mgmtColExpiry",
                        "mgmtColActions",
                      ].map((key) => (
                        <th
                          key={key}
                          className="whitespace-nowrap px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                        >
                          {t(`promotions.${key}`)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVouchers.map((v) => {
                      return (
                        <tr
                          key={v.voucherCode}
                          className="border-b border-slate-600/60 transition-colors last:border-0 hover:bg-white/[0.04]"
                        >
                          <td className="whitespace-nowrap px-4 py-3 text-center">
                            <p className="font-mono text-[13px] font-semibold text-white">
                              {v.voucherCode}
                            </p>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-center">
                            <span
                              className={`inline-flex items-center whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold ${
                                v.active === false
                                  ? "border-slate-500/40 bg-white/5 text-slate-300"
                                  : "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                              }`}
                            >
                              {v.active === false
                                ? t("merchant.vouchers.statusInactive")
                                : t("merchant.vouchers.statusActive")}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-center">
                            <p className="text-sm font-bold text-white">
                              {formatCurrency(
                                v.discountAmount,
                                v.currency,
                                locale,
                              )}
                            </p>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-center text-xs text-slate-300">
                            {v.minOrderValue && v.minOrderValue > 0
                              ? formatCurrency(
                                  v.minOrderValue,
                                  v.currency,
                                  locale,
                                )
                              : t("myVouchers.noMinOrder")}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-center">
                            <p className="text-sm font-semibold text-white">
                              {v.usageLimit > 0
                                ? `${v.usedCount}/${v.usageLimit}`
                                : v.usedCount}
                            </p>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-center text-xs text-slate-300">
                            {v.validUntil
                              ? formatDate(v.validUntil, locale)
                              : "N/A"}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <div className="flex items-center justify-center">
                              <button
                                type="button"
                                title={t("merchant.vouchers.viewDetail")}
                                aria-label={t("merchant.vouchers.viewDetail")}
                                onClick={() => setSelectedVoucher(v)}
                                className="rounded-lg p-1.5 text-sky-300 transition-colors hover:text-sky-200"
                              >
                                <Eye size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vouchers.map((v) => {
                const isShop = v.scope === "SHOP";
                const isFreeship = v.type === "FREE_SHIPPING";
                let leftBgColor = "bg-commerce";
                let leftTagText = t("promotions.platformLabel");
                if (isFreeship) {
                  leftBgColor = "bg-shipping";
                  leftTagText = t("promotions.freeshipLabel");
                } else if (isShop) {
                  leftBgColor = "bg-shop";
                  leftTagText = t("promotions.tabShop");
                }
                const expiryString = v.validUntil
                  ? formatDate(v.validUntil, locale)
                  : "N/A";
                const progressPercent =
                  v.usageLimit > 0 ? (v.usedCount / v.usageLimit) * 100 : 0;
                const remainingClaims = Math.max(v.usageLimit - v.usedCount, 0);

                return (
                  <div
                    key={v.voucherCode}
                    className="relative flex bg-white border border-gray-200 rounded-xl hover:shadow-lg transition-all min-h-[128px]"
                  >
                    <div className="absolute top-0 left-28 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-gray-50 border border-gray-200 z-10" />
                    <div className="absolute bottom-0 left-28 -translate-x-1/2 translate-y-1/2 w-4 h-4 rounded-full bg-gray-50 border border-gray-200 z-10" />

                    <div
                      className={`w-28 flex flex-col items-center justify-center text-white px-2 text-center select-none shrink-0 relative ${leftBgColor}`}
                    >
                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mb-1">
                        <Ticket size={20} className="text-white" />
                      </div>
                      <span className="max-w-full break-words px-1 text-center text-xs font-black uppercase leading-tight tracking-wide drop-shadow">
                        {leftTagText}
                      </span>
                      <span className="text-[9px] opacity-80 font-mono mt-0.5">
                        {v.scope}
                      </span>
                    </div>

                    <div className="flex-1 flex flex-col justify-between py-5 px-5 pl-6 border-l border-dashed border-gray-200 relative">
                      <div>
                        <h3 className="text-base font-extrabold text-gray-900 leading-tight mb-2">
                          {t("promotions.discountAmount", {
                            amount: formatCurrency(
                              v.discountAmount,
                              v.currency,
                            ),
                          })}
                        </h3>
                        <div className="mt-1.5 space-y-1 text-xs text-gray-500">
                          <p className="font-semibold text-gray-800 font-mono">
                            {v.voucherCode}
                          </p>
                          <p>
                            {v.minOrderValue && v.minOrderValue > 0
                              ? t("myVouchers.minOrder", {
                                  amount: formatCurrency(
                                    v.minOrderValue,
                                    v.currency,
                                    locale,
                                  ),
                                })
                              : t("myVouchers.noMinOrder")}
                          </p>
                          <div className="flex items-center gap-1 text-[11px] text-gray-400">
                            <Clock size={11} />
                            <span>
                              {t("promotions.validUntil", {
                                date: expiryString,
                              })}
                            </span>
                          </div>
                          {v.usageLimit > 0 && (
                            <div
                              className={`text-[11px] font-bold mt-1 ${
                                isFreeship
                                  ? "text-shipping"
                                  : isShop
                                    ? "text-shop"
                                    : "text-commerce"
                              }`}
                            >
                              {t("promotions.stockLeft", {
                                count: remainingClaims,
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {v.usageLimit > 0 && (
                        <div className="mt-3.5">
                          <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                isFreeship
                                  ? "bg-shipping"
                                  : isShop
                                    ? "bg-shop"
                                    : "bg-commerce"
                              }`}
                              style={{
                                width: `${Math.min(progressPercent, 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={t("promotions.mgmtCreateBtn")}
      >
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                {t("promotions.mgmtFieldCode")}
              </label>
              <input
                required
                maxLength={50}
                value={form.voucherCode}
                onChange={(e) =>
                  setForm({ ...form, voucherCode: e.target.value })
                }
                placeholder="SHOP50K"
                className="w-full rounded-lg border border-gray-400 px-3 py-2 text-sm uppercase focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                {t("promotions.mgmtFieldDiscount")}
              </label>
              <input
                required
                type="number"
                min="1"
                value={form.discountAmount}
                onChange={(e) =>
                  setForm({ ...form, discountAmount: e.target.value })
                }
                className="w-full rounded-lg border border-gray-400 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                {t("promotions.mgmtFieldMinOrder")}
              </label>
              <input
                required={form.type === "ORDER_DISCOUNT"}
                type="number"
                min={form.type === "ORDER_DISCOUNT" ? "1" : "0"}
                value={form.minOrderValue}
                onChange={(e) =>
                  setForm({ ...form, minOrderValue: e.target.value })
                }
                placeholder="199000"
                className="w-full rounded-lg border border-gray-400 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                {t("promotions.mgmtFieldUsageLimit")}
              </label>
              <input
                required
                type="number"
                min="1"
                value={form.usageLimit}
                onChange={(e) =>
                  setForm({ ...form, usageLimit: e.target.value })
                }
                className="w-full rounded-lg border border-gray-400 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
          </div>

          <Select
            label={t("promotions.mgmtFieldType")}
            value={form.type}
            onChange={(value) =>
              setForm({
                ...form,
                type: value as "ORDER_DISCOUNT" | "FREE_SHIPPING",
              })
            }
            options={[
              {
                value: "ORDER_DISCOUNT",
                label: t("promotions.mgmtTypeOrder"),
              },
              {
                value: "FREE_SHIPPING",
                label: t("promotions.mgmtTypeFreeship"),
              },
            ]}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                {t("promotions.mgmtFieldStart")}
              </label>
              <input
                required
                type="datetime-local"
                value={form.validFrom}
                onChange={(e) =>
                  setForm({ ...form, validFrom: e.target.value })
                }
                className="w-full rounded-lg border border-gray-400 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                {t("promotions.mgmtFieldEnd")}
              </label>
              <input
                required
                type="datetime-local"
                value={form.validUntil}
                onChange={(e) =>
                  setForm({ ...form, validUntil: e.target.value })
                }
                className="w-full rounded-lg border border-gray-400 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowForm(false)}
              disabled={mutation.isPending}
            >
              {t("promotions.mgmtCancelBtn")}
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              {t("promotions.mgmtIssueBtn")}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={selectedVoucher !== null}
        onClose={() => setSelectedVoucher(null)}
        title={t("merchant.vouchers.detailTitle")}
        size="full"
      >
        {selectedVoucher && (
          <div className="max-h-[80vh] space-y-6 overflow-y-auto pr-2 text-sm">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-gray-500">{t("promotions.mgmtColCode")}</p>
                <p className="mt-1 break-all font-mono text-sm font-semibold text-gray-900">
                  {selectedVoucher.voucherCode}
                </p>
              </div>
              <div>
                <p className="text-gray-500">{t("promotions.mgmtColStatus")}</p>
                <Badge
                  variant={
                    selectedVoucher.active === false ? "default" : "success"
                  }
                  className="!mt-1 !rounded-full !px-3 !py-1 !text-xs"
                >
                  {selectedVoucher.active === false
                    ? t("merchant.vouchers.statusInactive")
                    : t("merchant.vouchers.statusActive")}
                </Badge>
              </div>
              <div>
                <p className="text-gray-500">
                  {t("promotions.mgmtColDiscount")}
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {formatCurrency(
                    selectedVoucher.discountAmount,
                    selectedVoucher.currency,
                    locale,
                  )}
                </p>
              </div>
              <div>
                <p className="text-gray-500">
                  {t("promotions.mgmtColMinOrder")}
                </p>
                <p className="mt-1 font-medium text-gray-900">
                  {selectedVoucher.minOrderValue &&
                  selectedVoucher.minOrderValue > 0
                    ? formatCurrency(
                        selectedVoucher.minOrderValue,
                        selectedVoucher.currency,
                        locale,
                      )
                    : t("myVouchers.noMinOrder")}
                </p>
              </div>
              <div>
                <p className="text-gray-500">{t("promotions.mgmtFieldType")}</p>
                <p className="mt-1 font-medium text-gray-900">
                  {selectedVoucher.type === "FREE_SHIPPING"
                    ? t("promotions.mgmtTypeFreeship")
                    : t("promotions.mgmtTypeOrder")}
                </p>
              </div>
              <div>
                <p className="text-gray-500">{t("promotions.mgmtColUsage")}</p>
                <p className="mt-1 font-medium text-gray-900">
                  {selectedVoucher.usedCount}
                  {selectedVoucher.usageLimit > 0
                    ? ` / ${selectedVoucher.usageLimit}`
                    : ""}
                </p>
              </div>
              {selectedVoucher.usageLimit > 0 && (
                <div>
                  <p className="text-gray-500">
                    {t("merchant.vouchers.statsRemaining")}
                  </p>
                  <p className="mt-1 font-medium text-gray-900">
                    {Math.max(
                      selectedVoucher.usageLimit - selectedVoucher.usedCount,
                      0,
                    )}
                  </p>
                </div>
              )}
              <div>
                <p className="text-gray-500">
                  {t("promotions.mgmtFieldStart")}
                </p>
                <p className="mt-1 font-medium text-gray-900">
                  {selectedVoucher.validFrom
                    ? formatDateTime(selectedVoucher.validFrom, locale)
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-gray-500">{t("promotions.mgmtFieldEnd")}</p>
                <p className="mt-1 font-medium text-gray-900">
                  {selectedVoucher.validUntil
                    ? formatDateTime(selectedVoucher.validUntil, locale)
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-gray-500">
                  {t("merchant.vouchers.detailCreatedAt")}
                </p>
                <p className="mt-1 font-medium text-gray-900">
                  {formatDateTime(selectedVoucher.createdAt, locale)}
                </p>
              </div>
              <div>
                <p className="text-gray-500">
                  {t("merchant.vouchers.detailUpdatedAt")}
                </p>
                <p className="mt-1 font-medium text-gray-900">
                  {formatDateTime(selectedVoucher.updatedAt, locale)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-gray-300 pt-4">
              {setActive && (
                <Button
                  variant={
                    selectedVoucher.active === false ? "success" : "warning"
                  }
                  loading={activeMutation.isPending}
                  onClick={() =>
                    activeMutation.mutate({
                      voucherCode: selectedVoucher.voucherCode,
                      active: selectedVoucher.active === false,
                    })
                  }
                >
                  {selectedVoucher.active === false ? (
                    <PlayCircle size={14} className="mr-1.5" />
                  ) : (
                    <PauseCircle size={14} className="mr-1.5" />
                  )}
                  {selectedVoucher.active === false
                    ? t("merchant.vouchers.activate")
                    : t("merchant.vouchers.deactivate")}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setSelectedVoucher(null)}
              >
                {t("common.close")}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
