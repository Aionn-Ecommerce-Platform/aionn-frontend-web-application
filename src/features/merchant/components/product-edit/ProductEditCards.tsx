"use client";

import { AppImage } from "@/shared/ui";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Plus, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import { Button, Input } from "@/shared/ui";
import { useTranslation } from "@/hooks";
import { getErrorMessage } from "@/shared/lib/errors";
import { productService } from "@/lib/services";
import { formatCurrency } from "@/shared/lib/utils";
import type { ProductVariant } from "@/types";

interface ImagesCardProps {
  images: string[];
  uploading: boolean;
  saving: boolean;
  onAdd: (file: File) => void;
  onRemove: (url: string) => void;
  onSave: () => void;
}

export function ProductImagesCard({
  images,
  uploading,
  saving,
  onAdd,
  onRemove,
  onSave,
}: ImagesCardProps) {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="bg-white rounded-md border border-gray-400 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900">
          {t("merchant.productEdit.productImages")}
        </h2>
        <Button
          size="sm"
          onClick={onSave}
          loading={saving}
          disabled={uploading}
        >
          {t("merchant.productEdit.save")}
        </Button>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {images.map((url) => (
          <div
            key={url}
            className="relative aspect-square rounded-lg overflow-hidden border border-gray-200"
          >
            <AppImage
              src={url}
              alt="product"
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => onRemove(url)}
              className="absolute top-1 right-1 w-7 h-7 rounded-full bg-white/95 border border-gray-200 shadow-sm flex items-center justify-center hover:bg-red-50 hover:text-red-600"
              aria-label={t("merchant.productEdit.removeImage")}
            >
              <X size={14} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="aspect-square rounded-lg border-2 border-dashed border-gray-300 text-gray-400 hover:border-blue-400 hover:text-blue-600 flex flex-col items-center justify-center transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <>
              <ImagePlus size={20} />
              <span className="text-xs mt-1">
                {t("merchant.productEdit.add")}
              </span>
            </>
          )}
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onAdd(file);
          event.target.value = "";
        }}
        className="hidden"
      />
    </div>
  );
}

export function CollectionsCard({
  productId,
  initialCollectionIds,
}: {
  productId: string;
  initialCollectionIds: string[];
}) {
  const { t } = useTranslation();
  const [input, setInput] = useState(initialCollectionIds.join(", "));
  const [saving, setSaving] = useState(false);
  async function handleSave() {
    const ids = input
      .split(/[\s,;\n]+/)
      .map((value) => value.trim())
      .filter(Boolean);
    setSaving(true);
    try {
      await productService.assignCollections(productId, { collectionIds: ids });
      toast.success(
        ids.length
          ? t("merchant.productEdit.collectionsAttached", { count: ids.length })
          : t("merchant.productEdit.collectionsCleared"),
      );
    } catch (error) {
      toast.error(
        getErrorMessage(error, t("merchant.productEdit.collectionsFailed")),
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="bg-white rounded-md border border-gray-400 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-gray-900">
            {t("merchant.productEdit.collectionsTitle")}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {t("merchant.productEdit.collectionsHint")}
          </p>
        </div>
        <Button size="sm" onClick={handleSave} loading={saving}>
          {t("merchant.productEdit.save")}
        </Button>
      </div>
      <textarea
        value={input}
        onChange={(event) => setInput(event.target.value)}
        rows={2}
        placeholder="COL_xxx, COL_yyy ..."
        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-mono focus:border-blue-500 focus:outline-none"
      />
    </div>
  );
}

interface VariantsCardProps {
  variants: ProductVariant[];
  prices: Record<string, string>;
  savingSku: string | null;
  removingSku: string | null;
  draft: { attribute: string; value: string; price: string };
  adding: boolean;
  onPrice: (sku: string, value: string) => void;
  onSavePrice: (sku: string) => void;
  onRemove: (sku: string) => void;
  onDraft: (draft: { attribute: string; value: string; price: string }) => void;
  onAdd: () => void;
}

export function VariantsCard(props: VariantsCardProps) {
  const { t } = useTranslation();
  return (
    <div className="bg-white rounded-md border border-gray-400 p-6">
      <h2 className="font-semibold text-gray-900 mb-4">
        {t("merchant.productEdit.variantsTitle")}
      </h2>
      {!props.variants.length ? (
        <p className="text-sm text-gray-400 mb-4">
          {t("merchant.productEdit.noVariants")}
        </p>
      ) : (
        <div className="space-y-3 mb-5">
          {props.variants.map((variant) => {
            const value = props.prices[variant.skuId] ?? "";
            const dirty = value !== "" && Number(value) !== variant.price;
            return (
              <div
                key={variant.skuId}
                className="flex items-end gap-3 p-3 rounded-lg bg-gray-50"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {Object.entries(variant.attributeValues)
                      .map(([key, item]) => `${key}: ${item}`)
                      .join(" • ")}
                  </p>
                  <p className="text-xs text-gray-400 font-mono">
                    {variant.skuId.slice(0, 12)}…
                  </p>
                  <p className="text-xs text-gray-500">
                    {t("merchant.productEdit.currentPrice", {
                      price: formatCurrency(variant.price, variant.currency),
                    })}
                  </p>
                </div>
                <div className="w-32">
                  <Input
                    type="number"
                    min={0}
                    value={value}
                    onChange={(event) =>
                      props.onPrice(variant.skuId, event.target.value)
                    }
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!dirty}
                  loading={props.savingSku === variant.skuId}
                  onClick={() => props.onSavePrice(variant.skuId)}
                >
                  {t("merchant.productEdit.save")}
                </Button>
                <button
                  onClick={() => props.onRemove(variant.skuId)}
                  disabled={props.removingSku === variant.skuId}
                  className="p-2 text-gray-400 hover:text-red-500"
                >
                  {props.removingSku === variant.skuId ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Trash2 size={16} />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
      <div className="border-t border-gray-400 pt-4">
        <p className="text-xs font-medium text-gray-500 uppercase mb-3">
          {t("merchant.productEdit.addVariant")}
        </p>
        <div className="flex items-end gap-3">
          <select
            value={props.draft.attribute}
            onChange={(event) =>
              props.onDraft({ ...props.draft, attribute: event.target.value })
            }
            className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="color">{t("merchant.productEdit.attrColor")}</option>
            <option value="size">{t("merchant.productEdit.attrSize")}</option>
            <option value="storage">
              {t("merchant.productEdit.attrStorage")}
            </option>
            <option value="material">
              {t("merchant.productEdit.attrMaterial")}
            </option>
          </select>
          <div className="flex-1">
            <Input
              label={t("merchant.productEdit.value")}
              value={props.draft.value}
              onChange={(event) =>
                props.onDraft({ ...props.draft, value: event.target.value })
              }
            />
          </div>
          <div className="w-32">
            <Input
              label={t("merchant.productEdit.price")}
              type="number"
              value={props.draft.price}
              onChange={(event) =>
                props.onDraft({ ...props.draft, price: event.target.value })
              }
            />
          </div>
          <Button size="sm" onClick={props.onAdd} loading={props.adding}>
            <Plus size={14} className="mr-1" />
            {t("merchant.productEdit.add")}
          </Button>
        </div>
      </div>
    </div>
  );
}
