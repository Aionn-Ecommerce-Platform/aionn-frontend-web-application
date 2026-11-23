"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
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
import { MEDIA_LIMITS, isVideoUrl } from "@/shared/lib/media";
import {
  ProductImagesCard,
  VariantsCard,
} from "@/features/merchant/components/product-edit/ProductEditCards";
import type { ProductVariant } from "@/types";

interface VariantDraft {
  attribute: string;
  value: string;
  price: string;
  weightGram: string;
  lengthCm: string;
  widthCm: string;
  heightCm: string;
}

const EMPTY_VARIANT: VariantDraft = {
  attribute: "color",
  value: "",
  price: "",
  weightGram: "",
  lengthCm: "",
  widthCm: "",
  heightCm: "",
};

function NewProductInner() {
  const router = useRouter();
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [variants, setVariants] = useState<VariantDraft[]>([]);
  const [newVariant, setNewVariant] = useState<VariantDraft>(EMPTY_VARIANT);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleAddImage(file: File) {
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isImage && !isVideo) {
      toast.error(t("merchant.productNew.errorOnlyMedia"));
      return;
    }
    if (images.length >= MEDIA_LIMITS.productFiles) {
      toast.error(
        t("merchant.productNew.errorMediaLimit", {
          count: MEDIA_LIMITS.productFiles,
        }),
      );
      return;
    }
    if (isVideo) {
      if (
        images.filter((url) => isVideoUrl(url)).length >=
        MEDIA_LIMITS.productVideos
      ) {
        toast.error(
          t("merchant.productNew.errorVideoLimit", {
            count: MEDIA_LIMITS.productVideos,
          }),
        );
        return;
      }
      if (file.size > MEDIA_LIMITS.videoBytes) {
        toast.error(t("merchant.productNew.errorVideoTooLarge"));
        return;
      }
    } else if (file.size > MEDIA_LIMITS.imageBytes) {
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
    }
  }

  function handleRemoveImage(url: string) {
    setImages((prev) => prev.filter((item) => item !== url));
  }

  function handleReorderImages(from: number, to: number) {
    setImages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      if (moved) next.splice(to, 0, moved);
      return next;
    });
  }

  function handleRemoveVariantDraft(skuId: string) {
    const index = Number(skuId.replace("draft-", ""));
    setVariants((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleAddVariantDraft() {
    const value = newVariant.value.trim();
    const price = Number(newVariant.price);
    if (!value || !Number.isFinite(price) || price <= 0) {
      toast.error(t("merchant.productEdit.errorVariantInputs"));
      return false;
    }
    const weightGram = Number(newVariant.weightGram);
    if (!Number.isFinite(weightGram) || weightGram <= 0) {
      toast.error(
        t("merchant.productNew.errorWeightRequired", {
          value,
        }),
      );
      return false;
    }
    const dims = [newVariant.lengthCm, newVariant.widthCm, newVariant.heightCm];
    if (dims.some((dim) => dim !== "" && !Number.isFinite(Number(dim)))) {
      toast.error(t("merchant.productNew.errorDimensionsInvalid"));
      return false;
    }
    setVariants((prev) => [...prev, { ...newVariant, value }]);
    setNewVariant(EMPTY_VARIANT);
    toast.success(t("merchant.productEdit.variantAdded"));
    return true;
  }

  const displayVariants: ProductVariant[] = variants.map((variant, index) => {
    const lengthCm = variant.lengthCm === "" ? null : Number(variant.lengthCm);
    const widthCm = variant.widthCm === "" ? null : Number(variant.widthCm);
    const heightCm = variant.heightCm === "" ? null : Number(variant.heightCm);
    return {
      skuId: `draft-${index}`,
      attributeValues: { [variant.attribute]: variant.value },
      price: Number(variant.price),
      currency: "VND",
      weightGram: Number(variant.weightGram),
      lengthCm,
      widthCm,
      heightCm,
    };
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setFieldErrors({ name: t("merchant.productNew.errorNameRequired") });
      return;
    }
    if (!variants.length) {
      toast.error(t("merchant.productNew.errorVariantRequired"));
      return;
    }
    if (images.length > 0 && !images.some((url) => !isVideoUrl(url))) {
      toast.error(t("merchant.productEdit.errorCoverImageRequired"));
      return;
    }
    setLoading(true);
    setFieldErrors({});
    let product;
    try {
      product = await productService.create({ name: name.trim() });
    } catch (err) {
      setFieldErrors(getFieldErrors(err));
      toast.error(getErrorMessage(err, t("merchant.productNew.createFailed")));
      setLoading(false);
      return;
    }

    let failures = 0;
    for (const v of variants) {
      const lengthCm = v.lengthCm === "" ? null : Number(v.lengthCm);
      const widthCm = v.widthCm === "" ? null : Number(v.widthCm);
      const heightCm = v.heightCm === "" ? null : Number(v.heightCm);
      const hasBox = lengthCm != null && widthCm != null && heightCm != null;
      try {
        await productService.defineVariant(product.productId, {
          attributeValues: { [v.attribute]: v.value },
          price: Number(v.price),
          currency: "VND",
          weightGram: Number(v.weightGram),
          ...(hasBox ? { lengthCm, widthCm, heightCm } : {}),
        });
      } catch (err) {
        failures += 1;
        toast.error(
          t("merchant.productNew.errorVariantFailed", {
            value: v.value,
            error: getErrorMessage(err),
          }),
        );
      }
    }

    const trimmedDescription = description.trim();
    if (trimmedDescription || images.length > 0) {
      try {
        const ordered = [...images];
        const coverIndex = ordered.findIndex((url) => !isVideoUrl(url));
        if (coverIndex > 0) {
          const [cover] = ordered.splice(coverIndex, 1);
          if (cover) ordered.unshift(cover);
        }
        await productService.updateContent(product.productId, {
          images: ordered,
          description: trimmedDescription,
          tags: [],
        });
      } catch (err) {
        failures += 1;
        toast.error(
          t("merchant.productNew.errorMediaFailed", {
            error: getErrorMessage(err),
          }),
        );
      }
    }

    if (failures) {
      toast.error(t("merchant.productNew.createFailed"));
    } else {
      toast.success(t("merchant.productNew.createSuccess"));
    }
    setLoading(false);
    router.push(`/merchant/products/${product.productId}/edit`);
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => router.back()}
        className="group mb-6 inline-flex items-center gap-2 text-sm font-bold text-gray-600 transition-colors hover:text-gray-950"
      >
        <ArrowLeft
          size={16}
          className="text-gray-500 transition-transform group-hover:-translate-x-0.5 group-hover:text-gray-950"
        />
        {t("merchant.productNew.backToProducts")}
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-gray-950 sm:text-3xl">
          {t("merchant.productNew.title")}
        </h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-gray-400 bg-white p-6 shadow-xs sm:p-8"
      >
        <div>
          <h2 className="mb-4 font-semibold text-gray-900">
            {t("merchant.productNew.basicInfo")}
          </h2>
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

        <ProductImagesCard
          images={images}
          uploading={uploading}
          onAdd={handleAddImage}
          onRemove={handleRemoveImage}
          onReorder={handleReorderImages}
          embedded
        />

        <VariantsCard
          variants={displayVariants}
          removingSku={null}
          draft={newVariant}
          adding={false}
          onRemove={handleRemoveVariantDraft}
          onDraft={setNewVariant}
          onAdd={handleAddVariantDraft}
          embedded
        />

        <div>
          <div className="mb-4">
            <h2 className="font-semibold text-gray-900">
              {t("merchant.productEdit.descriptionTitle")}
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              {t("merchant.productEdit.descriptionHint")}
            </p>
          </div>
          <textarea
            rows={15}
            className="w-full rounded-lg border border-gray-400 px-4 py-2.5 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none"
            placeholder={t("merchant.productEdit.descriptionPlaceholder")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={10000}
          />
        </div>

        <div className="flex flex-wrap justify-end gap-3 pt-6">
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
  );
}

export default function NewProductPage() {
  return (
    <AuthGuard requiredRoles={["MERCHANT"]}>
      <NewProductInner />
    </AuthGuard>
  );
}
