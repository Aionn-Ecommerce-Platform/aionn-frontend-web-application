"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Copy, CopyPlus, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { Badge, Button, Modal } from "@/shared/ui";
import AuthGuard from "@/components/auth/AuthGuard";
import { useTranslation } from "@/hooks";
import { useProductMediaUpload } from "./useProductMediaUpload";
import { productService } from "@/lib/services";
import { qk } from "@/lib/query-keys";
import { getProductStatus } from "@/lib/domain/status/product";
import { getErrorMessage } from "@/shared/lib/errors";
import { isVideoUrl } from "@/shared/lib/media";
import type { Product } from "@/types";
import { ProductImagesCard, VariantsCard } from "./ProductEditCards";

function MerchantProductEditInner({ productId }: { productId: string }) {
  const { data: product, isLoading } = useQuery({
    queryKey: qk.product(productId),
    queryFn: () => productService.get(productId),
  });

  if (isLoading || !product) {
    return (
      <div className="min-h-[60vh] flex justify-center items-center">
        <Loader2 className="animate-spin text-brand" size={32} />
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

  const [description, setDescription] = useState(
    () => product.description ?? "",
  );
  const [images, setImages] = useState<string[]>(() => product.imageList ?? []);
  const [newVariant, setNewVariant] = useState({
    attribute: "color",
    value: "",
    price: "",
    weightGram: "",
    lengthCm: "",
    widthCm: "",
    heightCm: "",
  });

  const [savingAll, setSavingAll] = useState(false);
  const [removingVariant, setRemovingVariant] = useState<string | null>(null);
  const [addingVariant, setAddingVariant] = useState(false);
  const [statusBusy, setStatusBusy] = useState<
    "deactivate" | "restore" | "submit" | "withdraw" | null
  >(null);
  const [cloning, setCloning] = useState(false);
  const [cloneConfirmOpen, setCloneConfirmOpen] = useState(false);
  const [productIdCopied, setProductIdCopied] = useState(false);
  const [confirmAction, setConfirmAction] = useState<
    "save" | "deactivate" | "close" | "submit" | "withdraw" | null
  >(null);
  const [deactivateReason, setDeactivateReason] = useState("");

  const isDirty =
    description.trim() !== (product.description ?? "").trim() ||
    JSON.stringify(images) !== JSON.stringify(product.imageList ?? []);

  function handleCopyProductId() {
    navigator.clipboard
      .writeText(productId)
      .then(() => {
        setProductIdCopied(true);
        toast.success(t("merchant.productEdit.copiedId"));
        setTimeout(() => setProductIdCopied(false), 2000);
      })
      .catch((err) => toast.error(getErrorMessage(err)));
  }

  async function handleClone() {
    setCloneConfirmOpen(false);
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
  }

  const {
    uploading,
    addMedia: handleAddMedia,
    removeImage: handleRemoveImage,
    reorderImages: handleReorderImages,
  } = useProductMediaUpload({
    images,
    setImages,
    messagePrefix: "merchant.productEdit",
    successMessageKey: "merchant.productEdit.uploadSuccessRemember",
  });

  async function handleSaveAll() {
    const media = [...images];
    if (media.length > 0) {
      const coverIndex = media.findIndex((url) => !isVideoUrl(url));
      if (coverIndex === -1) {
        toast.error(t("merchant.productEdit.errorCoverImageRequired"));
        return;
      }
      if (coverIndex > 0) {
        const [cover] = media.splice(coverIndex, 1);
        if (cover) media.unshift(cover);
        setImages(media);
      }
    }

    setSavingAll(true);
    try {
      const trimmedDescription = description.trim();
      const updated = await productService.updateContent(productId, {
        images: media,
        description: trimmedDescription,
        tags: product.tags ?? [],
      });
      applyOptimistic(updated);
      if (updated.imageList) setImages(updated.imageList);
      toast.success(t("merchant.productEdit.changesSaved"));
    } catch (err) {
      toast.error(
        getErrorMessage(err, t("merchant.productEdit.changesSaveFailed")),
      );
    } finally {
      setSavingAll(false);
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

  async function handleAddVariant(): Promise<boolean> {
    const price = parseFloat(newVariant.price);
    const weightGram = parseInt(newVariant.weightGram, 10);
    if (!newVariant.value.trim() || !Number.isFinite(price) || price <= 0) {
      toast.error(t("merchant.productEdit.errorVariantInputs"));
      return false;
    }
    if (!Number.isFinite(weightGram) || weightGram <= 0) {
      toast.error(
        t("merchant.productNew.errorWeightRequired", {
          value: newVariant.value,
        }),
      );
      return false;
    }
    const lengthCm = parseFloat(newVariant.lengthCm);
    const widthCm = parseFloat(newVariant.widthCm);
    const heightCm = parseFloat(newVariant.heightCm);
    const hasBox =
      Number.isFinite(lengthCm) &&
      Number.isFinite(widthCm) &&
      Number.isFinite(heightCm);
    setAddingVariant(true);
    try {
      const updated = await productService.defineVariant(productId, {
        attributeValues: { [newVariant.attribute]: newVariant.value.trim() },
        price,
        currency: product.variants[0]?.currency ?? "VND",
        weightGram,
        ...(hasBox ? { lengthCm, widthCm, heightCm } : {}),
      });
      applyOptimistic(updated);
      setNewVariant({
        attribute: newVariant.attribute,
        value: "",
        price: "",
        weightGram: "",
        lengthCm: "",
        widthCm: "",
        heightCm: "",
      });
      toast.success(t("merchant.productEdit.variantAdded"));
      return true;
    } catch (err) {
      toast.error(
        getErrorMessage(err, t("merchant.productEdit.addVariantFailed")),
      );
      return false;
    } finally {
      setAddingVariant(false);
    }
  }

  async function handleDeactivate(reason: string) {
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

  function requestClose() {
    if (isDirty) {
      setConfirmAction("close");
      return;
    }
    router.push("/merchant/products");
  }

  function confirmSave() {
    setConfirmAction(null);
    void handleSaveAll();
  }

  function confirmDeactivate() {
    const reason = deactivateReason.trim();
    if (!reason) {
      toast.error(t("merchant.productEdit.deactivateReasonRequired"));
      return;
    }
    setConfirmAction(null);
    void handleDeactivate(reason);
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

  async function handleSubmitForReview() {
    setStatusBusy("submit");
    try {
      const updated = await productService.submitForReview(productId);
      applyOptimistic(updated);
      toast.success(t("merchant.productEdit.submittedForReview"));
    } catch (err) {
      toast.error(getErrorMessage(err, t("merchant.productEdit.actionFailed")));
    } finally {
      setStatusBusy(null);
    }
  }

  function requestSubmitForReview() {
    if (isDirty || uploading) {
      toast.error(t("merchant.productEdit.saveBeforeSubmit"));
      return;
    }
    setConfirmAction("submit");
  }

  function confirmSubmitForReview() {
    if (isDirty || uploading) {
      toast.error(t("merchant.productEdit.saveBeforeSubmit"));
      return;
    }
    setConfirmAction(null);
    void handleSubmitForReview();
  }

  async function handleWithdrawReview() {
    setStatusBusy("withdraw");
    try {
      const updated = await productService.withdrawReview(productId);
      applyOptimistic(updated);
      toast.success(t("merchant.productEdit.withdrawn"));
    } catch (err) {
      toast.error(getErrorMessage(err, t("merchant.productEdit.actionFailed")));
    } finally {
      setStatusBusy(null);
    }
  }

  function confirmWithdrawReview() {
    setConfirmAction(null);
    void handleWithdrawReview();
  }

  const cfg = getProductStatus(product.status);

  return (
    <div>
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
          {t("merchant.productEdit.backToList")}
        </button>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="break-words text-2xl font-extrabold tracking-tight text-gray-950 sm:text-3xl">
                {product.name}
              </h1>
              {cfg && (
                <Badge
                  variant={cfg.variant}
                  className="!rounded-full !px-3 !py-1 !text-sm"
                >
                  {t(cfg.labelKey)}
                </Badge>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-sm text-gray-600">
              <span className="font-medium">
                {t("merchant.productEdit.productIdLabel")}:
              </span>
              <span className="font-mono font-semibold text-gray-950">
                {product.productId}
              </span>
              <button
                type="button"
                onClick={handleCopyProductId}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-400 bg-white text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-950"
                aria-label={t("merchant.productEdit.copyId")}
                title={t("merchant.productEdit.copyId")}
              >
                {productIdCopied ? (
                  <Check size={14} className="text-emerald-600" />
                ) : (
                  <Copy size={14} />
                )}
              </button>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 self-start">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setCloneConfirmOpen(true)}
              loading={cloning}
            >
              <CopyPlus size={15} className="mr-1.5" />
              {t("merchant.productEdit.clone")}
            </Button>
          </div>
        </div>

        <div className="space-y-6 rounded-2xl border border-gray-400 bg-white p-6 shadow-xs sm:p-8">
          <ProductImagesCard
            images={images}
            uploading={uploading}
            onAdd={handleAddMedia}
            onRemove={handleRemoveImage}
            onReorder={handleReorderImages}
            embedded
          />
          <VariantsCard
            variants={product.variants}
            removingSku={removingVariant}
            draft={newVariant}
            adding={addingVariant}
            onRemove={handleRemoveVariant}
            onDraft={setNewVariant}
            onAdd={handleAddVariant}
            embedded
          />
          <div className="pt-6">
            <div className="mb-4">
              <h2
                id="product-description-heading"
                className="font-semibold text-gray-900"
              >
                {t("merchant.productEdit.descriptionTitle")}
              </h2>
              <p className="mt-0.5 text-xs text-gray-500">
                {t("merchant.productEdit.descriptionHint")}
              </p>
            </div>
            <textarea
              name="description"
              aria-labelledby="product-description-heading"
              rows={15}
              className="w-full rounded-lg border border-gray-400 px-4 py-2.5 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none"
              placeholder={t("merchant.productEdit.descriptionPlaceholder")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={10000}
            />
          </div>

          <div className="flex flex-wrap justify-end gap-3 pt-6">
            <Button
              size="lg"
              onClick={() => setConfirmAction("save")}
              loading={savingAll}
            >
              {t("merchant.productEdit.saveChanges")}
            </Button>
            {(product.status === "DRAFT" || product.status === "REJECTED") && (
              <Button
                variant="success"
                size="lg"
                onClick={requestSubmitForReview}
                loading={statusBusy === "submit"}
              >
                {product.status === "REJECTED"
                  ? t("merchant.productEdit.resubmitForReview")
                  : t("merchant.productEdit.submitForReview")}
              </Button>
            )}
            {product.status === "PENDING_REVIEW" && (
              <Button
                variant="outline"
                size="lg"
                onClick={() => setConfirmAction("withdraw")}
                loading={statusBusy === "withdraw"}
              >
                {t("merchant.productEdit.withdrawReview")}
              </Button>
            )}
            {product.status === "PUBLISHED" && (
              <Button
                variant="warning"
                size="lg"
                onClick={() => {
                  setDeactivateReason("");
                  setConfirmAction("deactivate");
                }}
                loading={statusBusy === "deactivate"}
              >
                {t("merchant.productEdit.deactivate")}
              </Button>
            )}
            {product.status === "HIDDEN" && (
              <Button
                variant="success"
                size="lg"
                onClick={handleRestore}
                loading={statusBusy === "restore"}
              >
                {t("merchant.productEdit.restore")}
              </Button>
            )}
            <Button variant="outline" size="lg" onClick={requestClose}>
              {t("merchant.productEdit.close")}
            </Button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={cloneConfirmOpen}
        onClose={() => setCloneConfirmOpen(false)}
        title={t("merchant.productEdit.cloneConfirmTitle")}
        size="sm"
      >
        <p className="text-sm text-gray-600">
          {t("merchant.productEdit.cloneConfirmMessage")}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setCloneConfirmOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleClone} loading={cloning}>
            <CopyPlus size={15} className="mr-1.5" />
            {t("merchant.productEdit.cloneConfirmAction")}
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={confirmAction === "save"}
        onClose={() => setConfirmAction(null)}
        title={t("merchant.productEdit.saveConfirmTitle")}
        size="sm"
      >
        <p className="text-sm text-gray-600">
          {t("merchant.productEdit.saveConfirmMessage")}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setConfirmAction(null)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={confirmSave} loading={savingAll}>
            {t("merchant.productEdit.saveChanges")}
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={confirmAction === "deactivate"}
        onClose={() => setConfirmAction(null)}
        title={t("merchant.productEdit.deactivateConfirmTitle")}
        size="sm"
      >
        <p className="text-sm text-gray-600">
          {t("merchant.productEdit.deactivateConfirmMessage")}
        </p>
        <label
          htmlFor="deactivate-reason"
          className="mt-4 block text-sm font-medium text-gray-700"
        >
          {t("merchant.productEdit.deactivateReasonLabel")}
        </label>
        <textarea
          id="deactivate-reason"
          name="deactivateReason"
          rows={3}
          maxLength={500}
          value={deactivateReason}
          onChange={(event) => setDeactivateReason(event.target.value)}
          placeholder={t("merchant.productEdit.deactivateReasonPlaceholder")}
          className="mt-1 w-full rounded-lg border border-gray-400 px-4 py-2.5 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none"
        />
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setConfirmAction(null)}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="warning"
            onClick={confirmDeactivate}
            loading={statusBusy === "deactivate"}
          >
            {t("merchant.productEdit.deactivate")}
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={confirmAction === "submit"}
        onClose={() => setConfirmAction(null)}
        title={t("merchant.productEdit.submitConfirmTitle")}
        size="sm"
      >
        <p className="text-sm text-gray-600">
          {t("merchant.productEdit.submitConfirmMessage")}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setConfirmAction(null)}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="success"
            onClick={confirmSubmitForReview}
            loading={statusBusy === "submit"}
          >
            {product.status === "REJECTED"
              ? t("merchant.productEdit.resubmitForReview")
              : t("merchant.productEdit.submitForReview")}
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={confirmAction === "withdraw"}
        onClose={() => setConfirmAction(null)}
        title={t("merchant.productEdit.withdrawConfirmTitle")}
        size="sm"
      >
        <p className="text-sm text-gray-600">
          {t("merchant.productEdit.withdrawConfirmMessage")}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setConfirmAction(null)}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="warning"
            onClick={confirmWithdrawReview}
            loading={statusBusy === "withdraw"}
          >
            {t("merchant.productEdit.withdrawReview")}
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={confirmAction === "close"}
        onClose={() => setConfirmAction(null)}
        title={t("merchant.productEdit.closeConfirmTitle")}
        size="sm"
      >
        <p className="text-sm text-gray-600">
          {t("merchant.productEdit.closeConfirmMessage")}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setConfirmAction(null)}>
            {t("merchant.productEdit.stay")}
          </Button>
          <Button onClick={() => router.back()}>
            {t("merchant.productEdit.closeConfirmAction")}
          </Button>
        </div>
      </Modal>
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
