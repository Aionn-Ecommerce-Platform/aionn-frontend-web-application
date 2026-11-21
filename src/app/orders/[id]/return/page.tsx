"use client";

import { AppImage } from "@/shared/ui";

import { use, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ImagePlus, Loader2, X } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/shared/ui";
import AuthGuard from "@/components/auth/AuthGuard";
import MemberPageLayout from "@/components/layout/MemberPageLayout";
import {
  mediaService,
  orderReturnService,
  orderService,
  uploadToCloudinary,
} from "@/lib/services";
import { qk } from "@/lib/query-keys";
import { getErrorMessage, getFieldErrors } from "@/shared/lib/errors";
import { formatCurrency } from "@/shared/lib/utils";
import { useTranslation } from "@/hooks";
import {
  RETURN_REASON_EVIDENCE_REQUIRED,
  RETURN_REASON_TYPES,
  returnReasonLabelKey,
} from "@/lib/domain/return-reasons";
import type { ReturnReasonType } from "@/types";

const MAX_REASON_LEN = 500;
const MAX_EVIDENCE_BYTES = 8 * 1024 * 1024;

function ReturnRequestInner({ orderId }: { orderId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const { t } = useTranslation();

  const [reason, setReason] = useState("");
  const [reasonType, setReasonType] = useState<ReturnReasonType | "">("");
  const [evidenceUrl, setEvidenceUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [selectedItems, setSelectedItems] = useState<Record<
    string,
    number
  > | null>(null);

  const { data: order, isLoading } = useQuery({
    queryKey: qk.order(orderId),
    queryFn: () => orderService.get(orderId),
  });

  const { data: myReturns, isLoading: returnsLoading } = useQuery({
    queryKey: ["returns", "mine", "return-form"],
    queryFn: () => orderReturnService.listMine(200),
    enabled: Boolean(order?.orderId),
  });

  const activeReturn = myReturns?.find(
    (item) =>
      item.orderId === order?.orderId &&
      ["REQUESTED", "APPROVED", "ITEM_RECEIVED"].includes(item.status),
  );

  const canReturn =
    order?.status === "COMPLETED" && !returnsLoading && !activeReturn;

  const effectiveSelected =
    selectedItems ??
    (order
      ? Object.fromEntries(order.items.map((item) => [item.skuId, item.qty]))
      : {});
  const selectedList = Object.entries(effectiveSelected)
    .filter(([, qty]) => qty > 0)
    .map(([skuId, qty]) => ({ skuId, qty }));
  const estimatedRefund = (order?.items ?? []).reduce((sum, item) => {
    const qty = effectiveSelected[item.skuId] ?? 0;
    return qty ? sum + item.unitPrice * qty : sum;
  }, 0);

  function toggleItem(skuId: string, maxQty: number) {
    setSelectedItems((current) => {
      const base = current ?? effectiveSelected;
      const next = { ...base };
      if (next[skuId]) {
        delete next[skuId];
      } else {
        next[skuId] = maxQty;
      }
      return next;
    });
  }

  function changeQty(skuId: string, maxQty: number, qty: number) {
    const clamped = Math.max(1, Math.min(maxQty, qty || 1));
    setSelectedItems((current) => ({
      ...(current ?? effectiveSelected),
      [skuId]: clamped,
    }));
  }

  async function handlePickEvidence(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(t("orders.returns.onlyImagesAllowed"));
      return;
    }
    if (file.size > MAX_EVIDENCE_BYTES) {
      toast.error(t("orders.returns.imageSizeLimit"));
      return;
    }
    setUploading(true);
    try {
      const sig = await mediaService.generateAvatarSignature();
      const url = await uploadToCloudinary(file, sig);
      setEvidenceUrl(url);
      setFieldErrors((current) => {
        const next = { ...current };
        delete next.evidence;
        return next;
      });
      toast.success(t("orders.returns.imageUploadSuccess"));
    } catch (err) {
      toast.error(getErrorMessage(err, t("orders.returns.imageUploadFailed")));
    } finally {
      setUploading(false);

      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canReturn) return;
    const trimmed = reason.trim();
    const nextErrors: Record<string, string> = {};
    if (!reasonType) {
      nextErrors.reasonType = t("orders.returns.reasonTypeRequired");
    }
    if (trimmed.length < 10) {
      nextErrors.reason = t("orders.returns.reasonLengthLimit");
    }
    if (
      reasonType &&
      RETURN_REASON_EVIDENCE_REQUIRED.has(reasonType) &&
      !evidenceUrl
    ) {
      nextErrors.evidence = t("orders.returns.evidenceRequired");
    }
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }
    setSubmitting(true);
    setFieldErrors({});
    try {
      const ret = await orderReturnService.request(orderId, {
        reasonType: reasonType as ReturnReasonType,
        reason: trimmed,
        evidenceUrl,
        items: selectedList.length ? selectedList : undefined,
      });
      toast.success(t("orders.returns.submitSuccessToast"));
      router.replace(`/orders?tab=RETURNS&highlight=${ret.returnId}`);
    } catch (err) {
      const fe = getFieldErrors(err);
      if (Object.keys(fe).length) setFieldErrors(fe);
      toast.error(getErrorMessage(err, t("orders.returns.submitErrorToast")));
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <MemberPageLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="animate-spin text-brand" size={32} />
        </div>
      </MemberPageLayout>
    );
  }

  return (
    <MemberPageLayout>
      <div className="mb-6">
        <Link
          href={`/orders/${orderId}`}
          className="group mb-6 inline-flex items-center gap-2 text-xs font-bold text-gray-600 transition-colors hover:text-gray-950 sm:text-sm"
        >
          <ArrowLeft
            size={16}
            className="text-gray-500 transition-transform group-hover:-translate-x-0.5 group-hover:text-gray-950"
          />
          {t("orders.returns.backToOrder")}
        </Link>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight">
          {t("orders.returns.title")}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {t("orders.orderId")}{" "}
          <span className="font-mono font-semibold text-gray-900 select-all">
            {orderId}
          </span>
        </p>
      </div>

      {activeReturn ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {t("orders.returns.activeReturnExists")}{" "}
          <Link
            href={`/orders?tab=RETURNS&highlight=${activeReturn.returnId}`}
            className="font-semibold underline underline-offset-2 hover:text-amber-950"
          >
            {t("orders.returns.viewRequest")}
          </Link>
        </div>
      ) : !canReturn ? (
        <div className="mb-6 p-4 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-800">
          {t("orders.returns.onlyCompletedCanReturn")}{" "}
          <span className="font-semibold">{order?.status}</span>.
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-gray-400 p-6 sm:p-8 shadow-xs space-y-5"
      >
        <div>
          <p className="block text-base font-bold text-gray-950 mb-2">
            {t("orders.returns.selectItems")}
          </p>
          <div className="space-y-2">
            {order?.items.map((item) => {
              const selectedQty = effectiveSelected[item.skuId] ?? 0;
              return (
                <div
                  key={item.skuId}
                  className="flex items-center gap-3 rounded-xl border border-gray-400 px-3.5 py-3"
                >
                  <input
                    type="checkbox"
                    checked={selectedQty > 0}
                    disabled={!canReturn || submitting}
                    onChange={() => toggleItem(item.skuId, item.qty)}
                    className="h-4 w-4 rounded border-gray-400 text-brand focus:ring-brand/30"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold text-gray-900 line-clamp-2">
                      {item.productName ?? item.skuId}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {formatCurrency(item.unitPrice, order?.currency ?? "VND")} &times;{" "}
                      {item.qty}
                      {item.variantLabel ? ` · ${item.variantLabel}` : ""}
                    </p>
                  </div>
                  {selectedQty > 0 && (
                    <input
                      type="number"
                      min={1}
                      max={item.qty}
                      value={selectedQty}
                      disabled={!canReturn || submitting}
                      onChange={(e) =>
                        changeQty(item.skuId, item.qty, Number(e.target.value))
                      }
                      className="w-16 rounded-lg border border-gray-400 px-2 py-1.5 text-sm"
                    />
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-base font-bold text-gray-950">
            {t("orders.returns.estimatedRefund")}:{" "}
            {formatCurrency(estimatedRefund, order?.currency ?? "VND")}
          </p>
        </div>

        <div>
          <label
            htmlFor="reasonType"
            className="block text-base font-bold text-gray-950 mb-2"
          >
            {t("orders.returns.reasonType")}
          </label>
          <select
            id="reasonType"
            value={reasonType}
            onChange={(e) => {
              setReasonType(e.target.value as ReturnReasonType | "");
              setFieldErrors((current) => {
                const next = { ...current };
                delete next.reasonType;
                if (!RETURN_REASON_EVIDENCE_REQUIRED.has(e.target.value as ReturnReasonType)) {
                  delete next.evidence;
                }
                return next;
              });
            }}
            disabled={!canReturn || submitting}
            className="w-full rounded-xl border border-gray-400 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand disabled:bg-gray-50"
          >
            <option value="">{t("orders.returns.reasonTypePlaceholder")}</option>
            {RETURN_REASON_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(returnReasonLabelKey(type))}
              </option>
            ))}
          </select>
          {fieldErrors.reasonType && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.reasonType}</p>
          )}
          {reasonType && RETURN_REASON_EVIDENCE_REQUIRED.has(reasonType) && (
            <p className="mt-1 text-xs text-amber-700">
              {t("orders.returns.evidenceRequiredHint")}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="reason"
            className="block text-base font-bold text-gray-950 mb-2"
          >
            {t("orders.returns.reason")}
          </label>
          <textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, MAX_REASON_LEN))}
            rows={5}
            disabled={!canReturn || submitting}
            placeholder={t("orders.returns.reasonPlaceholder")}
            className="w-full rounded-xl border border-gray-400 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand disabled:bg-gray-50"
          />
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="text-red-600">{fieldErrors.reason ?? ""}</span>
            <span className="text-gray-400">
              {reason.length}/{MAX_REASON_LEN}
            </span>
          </div>
        </div>

        <div>
          <p className="block text-base font-bold text-gray-950 mb-2">
            {t("orders.returns.evidenceLabel")}
          </p>
          {fieldErrors.evidence && (
            <p className="mb-2 text-xs font-medium text-red-600">
              {fieldErrors.evidence}
            </p>
          )}
          {evidenceUrl ? (
            <div className="relative w-full rounded-2xl border border-gray-400 p-4 bg-gray-50/50 flex items-center justify-center">
              <div className="relative">
                <AppImage
                  src={evidenceUrl}
                  alt="Evidence"
                  className="max-h-64 w-auto object-contain rounded-xl border border-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setEvidenceUrl(null)}
                  className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-white border border-gray-400 shadow-sm flex items-center justify-center hover:bg-gray-50"
                  aria-label={t("common.deleteImage")}
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={!canReturn || uploading || submitting}
              className="flex flex-col items-center justify-center w-full py-8 px-4 rounded-xl border-2 border-dashed border-gray-400 text-gray-400 hover:border-blue-400 hover:text-brand hover:bg-brand/5/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {uploading ? (
                <Loader2 className="animate-spin text-brand" size={28} />
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 mb-2">
                    <ImagePlus size={24} />
                  </div>
                  <span className="text-base font-bold text-gray-950">
                    {t("orders.returns.uploadImage")}
                  </span>
                  <span className="mt-1 text-xs text-gray-400">
                    {t("orders.returns.uploadHint")}
                  </span>
                </>
              )}
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handlePickEvidence}
            className="hidden"
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button
            type="submit"
            loading={submitting}
            disabled={!canReturn || uploading || submitting}
          >
            {t("orders.returns.submit")}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={() => router.push(`/orders/${orderId}`)}
          >
            {t("common.cancel")}
          </Button>
        </div>
      </form>
    </MemberPageLayout>
  );
}

export default function ReturnRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <AuthGuard>
      <ReturnRequestInner orderId={id} />
    </AuthGuard>
  );
}
