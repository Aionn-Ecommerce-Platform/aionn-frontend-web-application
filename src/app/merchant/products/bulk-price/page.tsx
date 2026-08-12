"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { TrendingUp, Plus, X, AlertTriangle } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Button } from "@/shared/ui";
import AuthGuard from "@/components/auth/AuthGuard";
import { useTranslation } from "@/hooks";
import { productService } from "@/lib/services";
import { getErrorMessage } from "@/shared/lib/errors";

const CHANGE_TYPES = [
  {
    key: "SET",
    labelKey: "merchant.bulkPrice.typeSetLabel",
    hintKey: "merchant.bulkPrice.typeSetHint",
  },
  {
    key: "INCREASE_AMOUNT",
    labelKey: "merchant.bulkPrice.typeIncAmountLabel",
    hintKey: "merchant.bulkPrice.typeIncAmountHint",
  },
  {
    key: "DECREASE_AMOUNT",
    labelKey: "merchant.bulkPrice.typeDecAmountLabel",
    hintKey: "merchant.bulkPrice.typeDecAmountHint",
  },
  {
    key: "INCREASE_PERCENT",
    labelKey: "merchant.bulkPrice.typeIncPercentLabel",
    hintKey: "merchant.bulkPrice.typeIncPercentHint",
  },
  {
    key: "DECREASE_PERCENT",
    labelKey: "merchant.bulkPrice.typeDecPercentLabel",
    hintKey: "merchant.bulkPrice.typeDecPercentHint",
  },
] as const;

function MerchantBulkPriceInner() {
  const { t } = useTranslation();
  const [skuInput, setSkuInput] = useState("");
  const [skuIds, setSkuIds] = useState<string[]>([]);
  const [changeType, setChangeType] =
    useState<(typeof CHANGE_TYPES)[number]["key"]>("SET");
  const [value, setValue] = useState("");
  const [currency, setCurrency] = useState("VND");
  const [confirming, setConfirming] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      productService.bulkPriceUpdate({
        skuIds,
        changeType,
        value: Number(value),
        currency,
      }),
    onSuccess: () => {
      toast.success(
        t("merchant.bulkPrice.applySuccess", { count: skuIds.length }),
      );
      setSkuIds([]);
      setSkuInput("");
      setValue("");
      setConfirming(false);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  function addSkus() {
    const parts = skuInput
      .split(/[\s,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) {
      toast.error(t("merchant.bulkPrice.errorNoSku"));
      return;
    }
    setSkuIds((prev) => Array.from(new Set([...prev, ...parts])));
    setSkuInput("");
  }

  function removeSku(sku: string) {
    setSkuIds((prev) => prev.filter((s) => s !== sku));
  }

  function submit() {
    if (skuIds.length === 0) {
      toast.error(t("merchant.bulkPrice.errorEmpty"));
      return;
    }
    if (!value || Number(value) < 0) {
      toast.error(t("merchant.bulkPrice.errorInvalidValue"));
      return;
    }
    setConfirming(true);
  }

  const cfg = CHANGE_TYPES.find((c) => c.key === changeType)!;

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href="/merchant/products"
          className="text-sm text-gray-500 hover:text-gray-900 mb-4 inline-block"
        >
          {t("merchant.bulkPrice.backToList")}
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
          <TrendingUp size={24} className="text-blue-600" />
          {t("merchant.bulkPrice.title")}
        </h1>
        <p className="text-gray-500 text-sm mb-6">
          {t("merchant.bulkPrice.subtitle")}
        </p>

        <div className="max-w-3xl bg-white rounded-md border border-gray-400 p-5 mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("merchant.bulkPrice.skuListLabel")}
          </label>
          <textarea
            value={skuInput}
            onChange={(e) => setSkuInput(e.target.value)}
            rows={3}
            placeholder={t("merchant.bulkPrice.skuPlaceholder")}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:border-blue-500 focus:outline-none"
          />
          <div className="flex justify-between items-center mt-2">
            <p className="text-xs text-gray-400">
              {t("merchant.bulkPrice.skuCount", { count: skuIds.length })}
            </p>
            <Button size="sm" variant="outline" onClick={addSkus}>
              <Plus size={14} className="mr-1" />
              {t("merchant.bulkPrice.addToList")}
            </Button>
          </div>

          {skuIds.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {skuIds.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-mono"
                >
                  {s}
                  <button
                    onClick={() => removeSku(s)}
                    className="hover:text-blue-900"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="max-w-3xl bg-white rounded-md border border-gray-400 p-5 mb-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("merchant.bulkPrice.changeTypeLabel")}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CHANGE_TYPES.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setChangeType(c.key)}
                  className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                    changeType === c.key
                      ? "border-blue-500 bg-blue-50 text-blue-900"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <p className="font-medium">{t(c.labelKey)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{t(c.hintKey)}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {t("merchant.bulkPrice.valueLabel")}
              </label>
              <input
                type="number"
                min="0"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={changeType.includes("PERCENT") ? "10" : "100000"}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {t("merchant.bulkPrice.currencyLabel")}
              </label>
              <input
                type="text"
                maxLength={3}
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                disabled={changeType.includes("PERCENT")}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm uppercase focus:border-blue-500 focus:outline-none disabled:bg-gray-50"
              />
            </div>
          </div>
        </div>

        <div className="max-w-3xl flex justify-end">
          <Button onClick={submit} disabled={skuIds.length === 0 || !value}>
            {t("merchant.bulkPrice.previewApply")}
          </Button>
        </div>

        {confirming && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-md max-w-md w-full p-6">
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle
                  className="text-amber-500 flex-shrink-0 mt-0.5"
                  size={20}
                />
                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    {t("merchant.bulkPrice.confirmTitle")}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {t("merchant.bulkPrice.confirmBody", {
                      label: t(cfg.labelKey),
                      value: value,
                      unit: changeType.includes("PERCENT")
                        ? "%"
                        : ` ${currency}`,
                      count: skuIds.length,
                    })}
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setConfirming(false)}
                  disabled={mutation.isPending}
                >
                  {t("merchant.bulkPrice.cancel")}
                </Button>
                <Button
                  onClick={() => mutation.mutate()}
                  loading={mutation.isPending}
                >
                  {t("merchant.bulkPrice.apply")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MerchantBulkPricePage() {
  return (
    <AuthGuard requiredRoles={["MERCHANT"]}>
      <MerchantBulkPriceInner />
    </AuthGuard>
  );
}
