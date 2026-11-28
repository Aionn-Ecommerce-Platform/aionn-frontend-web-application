"use client";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Button, Modal, Select } from "@/shared/ui";
import { inventoryService, productService } from "@/lib/services";
import { getErrorMessage } from "@/shared/lib/errors";
import { useTranslation } from "@/hooks";
import type { InventoryItem } from "@/types";
export function InitModal({
  warehouseId,
  onClose,
  onSuccess,
}: {
  warehouseId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const [productId, setProductId] = useState("");
  const [skuId, setSkuId] = useState("");
  const [initialQty, setInitialQty] = useState("");

  const { data: products, isLoading: loadingProducts } = useQuery({
    queryKey: ["merchant-products-for-inventory"],
    queryFn: () => productService.listAllMine(),
  });

  const availableProducts = (products ?? []).filter(
    (product) => product.variants.length > 0,
  );
  const selectedProduct = products?.find(
    (product) => product.productId === productId,
  );
  const variantOptions =
    selectedProduct?.variants.map((variant) => {
      const attributes = Object.entries(variant.attributeValues)
        .map(([key, value]) => `${key}: ${value}`)
        .join(" · ");
      return {
        value: variant.skuId,
        label: attributes || variant.skuId,
      };
    }) ?? [];

  const mutation = useMutation({
    mutationFn: () =>
      inventoryService.initialize({
        skuId: skuId.trim(),
        warehouseId,
        initialQty: Number(initialQty),
      }),
    onSuccess: () => {
      toast.success(t("merchant.inventory.toastInitSuccess"));
      onSuccess();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={t("merchant.inventory.initModalTitle")}
    >
      <div className="space-y-4">
        <Select
          label={t("merchant.inventory.productLabel")}
          value={productId}
          onChange={(value) => {
            setProductId(value);
            setSkuId("");
          }}
          options={availableProducts.map((product) => ({
            value: product.productId,
            label: product.name,
          }))}
          placeholder={
            loadingProducts
              ? t("common.loading")
              : t("merchant.inventory.selectProductPlaceholder")
          }
          disabled={loadingProducts}
        />
        {selectedProduct && selectedProduct.variants.length === 0 && (
          <p className="text-xs text-amber-600">
            {t("merchant.inventory.noVariants")}
          </p>
        )}
        {selectedProduct && selectedProduct.variants.length > 0 && (
          <Select
            label={t("merchant.inventory.variantLabel")}
            value={skuId}
            onChange={setSkuId}
            options={variantOptions}
            placeholder={t("merchant.inventory.selectVariantPlaceholder")}
          />
        )}
        {skuId && (
          <p className="rounded-lg bg-gray-50 px-3 py-2 font-mono text-xs text-gray-500">
            SKU: {skuId}
          </p>
        )}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            {t("merchant.inventory.initialQtyLabel")}
          </label>
          <input
            type="number"
            min="0"
            value={initialQty}
            onChange={(e) => setInitialQty(e.target.value)}
            className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            {t("merchant.inventory.cancelBtn")}
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={!skuId.trim() || initialQty === ""}
          >
            {t("merchant.inventory.initBtn")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function SafetyStockModal({
  item,
  onClose,
  onSuccess,
}: {
  item: InventoryItem;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const [value, setValue] = useState(String(item.safetyStockQty));
  const mutation = useMutation({
    mutationFn: () =>
      inventoryService.configureSafetyStock(item.skuId, item.warehouseId, {
        safetyStockQty: Number(value),
      }),
    onSuccess: () => {
      toast.success(t("merchant.inventory.toastSafetyUpdated"));
      onSuccess();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={t("merchant.inventory.safetyModalTitle")}
    >
      <div className="space-y-4">
        <p className="text-xs text-gray-500">
          {t("merchant.inventory.safetyHelp")}
        </p>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            {t("merchant.inventory.safetyLabel")}
          </label>
          <input
            type="number"
            min="0"
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
            {t("merchant.inventory.cancelBtn")}
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={Number(value) < 0}
          >
            {t("merchant.inventory.saveBtn")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function BatchModal({
  item,
  onClose,
  onSuccess,
}: {
  item: InventoryItem;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const [batchNo, setBatchNo] = useState(item.batchNo ?? "");
  const [expiryDate, setExpiryDate] = useState(item.expiryDate ?? "");
  const mutation = useMutation({
    mutationFn: () =>
      inventoryService.trackBatchAndExpiry(item.skuId, item.warehouseId, {
        batchNo: batchNo.trim(),
        expiryDate,
      }),
    onSuccess: () => {
      toast.success(t("merchant.inventory.toastBatchUpdated"));
      onSuccess();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={t("merchant.inventory.batchModalTitle")}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            {t("merchant.inventory.batchNoLabel")}
          </label>
          <input
            type="text"
            value={batchNo}
            onChange={(e) => setBatchNo(e.target.value)}
            className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            {t("merchant.inventory.expiryLabel")}
          </label>
          <input
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            {t("merchant.inventory.cancelBtn")}
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={!batchNo.trim() || !expiryDate}
          >
            {t("merchant.inventory.saveBtn")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
