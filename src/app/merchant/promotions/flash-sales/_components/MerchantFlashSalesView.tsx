"use client";

import { useDeferredValue, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Clock,
  Loader2,
  Plus,
  Search,
  Sparkles,
  X,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button, Modal, Pagination } from "@/shared/ui";
import AuthGuard from "@/components/auth/AuthGuard";
import { campaignService, productService } from "@/lib/services";
import {
  ConsoleEmptyState,
  ConsoleFilterDropdown,
  ConsolePanel,
  ConsoleStatGrid,
} from "@/features/merchant";
import {
  flashSaleService,
  type FlashSaleRegistration,
  type FlashSaleRegistrationStatus,
} from "@/lib/services/flash-sale.service";
import { getErrorMessage } from "@/shared/lib/errors";
import { formatCurrency } from "@/shared/lib/utils";
import { formatVariantLabel } from "@/shared/lib/product-utils";
import { useTranslation } from "@/hooks";

const PAGE_SIZE = 50;

const TAB_KEYS: Array<FlashSaleRegistrationStatus | "all"> = [
  "all",
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
];

const STATUS_BADGE_CLASS = {
  PENDING: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  APPROVED: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  REJECTED: "border-rose-400/30 bg-rose-400/10 text-rose-300",
  CANCELLED: "border-slate-500/40 bg-white/5 text-slate-300",
} as const;
const STATUS_MESSAGE_KEYS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
} as const;

