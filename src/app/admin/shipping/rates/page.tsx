"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Truck, Search, Plus, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button, EmptyState, Modal, DefinitionRow as Row } from "@/shared/ui";
import AuthGuard from "@/components/auth/AuthGuard";
import {
  shippingRateService,
  type ShippingRate,
} from "@/lib/services/shipping.service";
import { getErrorMessage } from "@/shared/lib/errors";
import { formatDateTime, formatNumber } from "@/shared/lib/utils";
import { useTranslation } from "@/hooks";

function AdminShippingRatesInner() {
  const { t, locale } = useTranslation();
  const [rateId, setRateId] = useState("");
  const [rate, setRate] = useState<ShippingRate | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ShippingRate | null>(null);

  const lookupMutation = useMutation({
    mutationFn: (id: string) => shippingRateService.get(id.trim()),
    onSuccess: (data) => setRate(data),
    onError: (err) => {
      setRate(null);
      toast.error(getErrorMessage(err));
    },
  });

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              {t("adminShippingRates.title")}
            </h1>
            <p className="text-gray-500 text-sm">
              {t("adminShippingRates.description")}
            </p>
          </div>
          <Button onClick={() => setCreating(true)}>
            <Plus size={16} className="mr-1.5" />
            {t("adminShippingRates.add")}
          </Button>
        </div>

        <div className="bg-white rounded-md border border-gray-400 p-5 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("adminShippingRates.lookupLabel")}
          </label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Rate ID..."
                value={rateId}
                onChange={(e) => setRateId(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && rateId.trim()) {
                    lookupMutation.mutate(rateId);
                  }
                }}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <Button
              onClick={() => lookupMutation.mutate(rateId)}
              loading={lookupMutation.isPending}
              disabled={!rateId.trim()}
            >
              {t("adminShippingRates.lookup")}
            </Button>
          </div>
        </div>

        {lookupMutation.isPending ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="animate-spin text-blue-600" size={28} />
          </div>
        ) : !rate ? (
          <EmptyState
            icon={Truck}
            title={t("adminShippingRates.emptyTitle")}
            description={t("adminShippingRates.emptyDescription")}
          />
        ) : (
          <div className="bg-white rounded-md border border-gray-400 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-400">
              <p className="text-xs text-gray-500 font-mono mb-1">
                {rate.rateId}
              </p>
              <h2 className="text-lg font-semibold text-gray-900">
                {t("adminShippingRates.zone", { code: rate.zoneCode })}
              </h2>
            </div>
            <dl className="divide-y divide-gray-50">
              <Row
                label={t("adminShippingRates.baseFee")}
                value={`${formatNumber(rate.baseFee, locale)} ${rate.currency}`}
              />
              <Row
                label={t("adminShippingRates.condition")}
                value={rate.condition ?? "—"}
              />
              <Row
                label={t("adminShippingRates.createdAt")}
                value={formatDateTime(rate.createdAt, locale)}
              />
              <Row
                label={t("adminShippingRates.updatedAt")}
                value={formatDateTime(rate.updatedAt, locale)}
              />
            </dl>
            <div className="px-6 py-4 border-t border-gray-400 bg-gray-50 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(rate)}
              >
                {t("adminShippingRates.edit")}
              </Button>
            </div>
          </div>
        )}
      </div>

      {creating && (
        <RateFormModal
          mode="create"
          onClose={() => setCreating(false)}
          onSuccess={(saved) => {
            setRate(saved);
            setRateId(saved.rateId);
            setCreating(false);
          }}
        />
      )}

      {editing && (
        <RateFormModal
          mode="edit"
          rate={editing}
          onClose={() => setEditing(null)}
          onSuccess={(saved) => {
            setRate(saved);
            setEditing(null);
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

  const createMutation = useMutation({
    mutationFn: () =>
      shippingRateService.configure({
        zoneCode: zoneCode.trim(),
        baseFee: Number(baseFee),
        currency: currency.trim() || "VND",
        condition: condition.trim() || undefined,
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
            placeholder="VN_HN, VN_HCM, INTL_AS..."
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
          <Button onClick={submit} loading={isPending}>
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
