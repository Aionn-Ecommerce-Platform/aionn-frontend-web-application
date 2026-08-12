"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Loader2, X, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { Button, Badge, EmptyState, Modal } from "@/shared/ui";
import AuthGuard from "@/components/auth/AuthGuard";
import {
  flashSaleService,
  type FlashSaleRegistration,
  type FlashSaleRegistrationStatus,
} from "@/lib/services/flash-sale.service";
import { getErrorMessage } from "@/shared/lib/errors";
import { formatDateTime, formatCurrency } from "@/shared/lib/utils";
import { useTranslation } from "@/hooks";

const TAB_KEYS: Array<FlashSaleRegistrationStatus | "all"> = [
  "all",
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
];

const STATUS_VARIANTS = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  CANCELLED: "default",
} as const;
const STATUS_MESSAGE_KEYS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
} as const;

function MerchantFlashSalesInner() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [tab, setTab] = useState<(typeof TAB_KEYS)[number]>("all");
  const [registering, setRegistering] = useState(false);
  const [cancelling, setCancelling] = useState<FlashSaleRegistration | null>(
    null,
  );

  const { data, isLoading } = useQuery({
    queryKey: ["merchant-flash-sales"],
    queryFn: () => flashSaleService.listMine(),
  });

  const items = data ?? [];
  const filtered =
    tab === "all" ? items : items.filter((r) => r.status === tab);

  const cancelMutation = useMutation({
    mutationFn: (registrationId: string) =>
      flashSaleService.cancel(registrationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["merchant-flash-sales"] });
      toast.success(t("merchant.flashSales.toast.cancelled"));
      setCancelling(null);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              {t("merchant.flashSales.title")}
            </h1>
            <p className="text-gray-500 text-sm">
              {t("merchant.flashSales.subtitle")}
            </p>
          </div>
          <Button onClick={() => setRegistering(true)}>
            <Plus size={16} className="mr-1.5" />
            {t("merchant.flashSales.registerNew")}
          </Button>
        </div>

        <div className="flex gap-2 mb-6 border-b border-gray-200 overflow-x-auto">
          {TAB_KEYS.map((key) => {
            const count =
              key === "all"
                ? items.length
                : items.filter((r) => r.status === key).length;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
                  tab === key
                    ? "text-blue-600 border-blue-600"
                    : "text-gray-500 border-transparent hover:text-gray-700"
                }`}
              >
                {key === "all"
                  ? t("merchant.flashSales.tabs.all")
                  : t(`merchant.flashSales.status.${STATUS_MESSAGE_KEYS[key]}`)}
                {count > 0 && (
                  <span className="ml-1.5 text-xs text-gray-400">
                    ({count})
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="animate-spin text-blue-600" size={28} />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title={t("merchant.flashSales.empty.title")}
            description={
              tab === "all"
                ? t("merchant.flashSales.empty.descriptionAll")
                : t("merchant.flashSales.empty.descriptionFiltered")
            }
          />
        ) : (
          <div className="bg-white rounded-md border border-gray-400 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-400 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      {t("merchant.flashSales.table.productSku")}
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      Campaign
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      {t("merchant.flashSales.table.priceStockSold")}
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      {t("merchant.flashSales.table.status")}
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      {t("merchant.flashSales.table.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const variant = STATUS_VARIANTS[r.status];
                    return (
                      <tr
                        key={r.registrationId}
                        className="border-b border-gray-50 hover:bg-gray-50"
                      >
                        <td className="px-4 py-3">
                          <p className="text-xs font-mono text-gray-900">
                            {r.productId}
                          </p>
                          <p className="text-xs text-gray-500 font-mono">
                            {r.skuId}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs font-mono text-gray-700">
                            {r.campaignId}
                          </p>
                          <p className="text-xs text-gray-400">
                            {formatDateTime(r.submittedAt)}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {formatCurrency(r.salePrice, r.currency)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {t("merchant.flashSales.soldOfStock", {
                              sold: r.soldCount,
                              stock: r.saleStock,
                            })}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={variant}>
                            {t(
                              `merchant.flashSales.status.${STATUS_MESSAGE_KEYS[r.status]}`,
                            )}
                          </Badge>
                          {r.rejectReason && (
                            <p className="text-xs text-red-600 mt-1 max-w-[180px]">
                              {r.rejectReason}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {r.status === "PENDING" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCancelling(r)}
                              className="text-red-600 border-red-200 hover:bg-red-50"
                            >
                              <X size={14} className="mr-1" />
                              {t("merchant.flashSales.cancelShort")}
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {registering && (
        <RegisterModal
          onClose={() => setRegistering(false)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ["merchant-flash-sales"] });
            setRegistering(false);
          }}
        />
      )}

      <Modal
        isOpen={cancelling !== null}
        onClose={() => setCancelling(null)}
        title={t("merchant.flashSales.cancelModal.title")}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {t("merchant.flashSales.cancelModal.confirm")}
          </p>
          {cancelling && (
            <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-1">
              <p>
                <span className="text-gray-500">SKU:</span>{" "}
                <span className="font-mono">{cancelling.skuId}</span>
              </p>
              <p>
                <span className="text-gray-500">Campaign:</span>{" "}
                <span className="font-mono">{cancelling.campaignId}</span>
              </p>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setCancelling(null)}
              disabled={cancelMutation.isPending}
            >
              {t("merchant.flashSales.cancelModal.back")}
            </Button>
            <Button
              onClick={() =>
                cancelling && cancelMutation.mutate(cancelling.registrationId)
              }
              loading={cancelMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {t("merchant.flashSales.cancelModal.confirmButton")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
import { RegisterModal } from "./RegisterModal";

export default function MerchantFlashSalesPage() {
  return (
    <AuthGuard requiredRoles={["MERCHANT"]}>
      <MerchantFlashSalesInner />
    </AuthGuard>
  );
}