function MerchantFlashSalesInner() {
  const { t, locale } = useTranslation();
  const qc = useQueryClient();
  const [tab, setTab] = useState<(typeof TAB_KEYS)[number]>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [now] = useState(() => Date.now());
  const [registering, setRegistering] = useState(false);
  const [cancelling, setCancelling] = useState<FlashSaleRegistration | null>(
    null,
  );
  const deferredSearch = useDeferredValue(search);

  const { data, isLoading } = useQuery({
    queryKey: ["merchant-flash-sales", "list", tab, deferredSearch],
    queryFn: () =>
      flashSaleService.listMine(
        tab === "all" ? undefined : tab,
        100,
        deferredSearch.trim() || undefined,
      ),
  });
  const { data: statsData } = useQuery({
    queryKey: ["merchant-flash-sales", "stats"],
    queryFn: () => flashSaleService.listMine(undefined, 100),
  });

  const items = data ?? [];
  const statsItems = statsData ?? [];
  const filtered = items;

  const skuIds = [...new Set(items.map((item) => item.skuId))];
  const { data: products = [] } = useQuery({
    queryKey: ["flash-sale-products", skuIds.join(",")],
    queryFn: () => productService.resolveBySkuIds(skuIds),
    enabled: skuIds.length > 0,
  });
  const campaignIds = [...new Set(items.map((item) => item.campaignId))];
  const { data: campaigns = [] } = useQuery({
    queryKey: ["flash-sale-campaign-names", campaignIds.join(",")],
    queryFn: async () => {
      const rows = await Promise.all(
        campaignIds.map((campaignId) =>
          campaignService.get(campaignId).catch(() => null),
        ),
      );
      return rows.filter((campaign): campaign is NonNullable<typeof campaign> =>
        Boolean(campaign),
      );
    },
    enabled: campaignIds.length > 0,
  });

  const skuLookup = new Map<
    string,
    { productName: string; variantLabel: string }
  >();
  products.forEach((product) => {
    product.variants.forEach((variant) => {
      skuLookup.set(variant.skuId, {
        productName: product.name,
        variantLabel:
          formatVariantLabel(variant.attributeValues) ||
          t("merchant.flashSales.register.defaultVariant"),
      });
    });
  });
  const campaignNames = new Map(
    campaigns.map((campaign) => [campaign.campaignId, campaign.name]),
  );
  const campaignLookup = new Map(
    campaigns.map((campaign) => [campaign.campaignId, campaign]),
  );

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visibleItems = items.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const countByStatus = (status: FlashSaleRegistrationStatus) =>
    statsItems.filter((item) => item.status === status).length;
  const flashSaleStats = [
    {
      label: t("merchant.flashSales.stats.total"),
      value: statsItems.length,
      icon: Sparkles,
      iconClass: "text-purple-300",
    },
    {
      label: t("merchant.flashSales.stats.pending"),
      value: countByStatus("PENDING"),
      icon: Clock,
      iconClass: "text-amber-300",
    },
    {
      label: t("merchant.flashSales.stats.approved"),
      value: countByStatus("APPROVED"),
      icon: CheckCircle2,
      iconClass: "text-emerald-300",
    },
    {
      label: t("merchant.flashSales.stats.rejected"),
      value: countByStatus("REJECTED") + countByStatus("CANCELLED"),
      icon: XCircle,
      iconClass: "text-rose-300",
    },
  ];

  const cancelMutation = useMutation({
    mutationFn: (registrationId: string) =>
      flashSaleService.cancel(registrationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["merchant-flash-sales"] });
      toast.success(t("merchant.flashSales.toast.cancelled"));
      setCancelling(null);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <ConsolePanel>
      <div className="console-dark">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-purple-300">
            <Sparkles size={22} className="text-purple-300" />
            {t("merchant.flashSales.title")}
          </h1>
          <button
            type="button"
            onClick={() => setRegistering(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-purple-900/40 transition-all hover:from-purple-500 hover:to-fuchsia-500"
          >
            <Plus size={16} />
            {t("merchant.flashSales.registerNew")}
          </button>
        </div>

        <ConsoleStatGrid
          stats={flashSaleStats}
          columnsClassName="lg:grid-cols-4"
        />

        <div className="relative z-30 mb-5 flex flex-wrap items-center gap-2.5">
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
              placeholder={t("merchant.flashSales.searchPlaceholder")}
              className="w-full rounded-xl border border-gray-500 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-purple-400/70 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
            />
          </div>
          <ConsoleFilterDropdown
            label={t("merchant.flashSales.statusFilterLabel")}
            value={tab}
            options={TAB_KEYS.map((key) => ({
              value: key,
              label:
                key === "all"
                  ? t("merchant.flashSales.tabs.all")
                  : t(`merchant.flashSales.status.${STATUS_MESSAGE_KEYS[key]}`),
              count:
                key === "all"
                  ? statsItems.length
                  : statsItems.filter((item) => item.status === key).length,
            }))}
            onChange={(value) => {
              setTab(value as (typeof TAB_KEYS)[number]);
              setPage(1);
            }}
            menuClassName="w-56"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-purple-400" size={28} />
          </div>
        ) : filtered.length === 0 ? (
          <ConsoleEmptyState
            icon={Sparkles}
            title={t("merchant.flashSales.empty.title")}
            description={
              tab === "all"
                ? t("merchant.flashSales.empty.descriptionAll")
                : t("merchant.flashSales.empty.descriptionFiltered")
            }
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-600 bg-white/[0.04]">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-600/60 bg-white/[0.03]">
                    <th className="whitespace-nowrap px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      {t("merchant.flashSales.table.productSku")}
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      {t("merchant.flashSales.table.campaign")}
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      {t("merchant.flashSales.table.priceStockSold")}
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      {t("merchant.flashSales.table.status")}
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      {t("merchant.flashSales.table.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibleItems.map((r) => {
                    const info = skuLookup.get(r.skuId);
                    const campaign = campaignLookup.get(r.campaignId);
                    const ended =
                      r.status === "APPROVED" &&
                      (campaign?.status === "ENDED" ||
                        (campaign != null &&
                          new Date(campaign.endDate).getTime() <= now));
                    return (
                      <tr
                        key={r.registrationId}
                        className="border-b border-slate-600/60 transition-colors last:border-0 hover:bg-white/[0.04]"
                      >
                        <td className="px-4 py-3 text-center">
                          <p className="text-sm font-semibold text-white">
                            {info?.productName ?? "—"}
                          </p>
                          <p className="text-xs text-slate-400">
                            {info?.variantLabel ?? "—"}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <p className="text-sm font-medium text-slate-200">
                            {campaignNames.get(r.campaignId) ?? "—"}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <p className="text-sm font-semibold text-white">
                            {formatCurrency(r.salePrice, r.currency, locale)}
                          </p>
                          <p className="text-xs text-slate-400">
                            {t("merchant.flashSales.soldOfStock", {
                              sold: r.soldCount,
                              stock: r.saleStock,
                            })}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex items-center whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold ${
                              ended
                                ? "border-slate-500/40 bg-white/5 text-slate-300"
                                : STATUS_BADGE_CLASS[r.status]
                            }`}
                          >
                            {ended
                              ? t("merchant.flashSales.status.ended")
                              : t(
                                  `merchant.flashSales.status.${STATUS_MESSAGE_KEYS[r.status]}`,
                                )}
                          </span>
                          {r.rejectReason && (
                            <p className="mt-1 max-w-[180px] text-xs text-rose-300">
                              {r.rejectReason}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {r.status === "PENDING" ? (
                            <button
                              type="button"
                              onClick={() => setCancelling(r)}
                              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-rose-300 transition-colors hover:text-rose-200"
                            >
                              <X size={14} />
                              {t("merchant.flashSales.cancelShort")}
                            </button>
                          ) : (
                            <span className="text-xs text-slate-500">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!isLoading && items.length > 0 && (
          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        )}
      </div>

      {registering && (
        <RegisterModal
          onClose={() => setRegistering(false)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ["merchant-flash-sales"] });
            setRegistering(false);
          }}
        />
      )}

      <Modal
        isOpen={cancelling !== null}
        onClose={() => setCancelling(null)}
        title={t("merchant.flashSales.cancelModal.title")}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {t("merchant.flashSales.cancelModal.confirm")}
          </p>
          {cancelling && (
            <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-1">
              <p>
                <span className="text-gray-500">SKU:</span>{" "}
                <span className="font-mono">{cancelling.skuId}</span>
              </p>
              <p>
                <span className="text-gray-500">Campaign:</span>{" "}
                <span className="font-mono">{cancelling.campaignId}</span>
              </p>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setCancelling(null)}
              disabled={cancelMutation.isPending}
            >
              {t("merchant.flashSales.cancelModal.back")}
            </Button>
            <Button
              onClick={() =>
                cancelling && cancelMutation.mutate(cancelling.registrationId)
              }
              loading={cancelMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {t("merchant.flashSales.cancelModal.confirmButton")}
            </Button>
          </div>
        </div>
      </Modal>
    </ConsolePanel>
  );
}
import { RegisterModal } from "./RegisterModal";

export default function MerchantFlashSalesPage() {
  return (
    <AuthGuard requiredRoles={["MERCHANT"]}>
      <MerchantFlashSalesInner />
    </AuthGuard>
  );
}
