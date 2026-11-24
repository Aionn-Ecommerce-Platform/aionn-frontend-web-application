"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Button, Modal, Select } from "@/shared/ui";
import { flashSaleService } from "@/lib/services/flash-sale.service";
import { campaignService, productService } from "@/lib/services";
import { getErrorMessage } from "@/shared/lib/errors";
import { formatDateTime } from "@/shared/lib/utils";
import { formatVariantLabel } from "@/shared/lib/product-utils";
import { useTranslation } from "@/hooks";

export function RegisterModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t, locale } = useTranslation();
  const [campaignId, setCampaignId] = useState("");
  const [productId, setProductId] = useState("");
  const [skuId, setSkuId] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [currency, setCurrency] = useState("VND");
  const [saleStock, setSaleStock] = useState("");

  const { data: campaigns = [], isLoading: loadingCampaigns } = useQuery({
    queryKey: ["flash-sale-campaigns-for-register"],
    queryFn: async () => {
      const [running, scheduled] = await Promise.all([
        campaignService.listByStatus("RUNNING", 50),
        campaignService.listByStatus("SCHEDULED", 50),
      ]);
      return [...running, ...scheduled].filter(
        (campaign) => campaign.type === "FLASH_SALE",
      );
    },
  });

  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ["merchant-products-for-flash-sale"],
    queryFn: () => productService.listAllMine(),
  });

  const availableProducts = useMemo(
    () => products.filter((product) => product.variants.length > 0),
    [products],
  );
  const selectedProduct = products.find(
    (product) => product.productId === productId,
  );
  const selectedCampaign = campaigns.find(
    (campaign) => campaign.campaignId === campaignId,
  );

  const registerMutation = useMutation({
    mutationFn: () =>
      flashSaleService.register({
        campaignId,
        productId,
        skuId,
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
    if (!campaignId || !productId || !skuId) {
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
        <Select
          label={t("merchant.flashSales.register.campaignSelectLabel")}
          value={campaignId}
          onChange={(value) => setCampaignId(value)}
          options={campaigns.map((campaign) => ({
            value: campaign.campaignId,
            label: `${campaign.name} (${campaign.status})`,
          }))}
          placeholder={
            loadingCampaigns
              ? t("common.loading")
              : campaigns.length === 0
                ? t("merchant.flashSales.register.noCampaigns")
                : t("merchant.flashSales.register.campaignPlaceholder")
          }
          disabled={loadingCampaigns || campaigns.length === 0}
        />
        {selectedCampaign && (
          <p className="text-xs text-gray-500">
            {formatDateTime(selectedCampaign.startDate, locale)} →{" "}
            {formatDateTime(selectedCampaign.endDate, locale)}
          </p>
        )}

        <Select
          label={t("merchant.flashSales.register.productSelectLabel")}
          value={productId}
          onChange={(value) => {
            setProductId(value);
            setSkuId("");
            setSalePrice("");
            setCurrency("VND");
          }}
          options={availableProducts.map((product) => ({
            value: product.productId,
            label: `${product.name} (${product.status})`,
          }))}
          placeholder={
            loadingProducts
              ? t("common.loading")
              : availableProducts.length === 0
                ? t("merchant.flashSales.register.noProducts")
                : t("merchant.flashSales.register.productPlaceholder")
          }
          disabled={loadingProducts || availableProducts.length === 0}
        />

        <Select
          label={t("merchant.flashSales.register.variantSelectLabel")}
          value={skuId}
          onChange={(value) => {
            setSkuId(value);
            const variant = selectedProduct?.variants.find(
              (item) => item.skuId === value,
            );
            if (variant) {
              setSalePrice(String(variant.price));
              setCurrency(variant.currency || "VND");
            }
          }}
          options={(selectedProduct?.variants ?? []).map((variant) => ({
            value: variant.skuId,
            label:
              formatVariantLabel(variant.attributeValues) ||
              t("merchant.flashSales.register.defaultVariant"),
          }))}
          placeholder={
            selectedProduct
              ? t("merchant.flashSales.register.variantPlaceholder")
              : t("merchant.flashSales.register.selectProductFirst")
          }
          disabled={!selectedProduct}
        />

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-700">
              {t("merchant.flashSales.register.salePrice")}
            </label>
            <input
              type="number"
              min="0"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              className="w-full rounded-lg border border-gray-400 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              {t("merchant.flashSales.register.currency")}
            </label>
            <input
              type="text"
              maxLength={3}
              value={currency}
              readOnly
              className="w-full rounded-lg border border-gray-400 bg-gray-50 px-3 py-2 text-sm uppercase text-gray-600 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            {t("merchant.flashSales.register.saleStock")}
          </label>
          <input
            type="number"
            min="1"
            value={saleStock}
            onChange={(e) => setSaleStock(e.target.value)}
            className="w-full rounded-lg border border-gray-400 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
          <p className="mt-1 text-xs text-gray-400">
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
            disabled={
              !campaignId || !productId || !skuId || registerMutation.isPending
            }
          >
            {t("merchant.flashSales.register.submit")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
