"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, PackageX } from "lucide-react";
import AuthGuard from "@/components/auth/AuthGuard";
import { EmptyState } from "@/shared/ui";
import { useTranslation } from "@/hooks";
import { orderReturnService } from "@/lib/services";
import type { OrderReturn } from "@/types";
import {
  ApproveModal,
  ReceiveModal,
  RejectModal,
  ReturnCard,
} from "./ReturnParts";

const TAB_KEYS = [
  "all",
  "REQUESTED",
  "APPROVED",
  "ITEM_RECEIVED",
  "REJECTED",
] as const;
const TAB_MESSAGE_KEYS = {
  all: "all",
  REQUESTED: "requested",
  APPROVED: "approved",
  ITEM_RECEIVED: "itemReceived",
  REJECTED: "rejected",
} as const;

function MerchantReturnsInner() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<(typeof TAB_KEYS)[number]>("REQUESTED");
  const [approving, setApproving] = useState<OrderReturn | null>(null);
  const [rejecting, setRejecting] = useState<OrderReturn | null>(null);
  const [receiving, setReceiving] = useState<OrderReturn | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["merchant-returns"],
    queryFn: () => orderReturnService.listForMerchant(100),
  });
  const returns = data ?? [];
  const filtered =
    tab === "all" ? returns : returns.filter((item) => item.status === tab);
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["merchant-returns"] });

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {t("merchant.returns.title")}
        </h1>
        <p className="text-gray-500 text-sm mb-6">
          {t("merchant.returns.subtitle")}
        </p>
        <div className="flex gap-2 mb-6 border-b border-gray-200 overflow-x-auto">
          {TAB_KEYS.map((key) => {
            const count =
              key === "all"
                ? returns.length
                : returns.filter((item) => item.status === key).length;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${tab === key ? "text-blue-600 border-blue-600" : "text-gray-500 border-transparent hover:text-gray-700"}`}
              >
                {t(`merchant.returns.tabs.${TAB_MESSAGE_KEYS[key]}`)}
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
            icon={PackageX}
            title={t("merchant.returns.emptyTitle")}
            description={t(
              tab === "REQUESTED"
                ? "merchant.returns.emptyDescRequested"
                : "merchant.returns.emptyDescOther",
            )}
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((item) => (
              <ReturnCard
                key={item.returnId}
                rtn={item}
                onApprove={() => setApproving(item)}
                onReject={() => setRejecting(item)}
                onReceive={() => setReceiving(item)}
              />
            ))}
          </div>
        )}
      </div>
      {approving && (
        <ApproveModal
          rtn={approving}
          onClose={() => setApproving(null)}
          onSuccess={() => {
            refresh();
            setApproving(null);
          }}
        />
      )}
      {rejecting && (
        <RejectModal
          rtn={rejecting}
          onClose={() => setRejecting(null)}
          onSuccess={() => {
            refresh();
            setRejecting(null);
          }}
        />
      )}
      {receiving && (
        <ReceiveModal
          rtn={receiving}
          onClose={() => setReceiving(null)}
          onSuccess={() => {
            refresh();
            setReceiving(null);
          }}
        />
      )}
    </div>
  );
}

export default function MerchantReturnsPage() {
  return (
    <AuthGuard requiredRoles={["MERCHANT"]}>
      <MerchantReturnsInner />
    </AuthGuard>
  );
}
