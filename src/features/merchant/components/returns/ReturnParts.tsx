"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { Check, Eye, PackageCheck, Play, Truck, X } from "lucide-react";
import toast from "react-hot-toast";
import { Button, Badge, ImageLightbox, Modal } from "@/shared/ui";
import { orderReturnService, shippingService, warehouseService } from "@/lib/services";
import { getErrorMessage } from "@/shared/lib/errors";
import { formatDateTime, formatCurrency } from "@/shared/lib/utils";
import { isVideoUrl } from "@/shared/lib/media";
import { useTranslation } from "@/hooks";
import {
  returnReasonBadgeClass,
  returnReasonLabelKey,
} from "@/lib/domain/return-reasons";
import type {
  OrderReturn,
  ReturnReasonType,
  ReturnStatus,
  Shipment,
} from "@/types";

const statusVariant: Record<
  ReturnStatus,
  "default" | "info" | "success" | "warning" | "danger"
> = {
  REQUESTED: "warning",
  APPROVED: "info",
  ITEM_RECEIVED: "success",
  REJECTED: "danger",
  REFUNDED: "success",
  CANCELLED: "default",
};

const statusBadgeClass: Record<ReturnStatus, string> = {
  REQUESTED: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  APPROVED: "border-sky-400/30 bg-sky-400/10 text-sky-300",
  ITEM_RECEIVED: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  REJECTED: "border-rose-400/30 bg-rose-400/10 text-rose-300",
  REFUNDED: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  CANCELLED: "border-slate-500/40 bg-white/5 text-slate-300",
};

const reasonBadgeClass: Record<ReturnReasonType, string> = {
  WRONG_ITEM: "border-blue-400/30 bg-blue-400/10 text-blue-300",
  DAMAGED: "border-rose-400/30 bg-rose-400/10 text-rose-300",
  DEFECTIVE: "border-rose-400/30 bg-rose-400/10 text-rose-300",
  NOT_AS_DESCRIBED: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  MISSING_PARTS: "border-purple-400/30 bg-purple-400/10 text-purple-300",
  WRONG_SIZE: "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
  LATE_DELIVERY: "border-orange-400/30 bg-orange-400/10 text-orange-300",
  CHANGED_MIND: "border-slate-500/40 bg-white/5 text-slate-300",
  OTHER: "border-slate-500/40 bg-white/5 text-slate-300",
};

const statusLabelKey: Record<ReturnStatus, string> = {
  REQUESTED: "merchant.returns.status.requested",
  APPROVED: "merchant.returns.status.approved",
  ITEM_RECEIVED: "merchant.returns.status.itemReceived",
  REJECTED: "merchant.returns.status.rejected",
  REFUNDED: "merchant.returns.status.refunded",
  CANCELLED: "merchant.returns.status.cancelled",
};

const pickupStatusKey: Record<string, string> = {
  REQUESTED: "merchant.returns.pickupStatusRequested",
  REGISTERED: "merchant.returns.pickupStatusRegistered",
  PICKED_UP: "merchant.returns.pickupStatusPickedUp",
  IN_TRANSIT: "merchant.returns.pickupStatusInTransit",
  OUT_FOR_DELIVERY: "merchant.returns.pickupStatusInTransit",
  DELIVERED: "merchant.returns.pickupStatusDelivered",
  DELIVERY_FAILED: "merchant.returns.pickupStatusFailed",
  RETURNED: "merchant.returns.pickupStatusFailed",
  CANCELLED: "merchant.returns.pickupStatusCancelled",
};

function pickupBadgeClass(status: string) {
  if (status === "DELIVERED") {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-300";
  }
  if (status === "DELIVERY_FAILED" || status === "RETURNED") {
    return "border-rose-400/30 bg-rose-400/10 text-rose-300";
  }
  if (status === "CANCELLED") {
    return "border-slate-500/40 bg-white/5 text-slate-300";
  }
  if (status === "REQUESTED") {
    return "border-amber-400/30 bg-amber-400/10 text-amber-300";
  }
  return "border-sky-400/30 bg-sky-400/10 text-sky-300";
}

