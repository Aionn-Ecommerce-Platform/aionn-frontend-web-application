"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, XCircle, Zap } from "lucide-react";
import toast from "react-hot-toast";
import { Button, Modal, Pagination } from "@/shared/ui";
import {
  AdminEmpty,
  AdminHeader,
  AdminPill,
  AdminSearch,
  AdminStats,
  AdminTable,
  adminRow,
  adminTd,
  adminTh,
} from "@/features/admin";
import AuthGuard from "@/components/auth/AuthGuard";
import {
  campaignService,
  flashSaleService,
  merchantService,
  productService,
} from "@/lib/services";
import type {
  FlashSaleRegistration,
  FlashSaleRegistrationStatus,
} from "@/lib/services/flash-sale.service";
import type { PromotionCampaign } from "@/shared/types";
import { getErrorMessage } from "@/shared/lib/errors";
import { formatCurrency, formatDateTime } from "@/shared/lib/utils";
import { formatVariantLabel } from "@/shared/lib/product-utils";
import { useTranslation, useDebounce } from "@/hooks";

const PAGE_SIZE = 50;

const TABS: Array<{ key: FlashSaleRegistrationStatus; labelKey: string }> = [
  { key: "PENDING", labelKey: "statuses.flashSaleRegistration.PENDING" },
  { key: "APPROVED", labelKey: "statuses.flashSaleRegistration.APPROVED" },
  { key: "REJECTED", labelKey: "statuses.flashSaleRegistration.REJECTED" },
  { key: "CANCELLED", labelKey: "statuses.flashSaleRegistration.CANCELLED" },
];

const STATUS_TONE: Record<
  FlashSaleRegistrationStatus,
  "warning" | "success" | "danger" | "neutral"
> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  CANCELLED: "neutral",
};

