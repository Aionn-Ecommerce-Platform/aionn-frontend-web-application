"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Loader2, Store, Pause, Play, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import {
  Button,
  Badge,
  EmptyState,
  Modal,
  DefinitionRow as Row,
} from "@/shared/ui";
import AuthGuard from "@/components/auth/AuthGuard";
import { merchantService } from "@/lib/services";
import { getErrorMessage } from "@/shared/lib/errors";
import { formatDateTime } from "@/shared/lib/utils";
import type { Merchant, MerchantStatus } from "@/types";
import { useTranslation } from "@/hooks";

const statusConfig: Record<
  MerchantStatus,
  { labelKey: string; variant: "success" | "warning" | "danger" }
> = {
  ACTIVE: { labelKey: "statuses.merchant.ACTIVE", variant: "success" },
  SUSPENDED: { labelKey: "statuses.merchant.SUSPENDED", variant: "warning" },
  CLOSED: { labelKey: "statuses.merchant.CLOSED", variant: "danger" },
};

type ActionType = "suspend" | "activate" | "close";

function AdminMerchantsInner() {
  const { t, locale } = useTranslation();
  const qc = useQueryClient();
  const [searchId, setSearchId] = useState("");
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [actionType, setActionType] = useState<ActionType | null>(null);
  const [reason, setReason] = useState("");

  const lookupMutation = useMutation({
    mutationFn: (id: string) => merchantService.get(id.trim()),
    onSuccess: (data) => setMerchant(data),
    onError: (err) => {
      setMerchant(null);
      toast.error(getErrorMessage(err));
    },
  });

  const suspendMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      merchantService.suspend(id, { reason }),
    onSuccess: (data) => {
      setMerchant(data);
      toast.success(t("adminMerchants.suspendSuccess"));
      qc.invalidateQueries({ queryKey: ["admin-merchant"] });
      closeAction();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const activateMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      merchantService.activate(id, { reason }),
    onSuccess: (data) => {
      setMerchant(data);
      toast.success(t("adminMerchants.activateSuccess"));
      closeAction();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const closeMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      merchantService.close(id, { reason }),
    onSuccess: (data) => {
      setMerchant(data);
      toast.success(t("adminMerchants.closeSuccess"));
      closeAction();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  function closeAction() {
    setActionType(null);
    setReason("");
  }

  function submitAction() {
    if (!merchant || !actionType) return;
    if (!reason.trim()) {
      toast.error(t("adminMerchants.reasonRequired"));
      return;
    }
    const payload = { id: merchant.merchantId, reason: reason.trim() };
    if (actionType === "suspend") suspendMutation.mutate(payload);
    if (actionType === "activate") activateMutation.mutate(payload);
    if (actionType === "close") closeMutation.mutate(payload);
  }

  const isPending =
    suspendMutation.isPending ||
    activateMutation.isPending ||
    closeMutation.isPending;

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {t("adminMerchants.title")}
        </h1>
        <p className="text-gray-500 mb-6 text-sm">
          {t("adminMerchants.description")}
        </p>

        <div className="bg-white rounded-md border border-gray-400 p-5 mb-6">
          <label
            htmlFor="merchant-id"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Merchant ID
          </label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                id="merchant-id"
                type="text"
                placeholder="MER_..."
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchId.trim()) {
                    lookupMutation.mutate(searchId);
                  }
                }}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <Button
              onClick={() => lookupMutation.mutate(searchId)}
              loading={lookupMutation.isPending}
              disabled={!searchId.trim()}
            >
              {t("common.lookup")}
            </Button>
          </div>
        </div>

        {lookupMutation.isPending ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="animate-spin text-blue-600" size={28} />
          </div>
        ) : !merchant ? (
          <EmptyState
            icon={Store}
            title={t("adminMerchants.emptyTitle")}
            description={t("adminMerchants.emptyDescription")}
          />
        ) : (
          <div className="bg-white rounded-md border border-gray-400 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-400 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {merchant.name}
                </h2>
                <p className="text-xs text-gray-500 mt-1 font-mono">
                  {merchant.merchantId}
                </p>
              </div>
              <Badge variant={statusConfig[merchant.status].variant}>
                {t(statusConfig[merchant.status].labelKey)}
              </Badge>
            </div>

            <dl className="divide-y divide-gray-50">
              <Row label="Owner ID" value={merchant.ownerId} mono />
              <Row
                label={t("common.description")}
                value={merchant.description ?? "—"}
              />
              <Row
                label="Logo"
                value={
                  merchant.logoUrl ? (
                    <a
                      href={merchant.logoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-xs"
                    >
                      {merchant.logoUrl}
                    </a>
                  ) : (
                    "—"
                  )
                }
              />
              <Row
                label={t("common.createdAt")}
                value={formatDateTime(merchant.createdAt, locale)}
              />
              <Row
                label={t("common.updatedAt")}
                value={formatDateTime(merchant.updatedAt, locale)}
              />
            </dl>

            <div className="px-6 py-4 border-t border-gray-400 bg-gray-50 flex flex-wrap gap-2">
              {merchant.status === "ACTIVE" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActionType("suspend")}
                >
                  <Pause size={14} className="mr-1.5" />
                  {t("adminMerchants.suspend")}
                </Button>
              )}
              {merchant.status === "SUSPENDED" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActionType("activate")}
                >
                  <Play size={14} className="mr-1.5" />
                  {t("adminMerchants.activate")}
                </Button>
              )}
              {merchant.status !== "CLOSED" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActionType("close")}
                  className="text-red-600 hover:bg-red-50 border-red-200"
                >
                  <XCircle size={14} className="mr-1.5" />
                  {t("adminMerchants.close")}
                </Button>
              )}
            </div>
          </div>
        )}

        <Modal
          isOpen={actionType !== null}
          onClose={closeAction}
          title={
            actionType === "suspend"
              ? t("adminMerchants.suspendTitle")
              : actionType === "activate"
                ? t("adminMerchants.activateTitle")
                : t("adminMerchants.closeTitle")
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {actionType === "close"
                ? t("adminMerchants.closeWarning")
                : t("adminMerchants.auditHelp")}
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("adminMerchants.reasonPlaceholder")}
              rows={4}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={closeAction}
                disabled={isPending}
              >
                {t("common.cancel")}
              </Button>
              <Button
                onClick={submitAction}
                loading={isPending}
                className={
                  actionType === "close" ? "bg-red-600 hover:bg-red-700" : ""
                }
              >
                {t("common.confirm")}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}

export default function AdminMerchantsPage() {
  return (
    <AuthGuard requiredRoles={["SYSTEM_ADMIN", "CS_ADMIN"]}>
      <AdminMerchantsInner />
    </AuthGuard>
  );
}
