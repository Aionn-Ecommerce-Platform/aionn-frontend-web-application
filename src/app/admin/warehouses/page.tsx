"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Warehouse as WarehouseIcon,
  Loader2,
  Search,
  AlertTriangle,
  CheckCircle2,
  PauseCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button, Badge, Modal, Input, Textarea } from "@/shared/ui";
import AuthGuard from "@/components/auth/AuthGuard";
import { warehouseService } from "@/lib/services/warehouse.service";
import { getErrorMessage } from "@/shared/lib/errors";
import { formatDateTime } from "@/shared/lib/utils";
import type { Warehouse } from "@/types";
import { useTranslation } from "@/hooks";

const STATUS_BADGE: Record<string, { labelKey: string; className: string }> = {
  ACTIVE: {
    labelKey: "statuses.warehouse.ACTIVE",
    className: "bg-green-100 text-green-700",
  },
  SUSPENDED: {
    labelKey: "statuses.warehouse.SUSPENDED",
    className: "bg-red-100 text-red-700",
  },
  CLOSED: {
    labelKey: "statuses.warehouse.CLOSED",
    className: "bg-gray-100 text-gray-700",
  },
};

function AdminWarehousesInner() {
  const { t, locale } = useTranslation();
  const qc = useQueryClient();
  const [warehouseId, setWarehouseId] = useState("");
  const [lookupId, setLookupId] = useState<string | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<Warehouse | null>(null);
  const [reason, setReason] = useState("");

  const {
    data: warehouse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin-warehouse", lookupId],
    queryFn: () => (lookupId ? warehouseService.get(lookupId) : null),
    enabled: !!lookupId,
    retry: false,
  });

  const suspendMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      warehouseService.suspend(id, { reason }),
    onSuccess: () => {
      toast.success(t("adminWarehouses.suspendSuccess"));
      setSuspendTarget(null);
      setReason("");
      qc.invalidateQueries({ queryKey: ["admin-warehouse"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const liftMutation = useMutation({
    mutationFn: (id: string) => warehouseService.liftSuspension(id),
    onSuccess: () => {
      toast.success(t("adminWarehouses.resumeSuccess"));
      qc.invalidateQueries({ queryKey: ["admin-warehouse"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  function handleLookup() {
    const id = warehouseId.trim();
    if (!id) {
      toast.error(t("adminWarehouses.idRequired"));
      return;
    }
    setLookupId(id);
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            {t("adminWarehouses.title")}
          </h1>
          <p className="text-sm text-gray-500">
            {t("adminWarehouses.description")}
          </p>
        </div>

        <div className="bg-white rounded-md border border-gray-200 p-6">
          <div className="flex items-end gap-3">
            <Input
              label="Warehouse ID"
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              placeholder="WH_..."
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleLookup();
              }}
            />
            <Button onClick={handleLookup} disabled={!warehouseId.trim()}>
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
                {t("adminWarehouses.notFound")}
              </p>
              <p className="text-xs text-red-600 mt-1">
                {getErrorMessage(error)}
              </p>
            </div>
          </div>
        )}

        {warehouse && (
          <div className="bg-white rounded-md border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <WarehouseIcon size={22} className="text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {warehouse.warehouseId}
                  </h2>
                  <p className="text-xs text-gray-500 font-mono">
                    Merchant: {warehouse.merchantId}
                  </p>
                </div>
              </div>
              <Badge
                className={
                  STATUS_BADGE[warehouse.status]?.className ??
                  "bg-gray-100 text-gray-700"
                }
              >
                {STATUS_BADGE[warehouse.status]
                  ? t(STATUS_BADGE[warehouse.status]!.labelKey)
                  : warehouse.status}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 text-sm">
              <div>
                <p className="text-gray-500">{t("common.address")}</p>
                <p className="font-medium text-gray-900 mt-0.5">
                  {warehouse.address ?? t("adminWarehouses.notUpdated")}
                </p>
              </div>
              <div>
                <p className="text-gray-500">{t("adminWarehouses.priority")}</p>
                <p className="font-medium text-gray-900 mt-0.5">
                  {warehouse.priorityLevel}
                </p>
              </div>
              <div>
                <p className="text-gray-500">{t("common.createdAt")}</p>
                <p className="font-medium text-gray-900 mt-0.5">
                  {warehouse.createdAt
                    ? formatDateTime(warehouse.createdAt, locale)
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-gray-500">{t("common.updatedAt")}</p>
                <p className="font-medium text-gray-900 mt-0.5">
                  {warehouse.updatedAt
                    ? formatDateTime(warehouse.updatedAt, locale)
                    : "—"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
              {warehouse.status === "SUSPENDED" ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => liftMutation.mutate(warehouse.warehouseId)}
                  loading={liftMutation.isPending}
                >
                  <CheckCircle2 size={14} className="mr-1" />
                  {t("adminWarehouses.resume")}
                </Button>
              ) : warehouse.status === "ACTIVE" ? (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setSuspendTarget(warehouse)}
                >
                  <PauseCircle size={14} className="mr-1" />
                  {t("adminWarehouses.suspend")}
                </Button>
              ) : (
                <p className="text-sm text-gray-500">
                  {t("adminWarehouses.closedHelp")}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={suspendTarget !== null}
        onClose={() => {
          setSuspendTarget(null);
          setReason("");
        }}
        title={t("adminWarehouses.suspend")}
      >
        <div className="space-y-4">
          {suspendTarget && (
            <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-1">
              <p>
                <span className="text-gray-500">Kho:</span>{" "}
                <span className="font-mono">{suspendTarget.warehouseId}</span>
              </p>
              <p>
                <span className="text-gray-500">Merchant:</span>{" "}
                <span className="font-mono">{suspendTarget.merchantId}</span>
              </p>
            </div>
          )}
          <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 p-3 rounded-lg">
            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
            <p>{t("adminWarehouses.suspendWarning")}</p>
          </div>
          <Textarea
            label={t("adminWarehouses.reason")}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("adminWarehouses.reasonPlaceholder")}
            rows={3}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSuspendTarget(null);
                setReason("");
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="danger"
              loading={suspendMutation.isPending}
              disabled={!reason.trim()}
              onClick={() =>
                suspendTarget &&
                suspendMutation.mutate({
                  id: suspendTarget.warehouseId,
                  reason: reason.trim(),
                })
              }
            >
              {t("adminWarehouses.suspendAction")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function AdminWarehousesPage() {
  return (
    <AuthGuard requiredRoles={["SYSTEM_ADMIN", "CS_ADMIN"]}>
      <AdminWarehousesInner />
    </AuthGuard>
  );
}
