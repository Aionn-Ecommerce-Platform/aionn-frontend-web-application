"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Loader2,
  Pencil,
  Plus,
  Search,
  Truck,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button, Modal, Pagination } from "@/shared/ui";
import {
  AdminEmpty,
  AdminHeader,
  AdminPill,
  AdminSearch,
  AdminTable,
  adminPrimaryClass,
  adminRow,
  adminTd,
  adminTh,
} from "@/features/admin";
import AuthGuard from "@/components/auth/AuthGuard";
import { shippingService } from "@/lib/services";
import {
  shippingRateService,
  type ShippingRate,
} from "@/lib/services/shipping.service";
import { getErrorMessage } from "@/shared/lib/errors";
import { formatDateTime, formatNumber } from "@/shared/lib/utils";
import { useDebounce, useTranslation } from "@/hooks";

const PAGE_SIZE = 20;

function formatFee(value: number | null, locale: string) {
  return value == null ? "—" : formatNumber(value, locale);
}

function AdminShippingRatesInner() {
  const { t, locale } = useTranslation();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [lookupId, setLookupId] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ShippingRate | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-shipping-rates", { zone: debouncedSearch.trim(), page }],
    queryFn: () =>
      shippingService.listRates({
        page: page - 1,
        size: PAGE_SIZE,
        zoneCode: debouncedSearch.trim() || undefined,
      }),
  });

  const rates = useMemo(() => data?.content ?? [], [data]);
  const totalElements = data?.totalElements ?? rates.length;
  const totalPages = Math.max(1, data?.totalPages ?? 1);

  const lookupMutation = useMutation({
    mutationFn: (id: string) => shippingRateService.get(id.trim()),
    onSuccess: (rate) => {
      setEditing(rate);
      setLookupId("");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const refreshList = () =>
    qc.invalidateQueries({ queryKey: ["admin-shipping-rates"] });

  return (
    <div className="min-h-screen">
      <AdminHeader
        icon={Truck}
        title={t("adminShippingRates.title")}
        description={t("adminShippingRates.description")}
        actions={
          <Button
            className={adminPrimaryClass}
            onClick={() => setCreating(true)}
          >
            <Plus size={16} />
            {t("adminShippingRates.add")}
          </Button>
        }
      />

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <AdminSearch
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder={t("adminShippingRates.searchPlaceholder")}
          ariaLabel={t("adminShippingRates.zoneCode")}
        />
        <div className="flex w-full gap-2 sm:max-w-md">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              size={16}
            />
            <input
              type="text"
              value={lookupId}
              aria-label={t("adminShippingRates.lookupLabel")}
              onChange={(event) => setLookupId(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && lookupId.trim()) {
                  lookupMutation.mutate(lookupId);
                }
              }}
              placeholder={t("adminShippingRates.lookupLabel")}
              className="w-full rounded-xl border border-gray-500 bg-white/5 py-2.5 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <Button
            variant="outline"
            className="border-white/20 text-slate-200 hover:bg-white/10"
            onClick={() => lookupMutation.mutate(lookupId)}
            loading={lookupMutation.isPending}
            disabled={!lookupId.trim()}
          >
            {t("adminShippingRates.lookup")}
          </Button>
        </div>
        <p className="text-xs text-slate-400 lg:ml-auto">
          {t("adminConsole.totalCount", { count: totalElements })}
        </p>
      </div>

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
      ) : rates.length === 0 ? (
        <AdminEmpty
          icon={Truck}
          title={t("common.noResults")}
          description={t("adminConsole.totalCount", { count: 0 })}
        />
      ) : (
        <>
          <AdminTable>
            <thead>
              <tr className="border-b border-slate-600/60 bg-white/[0.03]">
                <th className={adminTh}>{t("adminShippingRates.zoneCode")}</th>
                <th className={adminTh}>{t("adminShippingRates.condition")}</th>
                <th className={adminTh}>{t("adminShippingRates.baseFee")}</th>
                <th className={adminTh}>{t("adminShippingRates.currency")}</th>
                <th className={adminTh}>{t("adminShippingRates.maxFee")}</th>
                <th className={adminTh}>{t("adminShippingRates.updatedAt")}</th>
                <th className={`${adminTh} text-right`}>
                  {t("common.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rates.map((rate) => (
                <tr key={rate.rateId} className={adminRow}>
                  <td className={adminTd}>
                    <p className="font-mono font-semibold text-white">
                      {rate.zoneCode}
                    </p>
                    <p className="font-mono text-[11px] text-slate-500">
                      {rate.rateId}
                    </p>
                  </td>
                  <td className={adminTd}>
                    <span className="line-clamp-2 text-xs text-slate-300">
                      {rate.condition ?? "—"}
                    </span>
                  </td>
                  <td className={adminTd}>
                    {formatNumber(rate.baseFee, locale)}
                  </td>
                  <td className={adminTd}>
                    <AdminPill tone="purple">{rate.currency}</AdminPill>
                  </td>
                  <td className={adminTd}>{formatFee(rate.maxFee, locale)}</td>
                  <td className={`${adminTd} whitespace-nowrap text-xs`}>
                    {formatDateTime(rate.updatedAt, locale)}
                  </td>
                  <td className={`${adminTd} text-right`}>
                    <button
                      type="button"
                      onClick={() => setEditing(rate)}
                      aria-label={t("adminShippingRates.edit")}
                      className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      <Pencil size={16} />
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

      {creating && (
        <RateFormModal
          mode="create"
          onClose={() => setCreating(false)}
          onSuccess={() => {
            setCreating(false);
            void refreshList();
          }}
        />
      )}

      {editing && (
        <RateFormModal
          mode="edit"
          rate={editing}
          onClose={() => setEditing(null)}
          onSuccess={() => {
            setEditing(null);
            void refreshList();
          }}
        />
      )}
    </div>
  );
}

function RateFormModal({
  mode,
  rate,
  onClose,
  onSuccess,
}: {
  mode: "create" | "edit";
  rate?: ShippingRate;
  onClose: () => void;
  onSuccess: (saved: ShippingRate) => void;
}) {
  const { t } = useTranslation();
  const [zoneCode, setZoneCode] = useState(rate?.zoneCode ?? "");
  const [baseFee, setBaseFee] = useState(String(rate?.baseFee ?? ""));
  const [currency, setCurrency] = useState(rate?.currency ?? "VND");
  const [condition, setCondition] = useState(rate?.condition ?? "");
  const [baseWeightGram, setBaseWeightGram] = useState(
    String(rate?.baseWeightGram ?? 1000),
  );
  const [stepWeightGram, setStepWeightGram] = useState(
    String(rate?.stepWeightGram ?? 500),
  );
  const [stepFee, setStepFee] = useState(String(rate?.stepFee ?? 0));
  const [maxFee, setMaxFee] = useState(
    rate?.maxFee == null ? "" : String(rate.maxFee),
  );
  const [expressExtraFee, setExpressExtraFee] = useState(
    String(rate?.expressExtraFee ?? 0),
  );
  const [expressEtaDays, setExpressEtaDays] = useState(
    rate?.expressEtaDays == null ? "" : String(rate.expressEtaDays),
  );

  const weightFields = () => ({
    baseWeightGram: Number(baseWeightGram) || undefined,
    stepWeightGram: Number(stepWeightGram) || undefined,
    stepFee: Number(stepFee) || 0,
    maxFee: maxFee.trim() === "" ? null : Number(maxFee),
    expressExtraFee: Number(expressExtraFee) || 0,
    expressEtaDays:
      expressEtaDays.trim() === "" ? null : Number(expressEtaDays),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      shippingRateService.configure({
        zoneCode: zoneCode.trim(),
        baseFee: Number(baseFee),
        currency: currency.trim() || "VND",
        condition: condition.trim() || undefined,
        ...weightFields(),
      }),
    onSuccess: (saved) => {
      toast.success(t("adminShippingRates.created"));
      onSuccess(saved);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      shippingRateService.update(rate!.rateId, {
        baseFee: Number(baseFee),
        condition: condition.trim() || undefined,
        ...weightFields(),
      }),
    onSuccess: (saved) => {
      toast.success(t("adminShippingRates.updated"));
      onSuccess(saved);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const submit = () => {
    if (mode === "create" && !zoneCode.trim()) {
      toast.error(t("adminShippingRates.zoneRequired"));
      return;
    }
    const fee = Number(baseFee);
    if (Number.isNaN(fee) || fee < 0) {
      toast.error(t("adminShippingRates.invalidFee"));
      return;
    }
    if (mode === "create") createMutation.mutate();
    else updateMutation.mutate();
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={t(
        mode === "create"
          ? "adminShippingRates.createTitle"
          : "adminShippingRates.editTitle",
      )}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            {t("adminShippingRates.zoneCode")}
          </label>
          <input
            type="text"
            value={zoneCode}
            onChange={(e) => setZoneCode(e.target.value)}
            disabled={mode === "edit"}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm disabled:bg-gray-50"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t("adminShippingRates.baseFee")}
            </label>
            <input
              type="number"
              min="0"
              value={baseFee}
              onChange={(e) => setBaseFee(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t("adminShippingRates.currency")}
            </label>
            <input
              type="text"
              maxLength={3}
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              disabled={mode === "edit"}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm uppercase disabled:bg-gray-50"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t("adminShippingRates.baseWeightGram")}
            </label>
            <input
              type="number"
              min="1"
              value={baseWeightGram}
              onChange={(e) => setBaseWeightGram(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t("adminShippingRates.stepWeightGram")}
            </label>
            <input
              type="number"
              min="1"
              value={stepWeightGram}
              onChange={(e) => setStepWeightGram(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t("adminShippingRates.stepFee")}
            </label>
            <input
              type="number"
              min="0"
              value={stepFee}
              onChange={(e) => setStepFee(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t("adminShippingRates.maxFee")}
            </label>
            <input
              type="number"
              min="0"
              value={maxFee}
              onChange={(e) => setMaxFee(e.target.value)}
              placeholder={t("adminShippingRates.unlimited")}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t("adminShippingRates.expressExtraFee")}
            </label>
            <input
              type="number"
              min="0"
              value={expressExtraFee}
              onChange={(e) => setExpressExtraFee(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t("adminShippingRates.expressEtaDays")}
            </label>
            <input
              type="number"
              min="0"
              value={expressEtaDays}
              onChange={(e) => setExpressEtaDays(e.target.value)}
              placeholder="2"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            {t("adminShippingRates.optionalCondition")}
          </label>
          <textarea
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            rows={3}
            placeholder={t("adminShippingRates.conditionPlaceholder")}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            {t("adminShippingRates.cancel")}
          </Button>
          <Button
            className={adminPrimaryClass}
            onClick={submit}
            loading={isPending}
          >
            {t(
              mode === "create"
                ? "adminShippingRates.create"
                : "adminShippingRates.save",
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default function AdminShippingRatesPage() {
  return (
    <AuthGuard requiredRoles={["SYSTEM_ADMIN"]}>
      <AdminShippingRatesInner />
    </AuthGuard>
  );
}
