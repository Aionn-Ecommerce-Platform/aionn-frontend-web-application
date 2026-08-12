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
import {
  mediaService,
  orderReturnService,
  orderService,
  uploadToCloudinary,
} from "@/lib/services";
import { qk } from "@/lib/query-keys";
import { formatCurrency } from "@/shared/lib/utils";
import { getErrorMessage, getFieldErrors } from "@/shared/lib/errors";
import { useTranslation } from "@/hooks";

const MAX_REASON_LEN = 500;
const MAX_EVIDENCE_BYTES = 8 * 1024 * 1024;

function ReturnRequestInner({ orderId }: { orderId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const { t } = useTranslation();

  const [reason, setReason] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { data: order, isLoading } = useQuery({
    queryKey: qk.order(orderId),
    queryFn: () => orderService.get(orderId),
  });

  const canReturn = order?.status === "COMPLETED";

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
    if (trimmed.length < 10) {
      setFieldErrors({ reason: t("orders.returns.reasonLengthLimit") });
      return;
    }
    setSubmitting(true);
    setFieldErrors({});
    try {
      const ret = await orderReturnService.request(orderId, {
        reason: trimmed,
        evidenceUrl,
      });
      toast.success(t("orders.returns.submitSuccessToast"));
      router.replace(`/orders/returns?highlight=${ret.returnId}`);
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
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href={`/orders/${orderId}`}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-4"
        >
          <ArrowLeft size={16} />
          {t("orders.returns.backToOrder")}
        </Link>

        <h1 className="text-2xl font-bold text-gray-900">
          {t("orders.returns.title")}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {t("orders.orderId")}{" "}
          <span className="font-mono">#{orderId.slice(-8)}</span>
          {order?.totalAmount != null && (
            <>
              {" • "}
              <span className="font-medium text-gray-700">
                {formatCurrency(
                  order.totalAmount + (order.shippingFee ?? 0),
                  order.currency,
                )}
              </span>
            </>
          )}
        </p>

        {!canReturn && (
          <div className="mt-6 p-4 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-800">
            {t("orders.returns.onlyCompletedCanReturn")}{" "}
            <span className="font-semibold">{order?.status}</span>.
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="mt-6 bg-white rounded-2xl border border-gray-100 p-6 space-y-5"
        >
          <div>
            <label
              htmlFor="reason"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              {t("orders.returns.reason")}
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) =>
                setReason(e.target.value.slice(0, MAX_REASON_LEN))
              }
              rows={5}
              disabled={!canReturn || submitting}
              placeholder={t("orders.returns.reasonPlaceholder")}
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 disabled:bg-gray-50"
            />
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-red-600">{fieldErrors.reason ?? ""}</span>
              <span className="text-gray-400">
                {reason.length}/{MAX_REASON_LEN}
              </span>
            </div>
          </div>

          <div>
            <p className="block text-sm font-medium text-gray-700 mb-1.5">
              {t("orders.returns.evidenceLabel")}
            </p>
            {evidenceUrl ? (
              <div className="relative inline-block">
                <AppImage
                  src={evidenceUrl}
                  alt="Evidence"
                  className="w-40 h-40 object-cover rounded-xl border border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => setEvidenceUrl(null)}
                  className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center hover:bg-gray-50"
                  aria-label={t("common.deleteImage")}
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={!canReturn || uploading || submitting}
                className="flex flex-col items-center justify-center w-40 h-40 rounded-xl border-2 border-dashed border-gray-300 text-gray-400 hover:border-blue-400 hover:text-blue-600 transition-colors disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="animate-spin" size={22} />
                ) : (
                  <>
                    <ImagePlus size={22} />
                    <span className="mt-1.5 text-xs">
                      {t("orders.returns.uploadImage")}
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
            <p className="mt-1 text-xs text-gray-400">
              {t("orders.returns.uploadHint")}
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button
              type="submit"
              loading={submitting}
              disabled={!canReturn || uploading || submitting}
            >
              {t("orders.returns.submit")}
            </Button>
            <Link href={`/orders/${orderId}`}>
              <Button type="button" variant="outline" disabled={submitting}>
                {t("common.cancel")}
              </Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
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
