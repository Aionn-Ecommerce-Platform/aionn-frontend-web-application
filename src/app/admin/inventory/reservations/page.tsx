"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button, Badge, Input, Modal, Textarea } from "@/shared/ui";
import AuthGuard from "@/components/auth/AuthGuard";
import { stockReservationService } from "@/lib/services/inventory.service";
import { getErrorMessage } from "@/shared/lib/errors";
import { formatDateTime } from "@/shared/lib/utils";
import { useTranslation } from "@/hooks";

const STATUS_BADGE: Record<string, { labelKey: string; className: string }> = {
  RESERVED: {
    labelKey: "statuses.reservation.RESERVED",
    className: "bg-blue-100 text-blue-700",
  },
  COMMITTED: {
    labelKey: "statuses.reservation.COMMITTED",
    className: "bg-green-100 text-green-700",
  },
  RELEASED: {
    labelKey: "statuses.reservation.RELEASED",
    className: "bg-gray-100 text-gray-600",
  },
  EXPIRED: {
    labelKey: "statuses.reservation.EXPIRED",
    className: "bg-red-100 text-red-700",
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
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              {t("adminReservations.title")}
            </h1>
            <p className="text-sm text-gray-500">
              {t("adminReservations.description")}
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus size={14} className="mr-1" />
            {t("adminReservations.create")}
          </Button>
        </div>

        <div className="bg-white rounded-md border border-gray-200 p-6">
          <div className="flex items-end gap-3">
            <Input
              label="Reservation ID"
              value={reservationInput}
              onChange={(e) => setReservationInput(e.target.value)}
              placeholder="RES_..."
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleLookup();
              }}
            />
            <Button onClick={handleLookup} disabled={!reservationInput.trim()}>
              <Search size={14} className="mr-1" />
              {t("common.lookup")}
            </Button>
          </div>
        </div>

        {isLoading && (
          <div className="bg-white rounded-md border border-gray-200 p-12 flex justify-center">
            <Loader2 className="animate-spin text-blue-600" size={28} />
          </div>
        )}

        {error && lookupId && !isLoading && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-start gap-3">
            <AlertTriangle size={18} className="text-red-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">
                {t("adminReservations.notFound")}
              </p>
              <p className="text-xs text-red-600 mt-1">
                {getErrorMessage(error)}
              </p>
            </div>
          </div>
        )}

        {reservation && (
          <div className="bg-white rounded-md border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 font-mono">
                  {reservation.reservationId}
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Order: {reservation.orderId}
                </p>
              </div>
              <Badge
                className={
                  STATUS_BADGE[reservation.status]?.className ??
                  "bg-gray-100 text-gray-700"
                }
              >
                {STATUS_BADGE[reservation.status]
                  ? t(STATUS_BADGE[reservation.status]!.labelKey)
                  : reservation.status}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 text-sm">
              <div>
                <p className="text-gray-500">SKU</p>
                <p className="font-mono font-medium text-gray-900 mt-0.5">
                  {reservation.skuId}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Warehouse</p>
                <p className="font-mono font-medium text-gray-900 mt-0.5">
                  {reservation.warehouseId}
                </p>
              </div>
              <div>
                <p className="text-gray-500">{t("common.quantity")}</p>
                <p className="font-medium text-gray-900 mt-0.5">
                  {reservation.qty}
                </p>
              </div>
              <div>
                <p className="text-gray-500">
                  {t("adminReservations.expiresAt")}
                </p>
                <p className="font-medium text-gray-900 mt-0.5">
                  {reservation.expiresAt
                    ? formatDateTime(reservation.expiresAt, locale)
                    : "—"}
                </p>
              </div>
            </div>

            {reservation.status === "RESERVED" && (
              <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() =>
                    commitMutation.mutate(reservation.reservationId)
                  }
                  loading={commitMutation.isPending}
                >
                  <CheckCircle2 size={14} className="mr-1" />
                  Commit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReleaseTarget(reservation.reservationId)}
                >
                  <XCircle size={14} className="text-red-600 mr-1" />
                  <span className="text-red-600">Release</span>
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

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
            label="SKU ID *"
            value={createForm.skuId}
            onChange={(e) =>
              setCreateForm({ ...createForm, skuId: e.target.value })
            }
            placeholder="SKU_..."
          />
          <Input
            label="Warehouse ID *"
            value={createForm.warehouseId}
            onChange={(e) =>
              setCreateForm({ ...createForm, warehouseId: e.target.value })
            }
            placeholder="WH_..."
          />
          <Input
            label="Order ID *"
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
        title="Release reservation"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {t("adminReservations.releaseWarning")}
          </p>
          <Textarea
            label={t("adminReservations.reason")}
            value={releaseReason}
            onChange={(e) => setReleaseReason(e.target.value)}
            placeholder="Order cancelled, debug, manual override..."
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
              Release
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
