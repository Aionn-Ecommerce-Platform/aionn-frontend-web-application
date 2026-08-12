"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Copy } from "lucide-react";
import toast from "react-hot-toast";
import { Badge, Button, Input } from "@/shared/ui";
import AuthGuard from "@/components/auth/AuthGuard";
import { useTranslation } from "@/hooks";
import {
  mediaService,
  productService,
  uploadToCloudinary,
} from "@/lib/services";
import { qk } from "@/lib/query-keys";
import { getProductStatus } from "@/lib/domain/status/product";
import { getErrorMessage } from "@/shared/lib/errors";
import type { Product } from "@/types";
import {
  CollectionsCard,
  ProductImagesCard,
  VariantsCard,
} from "./ProductEditCards";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function MerchantProductEditInner({ productId }: { productId: string }) {
  const { data: product, isLoading } = useQuery({
    queryKey: qk.product(productId),
    queryFn: () => productService.get(productId),
  });

  if (isLoading || !product) {
    return (
      <div className="min-h-[60vh] flex justify-center items-center">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return <MerchantProductEditForm key={product.productId} product={product} />;
}

function MerchantProductEditForm({ product }: { product: Product }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { t } = useTranslation();
  const productId = product.productId;

  const [tagsInput, setTagsInput] = useState(() =>
    (product.tags ?? []).join(", "),
  );
  const [aiDescription, setAiDescription] = useState(
    () => product.aiDescription ?? "",
  );
  const [images, setImages] = useState<string[]>(() => product.imageList ?? []);
  const [variantPrices, setVariantPrices] = useState<Record<string, string>>(
    () => {
      const seeded: Record<string, string> = {};
      for (const v of product.variants) seeded[v.skuId] = String(v.price);
      return seeded;
    },
  );
  const [newVariant, setNewVariant] = useState({
    attribute: "color",
    value: "",
    price: "",
  });

  const [savingMeta, setSavingMeta] = useState(false);
  const [savingMedia, setSavingMedia] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savingVariantPrice, setSavingVariantPrice] = useState<string | null>(
    null,
  );
  const [removingVariant, setRemovingVariant] = useState<string | null>(null);
  const [addingVariant, setAddingVariant] = useState(false);
  const [statusBusy, setStatusBusy] = useState<"deactivate" | "restore" | null>(
    null,
  );
  const [cloning, setCloning] = useState(false);

  async function handleClone() {
    setCloning(true);
    try {
      const cloned = await productService.clone(productId);
      toast.success(t("merchant.productEdit.cloneSuccess"));
      router.push(`/merchant/products/${cloned.productId}/edit`);
    } catch (err) {
      toast.error(getErrorMessage(err, t("merchant.productEdit.cloneFailed")));
    } finally {
      setCloning(false);
    }
  }

  function applyOptimistic(next: Product) {
    qc.setQueryData(qk.product(productId), next);
    setVariantPrices((prev) => {
      const seeded: Record<string, string> = { ...prev };
      for (const v of next.variants) {
        if (!(v.skuId in seeded)) seeded[v.skuId] = String(v.price);
      }
      return seeded;
    });
  }

  async function handleAddImage(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error(t("merchant.productEdit.errorOnlyImage"));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error(t("merchant.productEdit.errorImageTooLarge"));
      return;
    }
    setUploading(true);
    try {
      const sig = await mediaService.generateProductImageSignature();
      const url = await uploadToCloudinary(file, sig);
      setImages((prev) => [...prev, url]);
      toast.success(t("merchant.productEdit.uploadSuccessRemember"));
    } catch (err) {
      toast.error(getErrorMessage(err, t("merchant.productEdit.uploadFailed")));
    } finally {
      setUploading(false);
    }
  }

  function handleRemoveImage(url: string) {
    setImages((prev) => prev.filter((u) => u !== url));
  }

  async function handleSaveMedia() {
    setSavingMedia(true);
    try {
      const updated = await productService.updateMedia(productId, {
        imageList: images,
      });
      applyOptimistic(updated);
      toast.success(t("merchant.productEdit.mediaSaved"));
    } catch (err) {
      toast.error(
        getErrorMessage(err, t("merchant.productEdit.mediaSaveFailed")),
      );
    } finally {
      setSavingMedia(false);
    }
  }

  async function handleSaveMeta() {
    setSavingMeta(true);
    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const updated = await productService.updateAiMetadata(productId, {
        tags,
        aiDescription: aiDescription.trim() || undefined,
      });
      applyOptimistic(updated);
      toast.success(t("merchant.productEdit.metaSaved"));
    } catch (err) {
      toast.error(getErrorMessage(err, t("merchant.productEdit.saveFailed")));
    } finally {
      setSavingMeta(false);
    }
  }

  async function handleSaveVariantPrice(skuId: string) {
    const raw = variantPrices[skuId];
    if (raw === undefined) return;
    const price = parseFloat(raw);
    if (!Number.isFinite(price) || price <= 0) {
      toast.error(t("merchant.productEdit.errorPricePositive"));
      return;
    }
    const variant = product.variants.find((v) => v.skuId === skuId);
    if (!variant) return;
    setSavingVariantPrice(skuId);
    try {
      const updated = await productService.changeVariantPrice(
        productId,
        skuId,
        price,
        variant.currency,
      );
      applyOptimistic(updated);
      toast.success(t("merchant.productEdit.priceChanged"));
    } catch (err) {
      toast.error(
        getErrorMessage(err, t("merchant.productEdit.priceChangeFailed")),
      );
    } finally {
      setSavingVariantPrice(null);
    }
  }

  async function handleRemoveVariant(skuId: string) {
    if (!confirm(t("merchant.productEdit.confirmRemoveVariant"))) return;
    setRemovingVariant(skuId);
    try {
      const updated = await productService.removeVariant(productId, skuId);
      applyOptimistic(updated);
      toast.success(t("merchant.productEdit.variantRemoved"));
    } catch (err) {
      toast.error(getErrorMessage(err, t("merchant.productEdit.removeFailed")));
    } finally {
      setRemovingVariant(null);
    }
  }

  async function handleAddVariant() {
    const price = parseFloat(newVariant.price);
    if (!newVariant.value.trim() || !Number.isFinite(price) || price <= 0) {
      toast.error(t("merchant.productEdit.errorVariantInputs"));
      return;
    }
    setAddingVariant(true);
    try {
      const updated = await productService.defineVariant(productId, {
        attributeValues: { [newVariant.attribute]: newVariant.value.trim() },
        price,
        currency: product.variants[0]?.currency ?? "VND",
      });
      applyOptimistic(updated);
      setNewVariant({ attribute: newVariant.attribute, value: "", price: "" });
      toast.success(t("merchant.productEdit.variantAdded"));
    } catch (err) {
      toast.error(
        getErrorMessage(err, t("merchant.productEdit.addVariantFailed")),
      );
    } finally {
      setAddingVariant(false);
    }
  }

  async function handleDeactivate() {
    const reason = prompt(t("merchant.productEdit.deactivateReasonPrompt"));
    if (!reason) return;
    setStatusBusy("deactivate");
    try {
      const updated = await productService.deactivate(productId, reason);
      applyOptimistic(updated);
      toast.success(t("merchant.productEdit.deactivated"));
    } catch (err) {
      toast.error(getErrorMessage(err, t("merchant.productEdit.actionFailed")));
    } finally {
      setStatusBusy(null);
    }
  }

  async function handleRestore() {
    setStatusBusy("restore");
    try {
      const updated = await productService.restore(productId);
      applyOptimistic(updated);
      toast.success(t("merchant.productEdit.restored"));
    } catch (err) {
      toast.error(getErrorMessage(err, t("merchant.productEdit.actionFailed")));
    } finally {
      setStatusBusy(null);
    }
  }

  const cfg = getProductStatus(product.status);

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href="/merchant/products"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-4"
        >
          <ArrowLeft size={16} />
          {t("merchant.productEdit.backToList")}
        </Link>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
            <p className="text-xs text-gray-400 font-mono mt-1">
              {product.productId}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClone}
              loading={cloning}
              title={t("merchant.productEdit.cloneTooltip")}
            >
              <Copy size={14} className="mr-1.5" />
              {t("merchant.productEdit.clone")}
            </Button>
            {cfg && <Badge variant={cfg.variant}>{t(cfg.labelKey)}</Badge>}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-md border border-gray-400 p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">
                {t("merchant.productEdit.status")}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {t("merchant.productEdit.statusHint")}
              </p>
            </div>
            <div className="flex gap-2">
              {product.status !== "DEACTIVATED" &&
                product.status !== "TAKEN_DOWN" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDeactivate}
                    loading={statusBusy === "deactivate"}
                  >
                    {t("merchant.productEdit.deactivate")}
                  </Button>
                )}
              {product.status === "DEACTIVATED" && (
                <Button
                  size="sm"
                  onClick={handleRestore}
                  loading={statusBusy === "restore"}
                >
                  {t("merchant.productEdit.restore")}
                </Button>
              )}
            </div>
          </div>

          <ProductImagesCard
            images={images}
            uploading={uploading}
            saving={savingMedia}
            onAdd={handleAddImage}
            onRemove={handleRemoveImage}
            onSave={handleSaveMedia}
          />
          <VariantsCard
            variants={product.variants}
            prices={variantPrices}
            savingSku={savingVariantPrice}
            removingSku={removingVariant}
            draft={newVariant}
            adding={addingVariant}
            onPrice={(sku, value) =>
              setVariantPrices((current) => ({ ...current, [sku]: value }))
            }
            onSavePrice={handleSaveVariantPrice}
            onRemove={handleRemoveVariant}
            onDraft={setNewVariant}
            onAdd={handleAddVariant}
          />
          <CollectionsCard
            productId={productId}
            initialCollectionIds={product.collectionIds ?? []}
          />

          <div className="bg-white rounded-md border border-gray-400 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">
                {t("merchant.productEdit.aiMetadata")}
              </h2>
              <Button size="sm" onClick={handleSaveMeta} loading={savingMeta}>
                {t("merchant.productEdit.save")}
              </Button>
            </div>
            <div className="space-y-4">
              <Input
                label={t("merchant.productEdit.tagsLabel")}
                placeholder={t("merchant.productEdit.tagsPlaceholder")}
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("merchant.productEdit.aiDescriptionLabel")}
                </label>
                <textarea
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                  value={aiDescription}
                  onChange={(e) => setAiDescription(e.target.value)}
                  maxLength={1000}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              size="lg"
              onClick={() => router.push("/merchant/products")}
            >
              {t("merchant.productEdit.close")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MerchantProductEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <AuthGuard requiredRoles={["MERCHANT"]}>
      <MerchantProductEditInner productId={id} />
    </AuthGuard>
  );
}