function AdminFlashSalesInner() {
  const { t, locale } = useTranslation();
  const qc = useQueryClient();
  const [tab, setTab] = useState<FlashSaleRegistrationStatus>("PENDING");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rejectTarget, setRejectTarget] =
    useState<FlashSaleRegistration | null>(null);
  const [reason, setReason] = useState("");
  const debouncedSearch = useDebounce(search.trim(), 300);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-flash-sales", tab, debouncedSearch],
    queryFn: () =>
      flashSaleService.listByStatus(tab, 100, debouncedSearch || undefined),
  });
  const items = useMemo(() => data ?? [], [data]);

  const { data: counts } = useQuery({
    queryKey: ["admin-flash-sales-counts"],
    queryFn: async () => {
      const lists = await Promise.all(
        TABS.map((entry) => flashSaleService.listByStatus(entry.key, 100)),
      );
      return TABS.reduce<Record<FlashSaleRegistrationStatus, number>>(
        (acc, entry, index) => {
          acc[entry.key] = lists[index]?.length ?? 0;
          return acc;
        },
        { PENDING: 0, APPROVED: 0, REJECTED: 0, CANCELLED: 0 },
      );
    },
  });

  const skuIds = useMemo(
    () => [...new Set(items.map((item) => item.skuId))],
    [items],
  );
  const campaignIds = useMemo(
    () => [...new Set(items.map((item) => item.campaignId))],
    [items],
  );
  const merchantIds = useMemo(
    () => [...new Set(items.map((item) => item.merchantId))],
    [items],
  );

  const { data: products = [] } = useQuery({
    queryKey: ["admin-flash-sale-products", skuIds.join(",")],
    queryFn: () => productService.resolveBySkuIds(skuIds),
    enabled: skuIds.length > 0,
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ["admin-flash-sale-campaigns", campaignIds.join(",")],
    queryFn: async () => {
      const rows = await Promise.all(
        campaignIds.map((id) => campaignService.get(id).catch(() => null)),
      );
      return rows.filter((row): row is PromotionCampaign => row !== null);
    },
    enabled: campaignIds.length > 0,
  });

  const { data: merchants = [] } = useQuery({
    queryKey: ["admin-flash-sale-merchants", merchantIds.join(",")],
    queryFn: async () => {
      const rows = await Promise.all(
        merchantIds.map((id) => merchantService.get(id).catch(() => null)),
      );
      return rows.filter((row): row is NonNullable<typeof row> => row !== null);
    },
    enabled: merchantIds.length > 0,
  });

  const skuLookup = useMemo(() => {
    const map = new Map<
      string,
      { productName: string; variantLabel: string }
    >();
    products.forEach((product) => {
      product.variants.forEach((variant) => {
        map.set(variant.skuId, {
          productName: product.name,
          variantLabel:
            formatVariantLabel(variant.attributeValues) ||
            t("merchant.flashSales.register.defaultVariant"),
        });
      });
    });
    return map;
  }, [products, t]);

  const campaignLookup = useMemo(
    () => new Map(campaigns.map((item) => [item.campaignId, item])),
    [campaigns],
  );
  const merchantLookup = useMemo(
    () => new Map(merchants.map((item) => [item.merchantId, item])),
    [merchants],
  );

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const visible = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function refresh() {
    qc.invalidateQueries({ queryKey: ["admin-flash-sales"] });
    qc.invalidateQueries({ queryKey: ["admin-flash-sales-counts"] });
  }

  const approveMu = useMutation({
    mutationFn: (registrationId: string) =>
      flashSaleService.approve(registrationId),
    onSuccess: () => {
      toast.success(t("adminFlashSales.approveSuccess"));
      refresh();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const rejectMu = useMutation({
    mutationFn: (vars: { registrationId: string; reason: string }) =>
      flashSaleService.reject(vars.registrationId, vars.reason),
    onSuccess: () => {
      toast.success(t("adminFlashSales.rejectSuccess"));
      setRejectTarget(null);
      setReason("");
      refresh();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  function submitReject() {
    if (!rejectTarget) return;
    if (!reason.trim()) {
      toast.error(t("adminFlashSales.reasonRequired"));
      return;
    }
    rejectMu.mutate({
      registrationId: rejectTarget.registrationId,
      reason: reason.trim(),
    });
  }

  const displayCount = (value?: number) =>
    value === undefined ? 0 : value >= 100 ? "100+" : value;

  return (
    <div className="min-h-screen">
      <AdminHeader
        icon={Zap}
        title={t("adminFlashSales.title")}
        description={t("adminFlashSales.description")}
      />

      <AdminStats
        columns="lg:grid-cols-4"
        stats={TABS.map((entry) => ({
          label: t(entry.labelKey),
          value: displayCount(counts?.[entry.key]),
          icon: Zap,
          iconClass:
            entry.key === "PENDING"
              ? "text-amber-300"
              : entry.key === "APPROVED"
                ? "text-emerald-300"
                : entry.key === "REJECTED"
                  ? "text-rose-300"
                  : "text-slate-300",
        }))}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((entry) => (
          <button
            key={entry.key}
            type="button"
            onClick={() => {
              setTab(entry.key);
              setPage(1);
            }}
            className={`cursor-pointer rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors ${
              tab === entry.key
                ? "border-purple-400/50 bg-purple-600 text-white shadow-md shadow-purple-900/40"
                : "border-gray-500 bg-white/[0.03] text-slate-300 hover:border-white/30 hover:text-white"
            }`}
          >
            {t(entry.labelKey)}
          </button>
        ))}
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <AdminSearch
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder={t("adminFlashSales.searchPlaceholder")}
        />
        <p className="text-xs text-slate-400 sm:ml-auto">
          {t("adminConsole.totalCount", { count: items.length })}
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-purple-300" size={28} />
        </div>
      ) : visible.length === 0 ? (
        <AdminEmpty
          icon={Zap}
          title={t("adminFlashSales.emptyTitle")}
          description={t("adminFlashSales.emptyDescription")}
        />
      ) : (
        <>
          <AdminTable>
            <thead>
              <tr className="border-b border-slate-600/60 bg-white/[0.03]">
                <th className={adminTh}>{t("adminFlashSales.product")}</th>
                <th className={adminTh}>{t("adminFlashSales.campaign")}</th>
                <th className={adminTh}>{t("adminFlashSales.merchant")}</th>
                <th className={adminTh}>{t("adminFlashSales.salePrice")}</th>
                <th className={adminTh}>{t("adminFlashSales.stock")}</th>
                <th className={adminTh}>{t("common.status")}</th>
                <th className={adminTh}>{t("adminFlashSales.submitted")}</th>
                <th className={`${adminTh} text-right`}>
                  {t("common.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => {
                const sku = skuLookup.get(item.skuId);
                const campaign = campaignLookup.get(item.campaignId);
                const merchant = merchantLookup.get(item.merchantId);
                const soldPct =
                  item.saleStock > 0
                    ? Math.min(100, (item.soldCount / item.saleStock) * 100)
                    : 0;
                return (
                  <tr key={item.registrationId} className={adminRow}>
                    <td className={adminTd}>
                      <p className="font-semibold text-white">
                        {sku?.productName ?? item.productId}
                      </p>
                      <p className="text-xs text-slate-400">
                        {sku?.variantLabel ?? item.skuId}
                      </p>
                    </td>
                    <td className={adminTd}>
                      <p className="text-sm text-slate-200">
                        {campaign?.name ?? item.campaignId}
                      </p>
                      {campaign && (
                        <p className="text-xs text-slate-400">
                          {formatDateTime(campaign.startDate, locale)} →{" "}
                          {formatDateTime(campaign.endDate, locale)}
                        </p>
                      )}
                    </td>
                    <td className={adminTd}>
                      {merchant?.name ?? item.merchantId}
                    </td>
                    <td className={`${adminTd} whitespace-nowrap`}>
                      {formatCurrency(item.salePrice, item.currency, locale)}
                    </td>
                    <td className={adminTd}>
                      <p className="text-xs text-slate-300">
                        {t("adminFlashSales.soldOf", {
                          sold: item.soldCount,
                          stock: item.saleStock,
                        })}
                      </p>
                      <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500"
                          style={{ width: `${soldPct}%` }}
                        />
                      </div>
                    </td>
                    <td className={adminTd}>
                      <AdminPill tone={STATUS_TONE[item.status]}>
                        {t(`statuses.flashSaleRegistration.${item.status}`)}
                      </AdminPill>
                      {item.rejectReason && (
                        <p className="mt-1 max-w-[180px] text-xs text-rose-300">
                          {item.rejectReason}
                        </p>
                      )}
                    </td>
                    <td className={`${adminTd} whitespace-nowrap`}>
                      {formatDateTime(item.submittedAt, locale)}
                    </td>
                    <td className={`${adminTd} text-right`}>
                      {item.status === "PENDING" ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={approveMu.isPending}
                            onClick={() =>
                              approveMu.mutate(item.registrationId)
                            }
                            className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/10 hover:text-emerald-200 disabled:opacity-50"
                          >
                            {approveMu.isPending &&
                            approveMu.variables === item.registrationId ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <CheckCircle2 size={14} />
                            )}
                            {t("common.approved")}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setReason("");
                              setRejectTarget(item);
                            }}
                            className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-rose-300 transition-colors hover:bg-rose-500/10 hover:text-rose-200"
                          >
                            <XCircle size={14} />
                            {t("common.rejected")}
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
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
        isOpen={rejectTarget !== null}
        onClose={() => setRejectTarget(null)}
        title={t("adminFlashSales.rejectTitle")}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            {t("adminFlashSales.rejectHelp")}
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            placeholder={t("adminFlashSales.reasonPlaceholder")}
            className="w-full rounded-lg border border-gray-500 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setRejectTarget(null)}
              disabled={rejectMu.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="danger"
              onClick={submitReject}
              loading={rejectMu.isPending}
            >
              {t("common.rejected")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function AdminFlashSalesPage() {
  return (
    <AuthGuard requiredRoles={["SYSTEM_ADMIN"]}>
      <AdminFlashSalesInner />
    </AuthGuard>
  );
}
