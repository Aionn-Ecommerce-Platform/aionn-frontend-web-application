"use client";

import { AppImage } from "@/shared/ui";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Plus, Trash2, X } from "lucide-react";
import { Button, Input, Modal } from "@/shared/ui";
import { useTranslation } from "@/hooks";
import { isVideoUrl, MEDIA_LIMITS } from "@/shared/lib/media";
import { formatCurrency } from "@/shared/lib/utils";
import type { ProductVariant } from "@/types";

interface ImagesCardProps {
  images: string[];
  uploading: boolean;
  onAdd: (file: File) => void;
  onRemove: (url: string) => void;
  onReorder: (from: number, to: number) => void;
  embedded?: boolean;
}

function formatVideoDuration(seconds: number) {
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

function VideoThumb({ url }: { url: string }) {
  const [duration, setDuration] = useState<number | null>(null);

  return (
    <>
      <video
        src={url}
        muted
        playsInline
        preload="metadata"
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        className="pointer-events-none h-full w-full object-cover"
      >
        <track kind="captions" />
      </video>
      {duration != null && (
        <span className="absolute bottom-1 right-1 rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-semibold text-white">
          {formatVideoDuration(duration)}
        </span>
      )}
    </>
  );
}

export function ProductImagesCard({
  images,
  uploading,
  onAdd,
  onRemove,
  onReorder,
  embedded = false,
}: ImagesCardProps) {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const coverUrl = images.find((url) => !isVideoUrl(url));
  return (
    <div
      className={
        embedded
          ? ""
          : "bg-white rounded-2xl border border-gray-400 shadow-xs p-6"
      }
    >
      <div className="mb-4">
        <h2 className="font-semibold text-gray-900">
          {t("merchant.productEdit.productImages")}
        </h2>
        <p className="mt-0.5 text-xs text-gray-500">
          {t("merchant.productEdit.mediaHint", {
            count: MEDIA_LIMITS.productFiles,
            videos: MEDIA_LIMITS.productVideos,
          })}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-6">
        {images.map((url, index) => {
          const video = isVideoUrl(url);
          return (
            <div
              key={url}
              draggable
              onDragStart={() => setDraggedIndex(index)}
              onDragEnd={() => setDraggedIndex(null)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                if (draggedIndex !== null && draggedIndex !== index) {
                  const next = [...images];
                  const [movedItem] = next.splice(draggedIndex, 1);
                  if (movedItem) next.splice(index, 0, movedItem);
                  // The storefront cover must stay an image.
                  if (!isVideoUrl(next[0] ?? "")) {
                    onReorder(draggedIndex, index);
                  }
                }
                setDraggedIndex(null);
              }}
              className={`relative aspect-square cursor-move rounded-lg overflow-hidden border border-gray-200 transition-opacity ${
                draggedIndex === index ? "opacity-40" : "opacity-100"
              }`}
            >
              {video ? (
                <VideoThumb url={url} />
              ) : (
                <AppImage
                  src={url}
                  alt="product"
                  className="w-full h-full object-cover"
                />
              )}
              {url === coverUrl && (
                <span className="absolute bottom-1 left-1 rounded-full bg-black/65 px-2 py-0.5 text-[10px] font-semibold text-white">
                  {t("merchant.productEdit.coverBadge")}
                </span>
              )}
              <button
                type="button"
                onClick={() => onRemove(url)}
                className="absolute top-1 right-1 w-7 h-7 rounded-full bg-white/95 border border-gray-200 shadow-sm flex items-center justify-center hover:bg-red-50 hover:text-red-600"
                aria-label={t("merchant.productEdit.removeImage")}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="aspect-square rounded-lg border-2 border-dashed border-gray-400 text-gray-400 hover:border-brand hover:text-brand flex flex-col items-center justify-center transition-colors disabled:opacity-50"
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
        accept="image/*,video/mp4,video/webm,video/quicktime"
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

interface VariantDraft {
  attribute: string;
  value: string;
  price: string;
  weightGram: string;
  lengthCm: string;
  widthCm: string;
  heightCm: string;
}

interface VariantsCardProps {
  variants: ProductVariant[];
  removingSku: string | null;
  draft: VariantDraft;
  adding: boolean;
  onRemove: (sku: string) => void;
  onDraft: (draft: VariantDraft) => void;
  onAdd: () => Promise<boolean>;
  embedded?: boolean;
}

export function VariantsCard(props: VariantsCardProps) {
  const { t } = useTranslation();
  const [addOpen, setAddOpen] = useState(false);

  const closeAdd = () => {
    if (props.adding) return;
    setAddOpen(false);
  };

  async function handleAdd() {
    const added = await props.onAdd();
    if (added) setAddOpen(false);
  }

  return (
    <div
      className={
        props.embedded
          ? "pt-6"
          : "bg-white rounded-2xl border border-gray-400 shadow-xs p-6"
      }
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-gray-900">
            {t("merchant.productEdit.variantsTitle")}
          </h2>
          <span className="rounded-full bg-gray-900 px-2 py-0.5 text-xs font-semibold text-white">
            {props.variants.length}
          </span>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus size={14} className="mr-1" />
          {t("merchant.productEdit.addVariant")}
        </Button>
      </div>

      {!props.variants.length ? (
        <p className="text-sm text-gray-400">
          {t("merchant.productEdit.noVariants")}
        </p>
      ) : (
        <div className="space-y-3">
          {props.variants.map((variant, index) => {
            const length = variant.lengthCm;
            const width = variant.widthCm;
            const height = variant.heightCm;
            const hasDimensions =
              length != null && width != null && height != null;
            return (
              <div
                key={variant.skuId}
                className="flex items-center gap-3 rounded-xl border border-gray-300 bg-gray-100 p-4"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white">
                  {index + 1}
                </span>
                <ul className="min-w-0 flex-1 list-disc space-y-1 pl-5 text-sm text-gray-700 marker:text-gray-500">
                  {Object.entries(variant.attributeValues).map(
                    ([key, item]) => (
                      <li key={key} className="font-medium text-gray-900">
                        {key}: {item}
                      </li>
                    ),
                  )}
                  {variant.weightGram != null ? (
                    <li>
                      {t("merchant.productEdit.weightSummary", {
                        value: variant.weightGram,
                      })}
                    </li>
                  ) : (
                    <li className="text-amber-600">
                      {t("merchant.productEdit.missingWeight")}
                    </li>
                  )}
                  {hasDimensions && (
                    <li>
                      {t("merchant.productEdit.parcelSummary", {
                        length,
                        width,
                        height,
                      })}
                    </li>
                  )}
                  <li>
                    {t("merchant.productEdit.price")}:{" "}
                    {formatCurrency(variant.price, variant.currency)}
                  </li>
                </ul>
                <button
                  type="button"
                  onClick={() => props.onRemove(variant.skuId)}
                  disabled={props.removingSku === variant.skuId}
                  className="self-center rounded-lg p-2 text-red-500 transition-colors hover:text-red-600 disabled:opacity-50"
                  aria-label={t("merchant.productEdit.removeVariant")}
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

      <Modal
        isOpen={addOpen}
        onClose={closeAdd}
        title={t("merchant.productEdit.addVariantModalTitle")}
        size="lg"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t("merchant.productEdit.attribute")}
            </label>
            <select
              value={props.draft.attribute}
              onChange={(event) =>
                props.onDraft({
                  ...props.draft,
                  attribute: event.target.value,
                })
              }
              className="w-full rounded-lg border border-gray-400 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            >
              <option value="color">
                {t("merchant.productEdit.attrColor")}
              </option>
              <option value="size">{t("merchant.productEdit.attrSize")}</option>
              <option value="storage">
                {t("merchant.productEdit.attrStorage")}
              </option>
              <option value="material">
                {t("merchant.productEdit.attrMaterial")}
              </option>
            </select>
          </div>
          <Input
            label={t("merchant.productEdit.value")}
            value={props.draft.value}
            onChange={(event) =>
              props.onDraft({ ...props.draft, value: event.target.value })
            }
          />
          <Input
            label={t("merchant.productEdit.price")}
            type="number"
            value={props.draft.price}
            onChange={(event) =>
              props.onDraft({ ...props.draft, price: event.target.value })
            }
          />
          <Input
            label={t("merchant.productNew.weightGramLabel")}
            type="number"
            min={1}
            value={props.draft.weightGram}
            onChange={(event) =>
              props.onDraft({
                ...props.draft,
                weightGram: event.target.value,
              })
            }
          />
          <Input
            label={t("merchant.productNew.lengthCmLabel")}
            type="number"
            value={props.draft.lengthCm}
            onChange={(event) =>
              props.onDraft({ ...props.draft, lengthCm: event.target.value })
            }
          />
          <Input
            label={t("merchant.productNew.widthCmLabel")}
            type="number"
            value={props.draft.widthCm}
            onChange={(event) =>
              props.onDraft({ ...props.draft, widthCm: event.target.value })
            }
          />
          <Input
            label={t("merchant.productNew.heightCmLabel")}
            type="number"
            value={props.draft.heightCm}
            onChange={(event) =>
              props.onDraft({ ...props.draft, heightCm: event.target.value })
            }
          />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={closeAdd} disabled={props.adding}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleAdd} loading={props.adding}>
            <Plus size={14} className="mr-1" />
            {t("merchant.productEdit.add")}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
