"use client";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import toast from "react-hot-toast";
import { Button, Modal } from "@/shared/ui";
import { flashSaleService } from "@/lib/services/flash-sale.service";
import { campaignService } from "@/lib/services";
import { getErrorMessage } from "@/shared/lib/errors";
import { useTranslation } from "@/hooks";
export function RegisterModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const [campaignId, setCampaignId] = useState("");
  const [productId, setProductId] = useState("");
  const [skuId, setSkuId] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [currency, setCurrency] = useState("VND");
  const [saleStock, setSaleStock] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const validateMutation = useMutation({
    mutationFn: (id: string) => campaignService.get(id.trim()),
    onSuccess: (campaign) => {
      if (campaign.type !== "FLASH_SALE") {
        setValidationError(
          t("merchant.flashSales.register.wrongType", { type: campaign.type }),
        );
      } else if (
        campaign.status !== "RUNNING" &&
        campaign.status !== "SCHEDULED"
      ) {
        setValidationError(
          t("merchant.flashSales.register.wrongStatus", {
            status: campaign.status,
          }),
        );
      } else {
        setValidationError(null);
      }
    },
    onError: () =>
      setValidationError(t("merchant.flashSales.register.notFound")),
  });

  const registerMutation = useMutation({
    mutationFn: () =>
      flashSaleService.register({
        campaignId: campaignId.trim(),
        productId: productId.trim(),
        skuId: skuId.trim(),
        salePrice: Number(salePrice),
        currency: currency.trim() || "VND",
        saleStock: Number(saleStock),
      }),
    onSuccess: () => {
      toast.success(t("merchant.flashSales.toast.registered"));
      onSuccess();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const submit = () => {
    if (!campaignId.trim() || !productId.trim() || !skuId.trim()) {
      toast.error(t("merchant.flashSales.register.missingFields"));
      return;
    }
    const price = Number(salePrice);
    const stock = Number(saleStock);
    if (Number.isNaN(price) || price <= 0) {
      toast.error(t("merchant.flashSales.register.invalidPrice"));
      return;
    }
    if (Number.isNaN(stock) || stock <= 0) {
      toast.error(t("merchant.flashSales.register.invalidStock"));
      return;
    }
    registerMutation.mutate();
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={t("merchant.flashSales.register.title")}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            {t("merchant.flashSales.register.campaignId")}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={campaignId}
              onChange={(e) => {
                setCampaignId(e.target.value);
                setValidationError(null);
              }}
              placeholder="CMP_..."
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:border-blue-500 focus:outline-none"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => validateMutation.mutate(campaignId)}
              loading={validateMutation.isPending}
              disabled={!campaignId.trim()}
            >
              {t("merchant.flashSales.register.check")}
            </Button>
          </div>
          {validateMutation.data && !validationError && (
            <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1">
              <ExternalLink size={12} />
              {validateMutation.data.name} · {validateMutation.data.type} ·{" "}
              {validateMutation.data.status}
            </p>
          )}
          {validationError && (
            <p className="text-xs text-red-600 mt-1.5">{validationError}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t("merchant.flashSales.register.productId")}
            </label>
            <input
              type="text"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              placeholder="PRD_..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t("merchant.flashSales.register.skuId")}
            </label>
            <input
              type="text"
              value={skuId}
              onChange={(e) => setSkuId(e.target.value)}
              placeholder="SKU_..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t("merchant.flashSales.register.salePrice")}
            </label>
            <input
              type="number"
              min="0"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t("merchant.flashSales.register.currency")}
            </label>
            <input
              type="text"
              maxLength={3}
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm uppercase focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            {t("merchant.flashSales.register.saleStock")}
          </label>
          <input
            type="number"
            min="1"
            value={saleStock}
            onChange={(e) => setSaleStock(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:outline-none"
          />
          <p className="text-xs text-gray-400 mt-1">
            {t("merchant.flashSales.register.saleStockHint")}
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={registerMutation.isPending}
          >
            {t("merchant.flashSales.register.cancel")}
          </Button>
          <Button
            onClick={submit}
            loading={registerMutation.isPending}
            disabled={!!validationError}
          >
            {t("merchant.flashSales.register.submit")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
