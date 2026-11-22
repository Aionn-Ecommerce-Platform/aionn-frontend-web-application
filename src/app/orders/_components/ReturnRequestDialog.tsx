"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { AppImage, Badge, Button, ImageLightbox, Modal } from "@/shared/ui";
import { formatCurrency, formatDateTime } from "@/shared/lib/utils";
import { getReturnStatus } from "@/lib/domain/status/return";
import {
  returnReasonBadgeClass,
  returnReasonLabelKey,
} from "@/lib/domain/return-reasons";
import { orderReturnService } from "@/lib/services";
import { qk } from "@/lib/query-keys";
import { getErrorMessage } from "@/shared/lib/errors";
import { isVideoUrl } from "@/shared/lib/media";
import { useTranslation } from "@/hooks";
import type { Order, OrderReturn } from "@/types";

export default function ReturnRequestDialog({
  request,
  order,
  onClose,
}: {
  request: OrderReturn | null;
  order?: Order;
  onClose: () => void;
}) {
  const { t, locale } = useTranslation();
  const queryClient = useQueryClient();
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const status = request ? getReturnStatus(request.status) : null;
  const currency = order?.currency ?? request?.currency ?? "VND";
  const evidenceUrls = request?.evidenceUrls?.length
    ? request.evidenceUrls
    : request?.evidenceUrl
      ? [request.evidenceUrl]
      : [];

  const cancelMutation = useMutation({
    mutationFn: () => orderReturnService.cancel(request!.returnId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.myReturns });
      toast.success(t("orders.returns.cancelSuccess"));
      setConfirmingCancel(false);
      onClose();
    },
    onError: (err) =>
      toast.error(getErrorMessage(err, t("orders.returns.cancelError"))),
  });

  const handleClose = () => {
    setConfirmingCancel(false);
    onClose();
  };

  const handleModalClose = () => {
    if (previewImage) {
      return;
    }
    handleClose();
  };

  return (
    <>
      <Modal
        isOpen={Boolean(request)}
        onClose={handleModalClose}
        title={t("orders.returns.requestDetailTitle")}
        size="full"
      >
        {request && (
          <div className="min-h-[380px] space-y-5">
          <div className="space-y-3 text-base">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-gray-900">
                {t("orders.returns.reasonTypeLabel")}:
              </span>
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${returnReasonBadgeClass(
                  request.reasonType,
                )}`}
              >
                {t(returnReasonLabelKey(request.reasonType))}
              </span>
            </div>
            <p className="leading-relaxed text-gray-700">
              <span className="font-semibold text-gray-900">
                {t("orders.returns.reason")}:
              </span>{" "}
              {request.reason}
            </p>

            {evidenceUrls.length > 0 && (
              <div>
                <p className="mb-1.5 font-semibold text-gray-900">
                  {t("orders.returns.evidenceLabel")}
                </p>
                <div className="flex flex-wrap gap-3">
                  {evidenceUrls.map((url, index) =>
                    isVideoUrl(url) ? (
                      <video
                        key={`${url}-${index}`}
                        src={url}
                        controls
                        className="h-28 w-40 rounded-lg border border-gray-400 bg-black object-cover"
                      >
                        <track kind="captions" />
                      </video>
                    ) : (
                      <button
                        key={`${url}-${index}`}
                        type="button"
                        onClick={() => setPreviewImage(url)}
                        className="cursor-zoom-in"
                        aria-label={t("orders.returns.evidenceLabel")}
                      >
                        <AppImage
                          src={url}
                          alt={t("orders.returns.evidenceLabel")}
                          className="h-28 w-28 rounded-lg border border-gray-400 object-cover transition-transform hover:scale-105"
                        />
                      </button>
                    ),
                  )}
                </div>
              </div>
            )}

            {request.rejectionReason && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-red-700">
                <span className="font-semibold">
                  {t("orders.returns.rejectReasonLabel")}:
                </span>{" "}
                {request.rejectionReason}
              </p>
            )}

            {request.itemCondition && (
              <p className="text-gray-700">
                <span className="font-semibold text-gray-900">
                  {t("orders.returns.itemConditionLabel")}:
                </span>{" "}
                {request.itemCondition}
              </p>
            )}

            {(request.decidedAt || request.receivedAt) && (
              <div className="space-y-1 text-base text-gray-500">
                {request.decidedAt && (
                  <p>
                    {t("orders.returns.decidedAt", {
                      date: formatDateTime(
                        request.decidedAt,
                        locale === "vi" ? "vi-VN" : "en-US",
                      ),
                    })}
                  </p>
                )}
                {request.receivedAt && (
                  <p>
                    {t("orders.returns.receivedAt", {
                      date: formatDateTime(
                        request.receivedAt,
                        locale === "vi" ? "vi-VN" : "en-US",
                      ),
                    })}
                  </p>
                )}
              </div>
            )}

            {request.refundAmount != null && (
              <div className="flex items-baseline justify-between border-t border-gray-300 pt-3">
                <span className="font-semibold text-gray-900">
                  {t("orders.returns.refundAmountLabel")}
                </span>
                <span className="text-xl font-extrabold text-gray-950">
                  {formatCurrency(request.refundAmount, currency)}
                </span>
              </div>
            )}

            <div className="border-t border-gray-300 pt-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-base font-semibold text-gray-900">
                  {t("orders.returns.requestedAtLabel")}:
                  <span className="font-normal text-gray-700">
                    {" "}
                    {formatDateTime(
                      request.requestedAt,
                      locale === "vi" ? "vi-VN" : "en-US",
                    )}
                  </span>
                </p>
                {status && (
                  <Badge
                    variant={status.variant}
                    className="!rounded-full !px-3 !py-1 !text-base font-semibold"
                  >
                    {t(status.labelKey)}
                  </Badge>
                )}
              </div>
            </div>

            {request.status === "REQUESTED" && (
              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-300 pt-3">
                {confirmingCancel ? (
                  <>
                    <span className="mr-auto text-sm text-gray-600">
                      {t("orders.returns.cancelConfirmMsg")}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setConfirmingCancel(false)}
                      disabled={cancelMutation.isPending}
                    >
                      {t("common.cancel")}
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => cancelMutation.mutate()}
                      loading={cancelMutation.isPending}
                    >
                      {t("orders.returns.cancelConfirmLabel")}
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-300 text-red-600 hover:bg-red-50"
                    onClick={() => setConfirmingCancel(true)}
                  >
                    {t("orders.returns.cancelRequest")}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      </Modal>
      <ImageLightbox
        src={previewImage}
        alt={t("orders.returns.evidenceLabel")}
        onClose={() => setPreviewImage(null)}
      />
    </>
  );
}
