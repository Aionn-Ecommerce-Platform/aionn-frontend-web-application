"use client";

import { AppImage } from "@/shared/ui";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2, ImagePlus, ChevronDown, Check } from "lucide-react";
import toast from "react-hot-toast";
import { Button, Input } from "@/shared/ui";
import AuthGuard from "@/components/auth/AuthGuard";
import { useTranslation } from "@/hooks";
import {
  mediaService,
  productService,
  uploadToCloudinary,
} from "@/lib/services";
import { getErrorMessage, getFieldErrors } from "@/shared/lib/errors";

interface VariantDraft {
  attribute: string;
  value: string;
  price: string;
}

function AttributeDropdown({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const current =
    options.find((option) => option.value === value) ?? options[0];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-gray-400 bg-gray-50/80 px-3.5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-white focus:border-blue-400 focus:outline-none"
        aria-expanded={open}
      >
        <span className="truncate">{current?.label}</span>
        <ChevronDown
          size={14}
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-full overflow-hidden rounded-xl border border-gray-400 bg-white py-1 shadow-lg">
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors ${
                  active
                    ? "bg-blue-50 font-semibold text-blue-700"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span>{option.label}</span>
                {active ? (
                  <Check size={14} className="ml-2 shrink-0 text-blue-700" />
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NewProductInner() {
  const router = useRouter();
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [name, setName] = useState("");
  const [tags, setTags] = useState("");
  const [aiDescription, setAiDescription] = useState("");
  const [variants, setVariants] = useState<VariantDraft[]>([
    { attribute: "color", value: "", price: "" },
  ]);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
  const attributeOptions = [
    { value: "color", label: t("merchant.productNew.attrColor") },
    { value: "size", label: t("merchant.productNew.attrSize") },
    { value: "storage", label: t("merchant.productNew.attrStorage") },
    { value: "material", label: t("merchant.productNew.attrMaterial") },
  ];

  async function handleAddImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(t("merchant.productNew.errorOnlyImage"));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error(t("merchant.productNew.errorImageTooLarge"));
      return;
    }
    setUploading(true);
    try {
      const sig = await mediaService.generateProductImageSignature();
      const url = await uploadToCloudinary(file, sig);
      setImages((prev) => [...prev, url]);
      toast.success(t("merchant.productNew.uploadSuccess"));
    } catch (err) {
      toast.error(getErrorMessage(err, t("merchant.productNew.uploadFailed")));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function handleRemoveImage(url: string) {
    setImages((prev) => prev.filter((u) => u !== url));
  }

  const addVariant = () => {
    setVariants([...variants, { attribute: "color", value: "", price: "" }]);
  };

  const updateVariant = (idx: number, patch: Partial<VariantDraft>) => {
    setVariants(variants.map((v, i) => (i === idx ? { ...v, ...patch } : v)));
  };

  const removeVariant = (idx: number) => {
    setVariants(variants.filter((_, i) => i !== idx));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setFieldErrors({ name: t("merchant.productNew.errorNameRequired") });
      return;
    }
    setLoading(true);
    setFieldErrors({});
    try {
      const product = await productService.create({ name: name.trim() });

      for (const v of variants) {
        const price = parseFloat(v.price);
        if (!v.value.trim() || !Number.isFinite(price) || price <= 0) continue;
        try {
          await productService.defineVariant(product.productId, {
            attributeValues: { [v.attribute]: v.value.trim() },
            price,
            currency: "VND",
          });
        } catch (err) {
          toast.error(
            t("merchant.productNew.errorVariantFailed", {
              value: v.value,
              error: getErrorMessage(err),
            }),
          );
        }
      }

      if (tags.trim() || aiDescription.trim()) {
        try {
          await productService.updateAiMetadata(product.productId, {
            tags: tags
              ? tags
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean)
              : undefined,
            aiDescription: aiDescription.trim() || undefined,
          });
        } catch {}
      }

      if (images.length > 0) {
        try {
          await productService.updateMedia(product.productId, {
            imageList: images,
          });
        } catch (err) {
          toast.error(
            t("merchant.productNew.errorMediaFailed", {
              error: getErrorMessage(err),
            }),
          );
        }
      }

      toast.success(t("merchant.productNew.createSuccess"));
      router.push("/merchant/products");
    } catch (err) {
      setFieldErrors(getFieldErrors(err));
      toast.error(getErrorMessage(err, t("merchant.productNew.createFailed")));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {t("merchant.productNew.title")}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="max-w-3xl bg-white rounded-md border border-gray-400 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">
              {t("merchant.productNew.basicInfo")}
            </h2>
            <div className="space-y-4">
              <Input
                id="name"
                label={t("merchant.productNew.productName")}
                placeholder={t("merchant.productNew.productNamePlaceholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={fieldErrors.name}
                maxLength={200}
                required
              />
            </div>
          </div>

          <div className="max-w-3xl bg-white rounded-md border border-gray-400 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">
                {t("merchant.productNew.productImages")}
              </h2>
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
                    onClick={() => handleRemoveImage(url)}
                    className="absolute top-1 right-1 w-7 h-7 rounded-full bg-white/95 border border-gray-200 shadow-sm flex items-center justify-center hover:bg-red-50 hover:text-red-600"
                    aria-label={t("merchant.productNew.removeImage")}
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
                      {t("merchant.productNew.add")}
                    </span>
                  </>
                )}
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleAddImage}
              className="hidden"
            />
          </div>

          <div className="max-w-3xl bg-white rounded-md border border-gray-400 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-gray-900">
                  {t("merchant.productNew.variantsTitle")}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {t("merchant.productNew.variantsHint")}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addVariant}
              >
                <Plus size={14} className="mr-1" />
                {t("merchant.productNew.add")}
              </Button>
            </div>
            <div className="space-y-3">
              {variants.map((v, i) => (
                <div
                  key={i}
                  className="flex items-end gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="w-32">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {i === 0 ? t("merchant.productNew.attributeName") : null}
                    </label>
                    <AttributeDropdown
                      value={v.attribute}
                      onChange={(attribute) => updateVariant(i, { attribute })}
                      options={attributeOptions}
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      label={
                        i === 0 ? t("merchant.productNew.value") : undefined
                      }
                      placeholder={t("merchant.productNew.valuePlaceholder")}
                      value={v.value}
                      onChange={(e) =>
                        updateVariant(i, { value: e.target.value })
                      }
                    />
                  </div>
                  <div className="w-40">
                    <Input
                      label={
                        i === 0 ? t("merchant.productNew.priceVnd") : undefined
                      }
                      type="number"
                      inputMode="numeric"
                      min={0}
                      placeholder="890000"
                      value={v.price}
                      onChange={(e) =>
                        updateVariant(i, { price: e.target.value })
                      }
                    />
                  </div>
                  {variants.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeVariant(i)}
                      className="p-2 text-gray-400 hover:text-red-500 mb-0.5"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="max-w-3xl bg-white rounded-md border border-gray-400 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">
              {t("merchant.productNew.aiMetadataTitle")}
            </h2>
            <div className="space-y-4">
              <Input
                id="tags"
                label={t("merchant.productNew.tagsLabel")}
                placeholder={t("merchant.productNew.tagsPlaceholder")}
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("merchant.productNew.aiDescriptionLabel")}
                </label>
                <textarea
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                  placeholder={t(
                    "merchant.productNew.aiDescriptionPlaceholder",
                  )}
                  value={aiDescription}
                  onChange={(e) => setAiDescription(e.target.value)}
                  maxLength={1000}
                />
              </div>
            </div>
          </div>

          <div className="max-w-3xl flex gap-3">
            <Button type="submit" size="lg" loading={loading}>
              {loading ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  {t("merchant.productNew.saving")}
                </>
              ) : (
                t("merchant.productNew.createProduct")
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => router.back()}
              disabled={loading}
            >
              {t("merchant.productNew.cancel")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NewProductPage() {
  return (
    <AuthGuard requiredRoles={["MERCHANT"]}>
      <NewProductInner />
    </AuthGuard>
  );
}
