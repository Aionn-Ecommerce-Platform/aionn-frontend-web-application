"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Warehouse as WarehouseIcon,
  Plus,
  MapPin,
  Loader2,
  Pause,
  Play,
  ArrowUpDown,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button, Modal, Badge, EmptyState } from "@/shared/ui";
import AuthGuard from "@/components/auth/AuthGuard";
import { warehouseService, merchantService } from "@/lib/services";
import { getErrorMessage } from "@/shared/lib/errors";
import { formatDateTime } from "@/shared/lib/utils";
import { useTranslation } from "@/hooks";
import type { Warehouse, WarehouseStatus } from "@/types";

const STATUS_VARIANTS: Record<
  WarehouseStatus,
  "success" | "default" | "warning"
> = {
  ACTIVE: "success",
  INACTIVE: "default",
  SUSPENDED: "warning",
};

function MerchantWarehousesInner() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const statusLabels: Record<WarehouseStatus, string> = {
    ACTIVE: t("merchant.warehouses.statusActive"),
    INACTIVE: t("merchant.warehouses.statusInactive"),
    SUSPENDED: t("merchant.warehouses.statusSuspended"),
  };
  const [creating, setCreating] = useState(false);
  const [adjustingPriority, setAdjustingPriority] = useState<Warehouse | null>(
    null,
  );

  const { data: warehouses, isLoading } = useQuery({
    queryKey: ["merchant-warehouses"],
    queryFn: () => warehouseService.listMine(),
  });

  const statusMutation = useMutation({
    mutationFn: ({
      warehouseId,
      status,
    }: {
      warehouseId: string;
      status: WarehouseStatus;
    }) => warehouseService.changeStatus(warehouseId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["merchant-warehouses"] });
      toast.success(t("merchant.warehouses.toastStatusUpdated"));
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  function refresh() {
    qc.invalidateQueries({ queryKey: ["merchant-warehouses"] });
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              {t("merchant.warehouses.title")}
            </h1>
            <p className="text-gray-500 text-sm">
              {t("merchant.warehouses.subtitle")}
            </p>
          </div>
          <Button onClick={() => setCreating(true)}>
            <Plus size={16} className="mr-1.5" />
            {t("merchant.warehouses.addWarehouse")}
          </Button>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-md border border-gray-400 p-12 flex justify-center">
            <Loader2 className="animate-spin text-blue-600" size={28} />
          </div>
        ) : !warehouses || warehouses.length === 0 ? (
          <EmptyState
            icon={WarehouseIcon}
            title={t("merchant.warehouses.emptyTitle")}
            description={t("merchant.warehouses.emptyDescription")}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {warehouses.map((wh) => {
              const variant = STATUS_VARIANTS[wh.status];
              return (
                <div
                  key={wh.warehouseId}
                  className="bg-white rounded-md border border-gray-400 p-5"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <WarehouseIcon size={20} className="text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-mono text-gray-700 truncate">
                          {wh.warehouseId}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {t("merchant.warehouses.priorityLabel", {
                            value: wh.priorityLevel,
                          })}
                        </p>
                      </div>
                    </div>
                    <Badge variant={variant}>{statusLabels[wh.status]}</Badge>
                  </div>

                  <div className="flex items-start gap-2 text-sm text-gray-700 mb-3 min-h-[2.5rem]">
                    <MapPin
                      size={14}
                      className="text-gray-400 mt-0.5 flex-shrink-0"
                    />
                    <p className="line-clamp-2">
                      {wh.address || t("merchant.warehouses.noAddress")}
                    </p>
                  </div>

                  <p className="text-xs text-gray-400 mb-4">
                    {t("merchant.warehouses.createdAt", {
                      date: formatDateTime(wh.createdAt),
                    })}
                  </p>

                  <div className="flex items-center gap-2 pt-3 border-t border-gray-400">
                    {wh.status === "ACTIVE" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        loading={
                          statusMutation.isPending &&
                          statusMutation.variables?.warehouseId ===
                            wh.warehouseId
                        }
                        onClick={() =>
                          statusMutation.mutate({
                            warehouseId: wh.warehouseId,
                            status: "INACTIVE",
                          })
                        }
                        className="flex-1"
                      >
                        <Pause size={14} className="mr-1" />
                        {t("merchant.warehouses.pauseBtn")}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        loading={
                          statusMutation.isPending &&
                          statusMutation.variables?.warehouseId ===
                            wh.warehouseId
                        }
                        onClick={() =>
                          statusMutation.mutate({
                            warehouseId: wh.warehouseId,
                            status: "ACTIVE",
                          })
                        }
                        className="flex-1"
                        disabled={wh.status === "SUSPENDED"}
                      >
                        <Play size={14} className="mr-1" />
                        {t("merchant.warehouses.activateBtn")}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAdjustingPriority(wh)}
                    >
                      <ArrowUpDown size={14} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-md p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">
            {t("merchant.warehouses.aboutTitle")}
          </h4>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>{t("merchant.warehouses.aboutPriority")}</li>
            <li>{t("merchant.warehouses.aboutInactive")}</li>
            <li>{t("merchant.warehouses.aboutSuspended")}</li>
          </ul>
        </div>
      </div>

      {creating && (
        <CreateModal
          onClose={() => setCreating(false)}
          onSuccess={() => {
            refresh();
            setCreating(false);
          }}
        />
      )}

      {adjustingPriority && (
        <PriorityModal
          warehouse={adjustingPriority}
          onClose={() => setAdjustingPriority(null)}
          onSuccess={() => {
            refresh();
            setAdjustingPriority(null);
          }}
        />
      )}
    </div>
  );
}

function CreateModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const [address, setAddress] = useState("");
  const [priority, setPriority] = useState("1");

  const { data: merchant } = useQuery({
    queryKey: ["merchant", "me"],
    queryFn: () => merchantService.getMine(),
  });

  const mutation = useMutation({
    mutationFn: () =>
      warehouseService.create({
        merchantId: merchant!.merchantId,
        address: address.trim() || undefined,
        priorityLevel: Number(priority) || 1,
      }),
    onSuccess: () => {
      toast.success(t("merchant.warehouses.toastCreated"));
      onSuccess();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={t("merchant.warehouses.createTitle")}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            {t("merchant.warehouses.addressLabel")}
          </label>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={3}
            placeholder={t("merchant.warehouses.addressPlaceholder")}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            {t("merchant.warehouses.priorityRangeLabel")}
          </label>
          <input
            type="number"
            min="1"
            max="100"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            {t("merchant.warehouses.cancelBtn")}
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={!merchant}
          >
            {t("merchant.warehouses.createBtn")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function PriorityModal({
  warehouse,
  onClose,
  onSuccess,
}: {
  warehouse: Warehouse;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const [value, setValue] = useState(String(warehouse.priorityLevel));
  const mutation = useMutation({
    mutationFn: () =>
      warehouseService.adjustPriority(warehouse.warehouseId, Number(value)),
    onSuccess: () => {
      toast.success(t("merchant.warehouses.toastPriorityUpdated"));
      onSuccess();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={t("merchant.warehouses.priorityTitle")}
    >
      <div className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-3 text-xs">
          <p className="font-mono">{warehouse.warehouseId}</p>
          <p className="text-gray-500 mt-1">{warehouse.address || "—"}</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            {t("merchant.warehouses.priorityRangeHelp")}
          </label>
          <input
            type="number"
            min="1"
            max="100"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            {t("merchant.warehouses.cancelBtn")}
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={!value || Number(value) < 1 || Number(value) > 100}
          >
            {t("merchant.warehouses.saveBtn")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default function MerchantWarehousesPage() {
  return (
    <AuthGuard requiredRoles={["MERCHANT"]}>
      <MerchantWarehousesInner />
    </AuthGuard>
  );
}
