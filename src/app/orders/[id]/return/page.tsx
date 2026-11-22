"use client";

import { AppImage } from "@/shared/ui";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ImagePlus,
  Loader2,
  X,
} from "lucide-react";
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
import { isVideoUrl, MEDIA_LIMITS } from "@/shared/lib/media";
import { useTranslation } from "@/hooks";
import {
  RETURN_REASON_TYPES,
  returnReasonLabelKey,
} from "@/lib/domain/return-reasons";
import type { ReturnReasonType } from "@/types";

const MAX_REASON_LEN = 500;
const MAX_EVIDENCE_FILES = MEDIA_LIMITS.returnEvidenceFiles;
const MAX_EVIDENCE_IMAGE_BYTES = MEDIA_LIMITS.imageBytes;
const MAX_EVIDENCE_VIDEO_BYTES = MEDIA_LIMITS.videoBytes;

function formatVideoDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
    : `${minutes}:${String(secs).padStart(2, "0")}`;
}

function VideoEvidenceTile({ url }: { url: string }) {
  const [duration, setDuration] = useState<number | null>(null);

  return (
    <div className="relative h-full w-full bg-black">
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
    </div>
  );
}

function ReturnRequestInner({ orderId }: { orderId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const reasonRef = useRef<HTMLDivElement | null>(null);
  const { t } = useTranslation();

  const [reason, setReason] = useState("");
  const [reasonType, setReasonType] = useState<ReturnReasonType | "">("");
  const [reasonOpen, setReasonOpen] = useState(false);
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [selectedItems, setSelectedItems] = useState<Record<
    string,
    number
  > | null>(null);

  useEffect(() => {
    if (!reasonOpen) return;
    const onClick = (event: MouseEvent) => {
      if (
        reasonRef.current &&
        !reasonRef.current.contains(event.target as Node)
      ) {
        setReasonOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [reasonOpen]);

  useEffect(() => {
    if (!reasonOpen) return;
    const options =
      reasonRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]');
    const selected = reasonRef.current?.querySelector<HTMLButtonElement>(
      '[role="option"][aria-selected="true"]',
    );
    (selected ?? options?.[0])?.focus();
  }, [reasonOpen]);

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
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    if (evidenceUrls.length + files.length > MAX_EVIDENCE_FILES) {
      toast.error(
        t("orders.returns.evidenceMaxFiles", { count: MAX_EVIDENCE_FILES }),
      );
      return;
    }
    for (const file of files) {
      const isVideo = file.type.startsWith("video/");
      const isImage = file.type.startsWith("image/");
      if (!isImage && !isVideo) {
        toast.error(t("orders.returns.onlyImagesOrVideos"));
        return;
      }
      const maxBytes = isVideo
        ? MAX_EVIDENCE_VIDEO_BYTES
        : MAX_EVIDENCE_IMAGE_BYTES;
      if (file.size > maxBytes) {
        toast.error(t("orders.returns.mediaSizeLimit"));
        return;
      }
    }
    setUploading(true);
    try {
      const sig = await mediaService.generateReturnEvidenceSignature();
      const uploaded = await Promise.all(
        files.map((file) => uploadToCloudinary(file, sig)),
      );
      setEvidenceUrls((current) => [...current, ...uploaded]);
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
    if (selectedList.length === 0) {
      nextErrors.items = t("orders.returns.selectItemsRequired");
    }
    if (trimmed.length < 10) {
      nextErrors.reason = t("orders.returns.reasonLengthLimit");
    }
    if (evidenceUrls.length === 0) {
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
        evidenceUrls,
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
          {fieldErrors.items && (
            <p className="mb-2 text-xs font-medium text-red-600">
              {fieldErrors.items}
            </p>
          )}
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
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-gray-400 bg-white">
                    <Image
                      src={item.imageUrl ?? "/images/logo.png"}
                      alt={item.productName ?? item.skuId}
                      fill
                      sizes="56px"
                      className="object-contain p-1"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold text-gray-900 line-clamp-2">
                      {item.productName ?? item.skuId}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {formatCurrency(item.unitPrice, order?.currency ?? "VND")}{" "}
                      &times; {item.qty}
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
        </div>

        <div>
          <p className="block text-base font-bold text-gray-950 mb-2">
            {t("orders.returns.reasonType")}
          </p>
          <div className="relative" ref={reasonRef}>
            <button
              type="button"
              onClick={() => setReasonOpen((open) => !open)}
              disabled={!canReturn || submitting}
              aria-expanded={reasonOpen}
              aria-haspopup="listbox"
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setReasonOpen(false);
                } else if (
                  event.key === "ArrowDown" ||
                  event.key === "ArrowUp"
                ) {
                  event.preventDefault();
                  setReasonOpen(true);
                }
              }}
              className="flex w-full items-center justify-between gap-2 rounded-xl border border-gray-400 bg-white px-3.5 py-2.5 text-left text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:bg-gray-50"
            >
              <span className={reasonType ? "text-gray-900" : "text-gray-400"}>
                {reasonType
                  ? t(returnReasonLabelKey(reasonType))
                  : t("orders.returns.reasonTypePlaceholder")}
              </span>
              <ChevronDown
                size={16}
                className={`shrink-0 text-gray-700 transition-transform ${
                  reasonOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            {reasonOpen && (
              <div
                role="listbox"
                tabIndex={-1}
                className="absolute left-0 right-0 z-50 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-1.5 shadow-xl"
                onKeyDown={(event) => {
                  const options = Array.from(
                    reasonRef.current?.querySelectorAll<HTMLButtonElement>(
                      '[role="option"]',
                    ) ?? [],
                  );
                  const index = options.indexOf(
                    document.activeElement as HTMLButtonElement,
                  );
                  if (event.key === "Escape") {
                    event.preventDefault();
                    setReasonOpen(false);
                  } else if (event.key === "ArrowDown") {
                    event.preventDefault();
                    options[(index + 1) % options.length]?.focus();
                  } else if (event.key === "ArrowUp") {
                    event.preventDefault();
                    options[
                      (index - 1 + options.length) % options.length
                    ]?.focus();
                  } else if (event.key === "Home") {
                    event.preventDefault();
                    options[0]?.focus();
                  } else if (event.key === "End") {
                    event.preventDefault();
                    options[options.length - 1]?.focus();
                  }
                }}
              >
                {RETURN_REASON_TYPES.map((type) => {
                  const active = reasonType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => {
                        setReasonType(type);
                        setReasonOpen(false);
                        setFieldErrors((current) => {
                          const next = { ...current };
                          delete next.reasonType;
                          return next;
                        });
                      }}
                      className={`flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors ${
                        active
                          ? "bg-gray-950 text-white"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <span className="flex-1 text-left">
                        {t(returnReasonLabelKey(type))}
                      </span>
                      {active && (
                        <Check size={14} className="shrink-0 text-white" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          {fieldErrors.reasonType && (
            <p className="mt-1 text-xs text-red-600">
              {fieldErrors.reasonType}
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
            {t("orders.returns.evidenceLabel")}{" "}
            <span className="text-red-600">*</span>
          </p>
          <p className="mb-2 text-xs text-amber-700">
            {t("orders.returns.evidenceRequiredHint")}
          </p>
          {fieldErrors.evidence && (
            <p className="mb-2 text-xs font-medium text-red-600">
              {fieldErrors.evidence}
            </p>
          )}
          <div className="rounded-xl border-2 border-dashed border-gray-400 p-3">
            {evidenceUrls.length === 0 && !uploading ? (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={!canReturn || submitting}
                className="flex w-full flex-col items-center justify-center rounded-lg px-4 py-6 text-gray-400 transition-colors hover:bg-brand/5/20 hover:text-brand disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                  <ImagePlus size={24} />
                </div>
                <span className="text-base font-bold text-gray-950">
                  {t("orders.returns.uploadImage")}
                </span>
                <span className="mt-1 text-xs text-gray-400">
                  {t("orders.returns.uploadHint")}
                </span>
              </button>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {evidenceUrls.map((url, index) => (
                  <div
                    key={`${url}-${index}`}
                    className="relative aspect-square overflow-hidden rounded-lg border border-gray-400 bg-gray-50"
                  >
                    {isVideoUrl(url) ? (
                      <VideoEvidenceTile url={url} />
                    ) : (
                      <AppImage
                        src={url}
                        alt={t("orders.returns.evidenceLabel")}
                        width={240}
                        height={240}
                        className="h-full w-full object-cover"
                      />
                    )}
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() =>
                        setEvidenceUrls((urls) =>
                          urls.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                      className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full border border-gray-400 bg-white/95 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={t("common.deleteImage")}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {uploading && (
                  <div className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-gray-400 bg-gray-50">
                    <Loader2 className="animate-spin text-brand" size={22} />
                  </div>
                )}
                {!uploading && evidenceUrls.length < MAX_EVIDENCE_FILES && (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={!canReturn || submitting}
                    className="flex aspect-square flex-col items-center justify-center rounded-lg border border-dashed border-gray-400 bg-gray-50 text-gray-400 transition-colors hover:border-brand hover:bg-brand/5/20 hover:text-brand disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ImagePlus size={22} />
                    <span className="mt-1 text-[11px] font-semibold">
                      {t("common.add")}
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>
          <p className="mt-2 text-xs text-gray-400">
            {t("orders.returns.evidenceMediaHint", {
              count: MAX_EVIDENCE_FILES,
            })}
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handlePickEvidence}
            className="hidden"
          />
        </div>

        <div className="flex items-center justify-between py-4">
          <span className="text-base text-gray-900">
            {t("orders.returns.estimatedRefund")}
          </span>
          <span className="text-lg font-extrabold text-gray-950 sm:text-xl">
            {formatCurrency(estimatedRefund, order?.currency ?? "VND")}
          </span>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
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