export function ReturnPickupPanel({
  rtn,
  onChanged,
}: {
  rtn: OrderReturn;
  onChanged?: () => void;
}) {
  const { t, locale } = useTranslation();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  const { data: pickups, isLoading } = useQuery({
    queryKey: ["return-pickups", rtn.returnId],
    queryFn: () => shippingService.listByReturn(rtn.returnId),
  });
  const pickup: Shipment | undefined = pickups?.find(
    (item) => item.status !== "CANCELLED",
  );

  const refresh = () => {
    queryClient.invalidateQueries({
      queryKey: ["return-pickups", rtn.returnId],
    });
    onChanged?.();
  };

  async function book() {
    setBusy(true);
    try {
      const created =
        pickup ?? (await shippingService.createReturnPickup(rtn.returnId));
      toast.success(t("merchant.returns.pickupCreated"));
      if (created.status === "REQUESTED") {
        try {
          await shippingService.register(created.shipmentId);
          toast.success(t("merchant.returns.pickupRegistered"));
        } catch {
          toast.error(t("merchant.returns.pickupRegisterFailed"));
        }
      }
      refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function register() {
    if (!pickup) return;
    setBusy(true);
    try {
      await shippingService.register(pickup.shipmentId);
      toast.success(t("merchant.returns.pickupRegistered"));
      refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (!pickup) return;
    setBusy(true);
    try {
      await shippingService.cancel(
        pickup.shipmentId,
        "Merchant cancelled return pickup",
      );
      toast.success(t("merchant.returns.pickupStatusCancelled"));
      refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) {
    return <p className="text-sm text-gray-500">…</p>;
  }

  if (!pickup) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-600">
          {t("merchant.returns.pickupEmpty")}
        </p>
        {rtn.status === "APPROVED" && (
          <Button onClick={book} loading={busy}>
            {t("merchant.returns.pickupConfirm")}
          </Button>
        )}
      </div>
    );
  }

  const cancellable =
    pickup.status === "REQUESTED" || pickup.status === "REGISTERED";
  const canRegister = pickup.status === "REQUESTED";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${pickupBadgeClass(pickup.status)}`}
        >
          {t(pickupStatusKey[pickup.status] ?? "merchant.returns.pickupStatus")}
        </span>
        {pickup.shippingFee > 0 && (
          <span className="text-xs text-gray-500">
            {t("merchant.returns.pickupFee")}:{" "}
            {formatCurrency(pickup.shippingFee, pickup.currency, locale)}
          </span>
        )}
      </div>
      {pickup.trackingCode && (
        <p className="text-sm text-gray-700">
          {t("merchant.returns.pickupTracking")}:{" "}
          <span className="font-mono font-semibold">{pickup.trackingCode}</span>
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {canRegister && (
          <Button size="sm" onClick={register} loading={busy}>
            {t("merchant.returns.pickupRegister")}
          </Button>
        )}
        {cancellable && (
          <Button size="sm" variant="outline" onClick={cancel} loading={busy}>
            {t("merchant.returns.pickupCancel")}
          </Button>
        )}
      </div>
    </div>
  );
}

export function ReturnPickupModal({
  rtn,
  onClose,
  onSuccess,
}: {
  rtn: OrderReturn;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal
      isOpen
      onClose={onClose}
      title={t("merchant.returns.pickupTitle")}
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          {t("merchant.returns.pickupDesc")}
        </p>
        <div className="rounded-lg bg-gray-50 p-3 text-sm">
          <p className="text-gray-500">
            {t("merchant.returns.pickupWarehouse")}
          </p>
          <p className="mt-1 font-mono font-semibold text-gray-900">
            {rtn.returnWarehouseId ?? t("merchant.returns.pickupMissingWarehouse")}
          </p>
        </div>
        <ReturnPickupPanel rtn={rtn} onChanged={onSuccess} />
        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            {t("merchant.returns.btnClose")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
export function ReturnRow({
  rtn,
  onApprove,
  onReject,
  onReceive,
  onPickup,
  onDetail,
}: {
  rtn: OrderReturn;
  onApprove: () => void;
  onReject: () => void;
  onReceive: () => void;
  onPickup: () => void;
  onDetail: () => void;
}) {
  const { t, locale } = useTranslation();
  const statusLabel = t(statusLabelKey[rtn.status]);

  return (
    <tr className="border-b border-slate-600/60 transition-colors last:border-0 hover:bg-white/[0.04]">
      <td className="whitespace-nowrap px-4 py-3 text-center">
        <p className="font-mono text-[13px] font-semibold text-white">
          {rtn.returnId}
        </p>
        <p className="text-xs text-slate-400">
          {formatDateTime(rtn.requestedAt, locale)}
        </p>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-center">
        <span
          className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${reasonBadgeClass[rtn.reasonType]}`}
        >
          {t(returnReasonLabelKey(rtn.reasonType))}
        </span>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-center text-sm font-semibold text-white">
        {rtn.refundAmount != null && rtn.currency
          ? formatCurrency(rtn.refundAmount, rtn.currency, locale)
          : "—"}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-center">
        <span
          className={`inline-flex items-center whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold ${statusBadgeClass[rtn.status]}`}
        >
          {statusLabel}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-center gap-1">
          {rtn.status === "REQUESTED" && (
            <>
              <button
                type="button"
                onClick={onApprove}
                className="rounded-lg p-1.5 text-emerald-400 transition-colors hover:bg-emerald-500/10 hover:text-emerald-300"
                title={t("merchant.returns.btnApprove")}
                aria-label={t("merchant.returns.btnApprove")}
              >
                <Check size={15} />
              </button>
              <button
                type="button"
                onClick={onReject}
                className="rounded-lg p-1.5 text-rose-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
                title={t("merchant.returns.btnReject")}
                aria-label={t("merchant.returns.btnReject")}
              >
                <X size={15} />
              </button>
            </>
          )}
          {rtn.status === "APPROVED" && (
            <>
              <button
                type="button"
                onClick={onPickup}
                className="rounded-lg p-1.5 text-sky-400 transition-colors hover:bg-sky-500/10 hover:text-sky-300"
                title={t("merchant.returns.btnBookPickup")}
                aria-label={t("merchant.returns.btnBookPickup")}
              >
                <Truck size={15} />
              </button>
              <button
                type="button"
                onClick={onReceive}
                className="rounded-lg p-1.5 text-emerald-400 transition-colors hover:bg-emerald-500/10 hover:text-emerald-300"
                title={t("merchant.returns.btnItemReceived")}
                aria-label={t("merchant.returns.btnItemReceived")}
              >
                <PackageCheck size={15} />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onDetail}
            className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
            title={t("merchant.returns.btnDetail")}
            aria-label={t("merchant.returns.btnDetail")}
          >
            <Eye size={15} />
          </button>
        </div>
      </td>
    </tr>
  );
}

export function ReturnDetailModal({
  rtn,
  onClose,
}: {
  rtn: OrderReturn;
  onClose: () => void;
}) {
  const { t, locale } = useTranslation();
  const [preview, setPreview] = useState<string | null>(null);
  const evidence = rtn.evidenceUrls?.length
    ? rtn.evidenceUrls
    : rtn.evidenceUrl
      ? [rtn.evidenceUrl]
      : [];

  return (
    <>
      <Modal
        isOpen
        onClose={onClose}
        title={t("merchant.returns.detailTitle")}
        size="full"
      >
        <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-2 text-sm">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-gray-500">
                {t("merchant.returns.returnLabel")}
              </p>
              <p className="mt-1 break-all font-mono text-sm font-semibold text-gray-900">
                {rtn.returnId}
              </p>
            </div>
            <div>
              <p className="text-gray-500">
                {t("merchant.returns.detailRequestedAt")}
              </p>
              <p className="mt-1 font-medium text-gray-900">
                {formatDateTime(rtn.requestedAt, locale)}
              </p>
            </div>
            <div>
              <p className="text-gray-500">
                {t("merchant.returns.detailCustomer")}
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {rtn.recipientName ?? rtn.userId}
              </p>
              {rtn.recipientPhone && (
                <p className="text-sm text-gray-500">{rtn.recipientPhone}</p>
              )}
            </div>
            <div>
              <p className="text-gray-500">
                {t("merchant.returns.detailStatus")}
              </p>
              <Badge
                variant={statusVariant[rtn.status]}
                className="!mt-1 !rounded-full !px-3 !py-1 !text-xs"
              >
                {t(statusLabelKey[rtn.status])}
              </Badge>
            </div>
            <div>
              <p className="text-gray-500">
                {t("merchant.returns.orderLabel")}
              </p>
              <p className="mt-1 break-all font-mono text-sm font-semibold text-gray-900">
                {rtn.orderId}
              </p>
            </div>
            <div>
              <p className="text-gray-500">
                {t("merchant.returns.detailReasonType")}
              </p>
              <Badge
                variant="info"
                className={`!mt-1 !rounded-full !px-3 !py-1 !text-xs ${returnReasonBadgeClass(rtn.reasonType)}`}
              >
                {t(returnReasonLabelKey(rtn.reasonType))}
              </Badge>
            </div>
          </div>

          <div>
            <h4 className="mb-2 font-semibold text-gray-900">
              {t("merchant.returns.itemConditionLabel")}
            </h4>
            <p className="whitespace-pre-wrap text-sm text-gray-700">
              {rtn.itemCondition || t("merchant.returns.itemConditionEmpty")}
            </p>
          </div>

          <div>
            <h4 className="mb-2 font-semibold text-gray-900">
              {t("merchant.returns.customerReason")}
            </h4>
            <p className="whitespace-pre-wrap text-sm text-gray-700">
              {rtn.reason}
            </p>
          </div>

          {evidence.length > 0 && (
            <div>
              <h4 className="mb-2 font-semibold text-gray-900">
                {t("merchant.returns.detailEvidence")}
              </h4>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {evidence.map((url, index) => (
                  <button
                    key={`${url}-${index}`}
                    type="button"
                    onClick={() => setPreview(url)}
                    className="group relative block aspect-square cursor-zoom-in overflow-hidden rounded-lg border border-gray-300 bg-gray-100 focus:outline-none focus:ring-2 focus:ring-brand/40"
                    aria-label={t("merchant.returns.viewEvidence")}
                  >
                    {isVideoUrl(url) ? (
                      <>
                        <video
                          src={url}
                          muted
                          playsInline
                          preload="metadata"
                          className="pointer-events-none h-full w-full object-cover"
                        >
                          <track kind="captions" />
                        </video>
                        <span className="absolute inset-0 flex items-center justify-center bg-black/25 text-white transition-colors group-hover:bg-black/40">
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50">
                            <Play size={18} className="fill-current" />
                          </span>
                        </span>
                      </>
                    ) : (
                      <Image
                        src={url}
                        alt={t("merchant.returns.viewEvidence")}
                        fill
                        sizes="120px"
                        className="object-cover transition-transform group-hover:scale-105"
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {rtn.rejectionReason && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              <span className="font-semibold">
                {t("merchant.returns.rejectReasonLabel")}
              </span>{" "}
              {rtn.rejectionReason}
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-gray-900">
              {t("merchant.returns.refundAmountLabel")}
            </span>
            <span className="text-base font-bold text-brand">
              {rtn.refundAmount != null && rtn.currency
                ? formatCurrency(rtn.refundAmount, rtn.currency, locale)
                : "—"}
            </span>
          </div>

          <div>
            <h4 className="mb-2 font-semibold text-gray-900">
              {t("merchant.returns.pickupStatus")}
            </h4>
            <ReturnPickupPanel rtn={rtn} />
          </div>

          <div className="flex justify-end border-t border-gray-300 pt-4">
            <Button variant="outline" onClick={onClose}>
              {t("merchant.returns.btnClose")}
            </Button>
          </div>
        </div>
      </Modal>
      <ImageLightbox
        src={preview}
        alt={t("merchant.returns.viewEvidence")}
        onClose={() => setPreview(null)}
      />
    </>
  );
}

export function ApproveModal({
  rtn,
  onClose,
  onSuccess,
}: {
  rtn: OrderReturn;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const [refundAmount, setRefundAmount] = useState("");
  const [currency, setCurrency] = useState("VND");
  const [warehouseId, setWarehouseId] = useState(
    rtn.returnWarehouseId ?? "",
  );

  const { data: warehousePage, isLoading: warehousesLoading } = useQuery({
    queryKey: ["warehouse-options"],
    queryFn: () => warehouseService.listMine({ status: "ACTIVE", limit: 100 }),
  });
  const warehouses = warehousePage?.content ?? [];

  const mutation = useMutation({
    mutationFn: () =>
      orderReturnService.approve(rtn.returnId, {
        refundAmount: Number(refundAmount),
        currency,
        returnWarehouseId: warehouseId.trim() || null,
      }),
    onSuccess: () => {
      toast.success(t("merchant.returns.toastApproved"));
      onSuccess();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={t("merchant.returns.approveModalTitle")}
    >
      <div className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-1">
          <div>
            <Badge
              variant="info"
              className={returnReasonBadgeClass(rtn.reasonType)}
            >
              {t(returnReasonLabelKey(rtn.reasonType))}
            </Badge>
          </div>
          <p className="text-gray-700">
            <span className="text-gray-500">
              {t("merchant.returns.reasonLabel")}
            </span>{" "}
            {rtn.reason}
          </p>
          <p className="text-gray-700">
            <span className="text-gray-500">
              {t("merchant.returns.orderLabel")}:
            </span>{" "}
            <span className="font-mono">{rtn.orderId}</span>
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t("merchant.returns.fieldRefundAmount")}
            </label>
            <input
              type="number"
              min="0"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t("merchant.returns.fieldCurrency")}
            </label>
            <input
              type="text"
              maxLength={3}
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm uppercase focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            {t("merchant.returns.fieldWarehouse")}
          </label>
          <select
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            disabled={warehousesLoading}
            className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          >
            <option value="">
              {warehousesLoading
                ? "…"
                : t("merchant.returns.pickupMissingWarehouse")}
            </option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.warehouseId} value={warehouse.warehouseId}>
                {warehouse.address ?? warehouse.warehouseId}
                {warehouse.pickupName ? ` · ${warehouse.pickupName}` : ""}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">
            {t("merchant.returns.warehouseHint")}
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            {t("merchant.returns.btnCancel")}
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={!refundAmount || Number(refundAmount) < 0}
          >
            {t("merchant.returns.btnApprove")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function RejectModal({
  rtn,
  onClose,
  onSuccess,
}: {
  rtn: OrderReturn;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");

  const mutation = useMutation({
    mutationFn: () => orderReturnService.reject(rtn.returnId, reason.trim()),
    onSuccess: () => {
      toast.success(t("merchant.returns.toastRejected"));
      onSuccess();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={t("merchant.returns.rejectModalTitle")}
    >
      <div className="space-y-4">
        <p className="text-xs text-gray-600">
          {t("merchant.returns.rejectHint")}
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          placeholder={t("merchant.returns.rejectPlaceholder")}
          className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            {t("merchant.returns.btnCancel")}
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={!reason.trim()}
            className="bg-red-600 hover:bg-red-700"
          >
            {t("merchant.returns.btnReject")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function ReceiveModal({
  rtn,
  onClose,
  onSuccess,
}: {
  rtn: OrderReturn;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const [condition, setCondition] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      orderReturnService.confirmItemReceived(rtn.returnId, condition.trim()),
    onSuccess: () => {
      toast.success(t("merchant.returns.toastReceived"));
      onSuccess();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={t("merchant.returns.receiveModalTitle")}
    >
      <div className="space-y-4">
        <p className="text-xs text-gray-600">
          {t("merchant.returns.receiveHint")}
        </p>
        <textarea
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
          rows={4}
          placeholder={t("merchant.returns.receivePlaceholder")}
          className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            {t("merchant.returns.btnCancel")}
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={!condition.trim()}
          >
            {t("merchant.returns.btnConfirm")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
