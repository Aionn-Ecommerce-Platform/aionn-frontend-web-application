"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  Search,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button, Input, Modal, Textarea } from "@/shared/ui";
import {
  AdminEmpty,
  AdminHeader,
  AdminPill,
  adminPrimaryClass,
} from "@/features/admin";
import AuthGuard from "@/components/auth/AuthGuard";
import { stockReservationService } from "@/lib/services/inventory.service";
import { getErrorMessage } from "@/shared/lib/errors";
import { formatDateTime } from "@/shared/lib/utils";
import { useTranslation } from "@/hooks";

const STATUS_BADGE: Record<
  string,
  { labelKey: string; tone: "purple" | "success" | "neutral" | "danger" }
> = {
  RESERVED: {
    labelKey: "statuses.reservation.RESERVED",
    tone: "purple",
  },
  COMMITTED: {
    labelKey: "statuses.reservation.COMMITTED",
    tone: "success",
  },
  RELEASED: {
    labelKey: "statuses.reservation.RELEASED",
    tone: "neutral",
  },
  EXPIRED: {
    labelKey: "statuses.reservation.EXPIRED",
    tone: "danger",
  },
};

function AdminReservationsInner() {
  const { t, locale } = useTranslation();
  const qc = useQueryClient();
  const [reservationInput, setReservationInput] = useState("");
  const [lookupId, setLookupId] = useState<string | null>(null);
  const [releaseTarget, setReleaseTarget] = useState<string | null>(null);
  const [releaseReason, setReleaseReason] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    skuId: "",
    warehouseId: "",
    orderId: "",
    qty: 1,
    ttlSeconds: 3600,
  });

  const {
    data: reservation,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin-reservation", lookupId],
    queryFn: () => (lookupId ? stockReservationService.get(lookupId) : null),
    enabled: !!lookupId,
    retry: false,
  });

  const commitMutation = useMutation({
    mutationFn: (id: string) => stockReservationService.commit(id),
    onSuccess: () => {
      toast.success(t("adminReservations.commitSuccess"));
      qc.invalidateQueries({ queryKey: ["admin-reservation"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const releaseMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      stockReservationService.release(id, { reason }),
    onSuccess: () => {
      toast.success(t("adminReservations.releaseSuccess"));
      setReleaseTarget(null);
      setReleaseReason("");
      qc.invalidateQueries({ queryKey: ["admin-reservation"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const reserveMutation = useMutation({
    mutationFn: () => stockReservationService.reserve(createForm),
    onSuccess: (res) => {
      toast.success(t("adminReservations.createSuccess"));
      setCreateOpen(false);
      setLookupId(res.reservationId);
      setReservationInput(res.reservationId);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  function handleLookup() {
    const id = reservationInput.trim();
    if (!id) {
      toast.error(t("adminReservations.idRequired"));
      return;
    }
    setLookupId(id);
  }

  return (
    <div className="min-h-screen">
      <AdminHeader
        icon={CalendarClock}
        title={t("adminReservations.title")}
        description={t("adminReservations.description")}
        actions={
          <Button
            className={adminPrimaryClass}
            onClick={() => setCreateOpen(true)}
          >
            <Plus size={14} />
            {t("adminReservations.create")}
          </Button>
        }
      />

      <div className="mb-6 rounded-2xl border border-gray-600 bg-white/[0.04] p-5">
        <label className="mb-2 block text-sm font-medium text-slate-300">
          {t("adminReservations.idRequired")}
        </label>
        <div className="flex items-end gap-3">
          <input
            type="text"
            value={reservationInput}
            onChange={(e) => setReservationInput(e.target.value)}
            placeholder="RES_..."
            onKeyDown={(e) => {
              if (e.key === "Enter") handleLookup();
            }}
            className="w-full flex-1 rounded-xl border border-gray-500 bg-white/5 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
          <Button
            variant="outline"
            className="border-white/20 text-slate-200 hover:bg-white/10"
            onClick={handleLookup}
            disabled={!reservationInput.trim()}
          >
            <Search size={14} className="mr-1" />
            {t("common.lookup")}
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center rounded-2xl border border-gray-600 bg-white/[0.03] p-12">
          <Loader2 className="animate-spin text-purple-300" size={28} />
        </div>
      )}

      {error && lookupId && !isLoading && (
        <AdminEmpty
          icon={AlertTriangle}
          title={t("adminReservations.notFound")}
          description={getErrorMessage(error)}
        />
      )}

      {reservation && (
        <div className="rounded-2xl border border-gray-600 bg-white/[0.04] p-6">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="font-mono text-lg font-semibold text-white">
                {reservation.reservationId}
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                {t("orders.orderId")}: {reservation.orderId}
              </p>
            </div>
            <AdminPill
              tone={STATUS_BADGE[reservation.status]?.tone ?? "neutral"}
            >
              {STATUS_BADGE[reservation.status]
                ? t(STATUS_BADGE[reservation.status]!.labelKey)
                : reservation.status}
            </AdminPill>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-slate-400">{t("merchant.inventory.colSku")}</p>
              <p className="mt-0.5 font-mono font-medium text-white">
                {reservation.skuId}
              </p>
            </div>
            <div>
              <p className="text-slate-400">
                {t("merchant.inventory.warehouseDropdownLabel")}
              </p>
              <p className="mt-0.5 font-mono font-medium text-white">
                {reservation.warehouseId}
              </p>
            </div>
            <div>
              <p className="text-slate-400">{t("common.quantity")}</p>
              <p className="mt-0.5 font-medium text-white">{reservation.qty}</p>
            </div>
            <div>
              <p className="text-slate-400">
                {t("adminReservations.expiresAt")}
              </p>
              <p className="mt-0.5 font-medium text-white">
                {reservation.expiresAt
                  ? formatDateTime(reservation.expiresAt, locale)
                  : "—"}
              </p>
            </div>
          </div>

          {reservation.status === "RESERVED" && (
            <div className="flex flex-wrap gap-2 border-t border-slate-600/60 pt-4">
              <Button
                className={adminPrimaryClass}
                size="sm"
                onClick={() => commitMutation.mutate(reservation.reservationId)}
                loading={commitMutation.isPending}
              >
                <CheckCircle2 size={14} />
                {t("statuses.reservation.COMMITTED")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-rose-300 hover:bg-rose-500/10"
                onClick={() => setReleaseTarget(reservation.reservationId)}
              >
                <XCircle size={14} />
                {t("statuses.reservation.RELEASED")}
              </Button>
            </div>
          )}
        </div>
      )}

      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t("adminReservations.createTitle")}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 p-3 rounded-lg">
            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
            <p>{t("adminReservations.createWarning")}</p>
          </div>
          <Input
            label={`${t("merchant.inventory.colSku")} *`}
            value={createForm.skuId}
            onChange={(e) =>
              setCreateForm({ ...createForm, skuId: e.target.value })
            }
            placeholder="SKU_..."
          />
          <Input
            label={`${t("merchant.inventory.warehouseDropdownLabel")} *`}
            value={createForm.warehouseId}
            onChange={(e) =>
              setCreateForm({ ...createForm, warehouseId: e.target.value })
            }
            placeholder="WH_..."
          />
          <Input
            label={`${t("orders.orderId")} *`}
            value={createForm.orderId}
            onChange={(e) =>
              setCreateForm({ ...createForm, orderId: e.target.value })
            }
            placeholder="ORD_..."
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              label={t("common.quantity")}
              value={createForm.qty}
              onChange={(e) =>
                setCreateForm({
                  ...createForm,
                  qty: parseInt(e.target.value) || 1,
                })
              }
              min={1}
            />
            <Input
              type="number"
              label={t("adminReservations.ttl")}
              value={createForm.ttlSeconds}
              onChange={(e) =>
                setCreateForm({
                  ...createForm,
                  ttlSeconds: parseInt(e.target.value) || 3600,
                })
              }
              min={60}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              className={adminPrimaryClass}
              loading={reserveMutation.isPending}
              disabled={
                !createForm.skuId ||
                !createForm.warehouseId ||
                !createForm.orderId
              }
              onClick={() => reserveMutation.mutate()}
            >
              {t("adminReservations.create")}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={releaseTarget !== null}
        onClose={() => {
          setReleaseTarget(null);
          setReleaseReason("");
        }}
        title={t("statuses.reservation.RELEASED")}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {t("adminReservations.releaseWarning")}
          </p>
          <Textarea
            label={t("adminReservations.reason")}
            value={releaseReason}
            onChange={(e) => setReleaseReason(e.target.value)}
            rows={3}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setReleaseTarget(null);
                setReleaseReason("");
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="danger"
              loading={releaseMutation.isPending}
              disabled={!releaseReason.trim()}
              onClick={() =>
                releaseTarget &&
                releaseMutation.mutate({
                  id: releaseTarget,
                  reason: releaseReason.trim(),
                })
              }
            >
              {t("statuses.reservation.RELEASED")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function AdminReservationsPage() {
  return (
    <AuthGuard requiredRoles={["SYSTEM_ADMIN"]}>
      <AdminReservationsInner />
    </AuthGuard>
  );
}
