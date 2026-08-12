"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeftRight, Loader2, Plus, Search } from "lucide-react";
import toast from "react-hot-toast";
import AuthGuard from "@/components/auth/AuthGuard";
import { Button, EmptyState } from "@/shared/ui";
import { useTranslation } from "@/hooks";
import { getErrorMessage } from "@/shared/lib/errors";
import { stockTransferService, warehouseService } from "@/lib/services";
import type { StockTransfer } from "@/types";
import {
  CancelModal,
  CompleteModal,
  CreateTransferModal,
  TransferCard,
} from "./TransferParts";

function MerchantTransfersInner() {
  const { t } = useTranslation();
  const [transferId, setTransferId] = useState("");
  const [transfer, setTransfer] = useState<StockTransfer | null>(null);
  const [creating, setCreating] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const { data: warehouses } = useQuery({
    queryKey: ["merchant-warehouses"],
    queryFn: () => warehouseService.listMine(),
  });

  const lookupMutation = useMutation({
    mutationFn: (id: string) => stockTransferService.get(id.trim()),
    onSuccess: setTransfer,
    onError: (error) => {
      setTransfer(null);
      toast.error(getErrorMessage(error));
    },
  });

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
              <ArrowLeftRight size={24} className="text-blue-600" />
              {t("merchant.transfers.title")}
            </h1>
            <p className="text-gray-500 text-sm">
              {t("merchant.transfers.subtitle")}
            </p>
          </div>
          <Button onClick={() => setCreating(true)}>
            <Plus size={16} className="mr-1.5" />
            {t("merchant.transfers.createBtn")}
          </Button>
        </div>

        <div className="bg-white rounded-md border border-gray-400 p-5 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("merchant.transfers.lookupLabel")}
          </label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                value={transferId}
                onChange={(event) => setTransferId(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && transferId.trim())
                    lookupMutation.mutate(transferId);
                }}
                placeholder="TRF_..."
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <Button
              onClick={() => lookupMutation.mutate(transferId)}
              loading={lookupMutation.isPending}
              disabled={!transferId.trim()}
            >
              {t("merchant.transfers.lookupBtn")}
            </Button>
          </div>
        </div>

        {lookupMutation.isPending ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="animate-spin text-blue-600" size={28} />
          </div>
        ) : transfer ? (
          <TransferCard
            transfer={transfer}
            onComplete={() => setCompleting(true)}
            onCancel={() => setCancelling(true)}
          />
        ) : (
          <EmptyState
            icon={ArrowLeftRight}
            title={t("merchant.transfers.emptyTitle")}
            description={t("merchant.transfers.emptyDescription")}
          />
        )}
      </div>

      {creating && (
        <CreateTransferModal
          warehouses={warehouses ?? []}
          onClose={() => setCreating(false)}
          onSuccess={(saved) => {
            setTransfer(saved);
            setTransferId(saved.transferId);
            setCreating(false);
          }}
        />
      )}
      {transfer && completing && (
        <CompleteModal
          transfer={transfer}
          onClose={() => setCompleting(false)}
          onSuccess={(saved) => {
            setTransfer(saved);
            setCompleting(false);
          }}
        />
      )}
      {transfer && cancelling && (
        <CancelModal
          transfer={transfer}
          onClose={() => setCancelling(false)}
          onSuccess={(saved) => {
            setTransfer(saved);
            setCancelling(false);
          }}
        />
      )}
    </div>
  );
}

export default function MerchantTransfersPage() {
  return (
    <AuthGuard requiredRoles={["MERCHANT"]}>
      <MerchantTransfersInner />
    </AuthGuard>
  );
}
