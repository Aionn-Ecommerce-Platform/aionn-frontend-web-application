"use client";

import { AppImage } from "@/shared/ui";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  PackageX,
  RotateCcw,
  CheckCircle2,
  XCircle,
  PackageCheck,
  CircleDollarSign,
} from "lucide-react";
import { Badge, Button, EmptyState } from "@/shared/ui";
import AuthGuard from "@/components/auth/AuthGuard";
import MemberPageLayout from "@/components/layout/MemberPageLayout";
import { orderReturnService } from "@/lib/services";
import { formatCurrency, formatDateTime } from "@/shared/lib/utils";
import type { ReturnStatus } from "@/types";
import { useTranslation } from "@/hooks";
import { getReturnStatus } from "@/lib/domain/status/return";

const RETURN_STATUS_ICON: Record<ReturnStatus, typeof RotateCcw> = {
  REQUESTED: RotateCcw,
  APPROVED: CheckCircle2,
  REJECTED: XCircle,
  ITEM_RECEIVED: PackageCheck,
  REFUNDED: CircleDollarSign,
  CANCELLED: XCircle,
};

function ReturnsInner() {
  const params = useSearchParams();
  const highlight = params.get("highlight");
  const { t, locale } = useTranslation();

  const { data: returns, isLoading } = useQuery({
    queryKey: ["returns", "mine"],
    queryFn: () => orderReturnService.listMine(50),
  });

  return (
    <MemberPageLayout>
      <h1 className="text-2xl font-bold text-gray-900">
        {t("orders.returns.title")}
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        {t("orders.returns.description")}
      </p>

      <div className="mt-6 bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
        {isLoading ? (
          <div className="py-20 flex justify-center items-center">
            <Loader2 className="animate-spin text-blue-600" size={32} />
          </div>
        ) : !returns || returns.length === 0 ? (
          <EmptyState
            icon={PackageX}
            title={t("orders.returns.noReturns")}
            description={t("orders.returns.noReturnsDesc")}
            action={
              <Link href="/orders">
                <Button variant="outline">
                  {t("orders.returns.viewMyOrders")}
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-4">
            {returns.map((r) => {
              const status = getReturnStatus(r.status);
              const Icon = RETURN_STATUS_ICON[r.status];
              const isHighlight = highlight === r.returnId;

              return (
                <div
                  key={r.returnId}
                  className={`bg-gray-50/50 rounded-2xl border p-5 transition-shadow hover:bg-gray-50 ${
                    isHighlight
                      ? "border-blue-300 shadow-md shadow-blue-100"
                      : "border-gray-100 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                      <Icon size={18} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <Link
                            href={`/orders/${r.orderId}`}
                            className="text-sm font-semibold text-gray-900 hover:text-blue-600"
                          >
                            {t("orders.returns.orderHash").replace(
                              "{id}",
                              r.orderId.slice(-8),
                            )}
                          </Link>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {t("orders.returns.createdAt").replace(
                              "{date}",
                              formatDateTime(
                                r.createdAt,
                                locale === "vi" ? "vi-VN" : "en-US",
                              ),
                            )}
                          </p>
                        </div>
                        <Badge variant={status.variant}>
                          {t(status.labelKey)}
                        </Badge>
                      </div>

                      <p className="mt-3 text-sm text-gray-700 whitespace-pre-line line-clamp-3">
                        {r.reason}
                      </p>

                      {r.evidenceUrl && (
                        <AppImage
                          src={r.evidenceUrl}
                          alt="Evidence"
                          className="mt-3 w-24 h-24 object-cover rounded-lg border border-gray-200"
                        />
                      )}

                      {r.refundAmount != null && r.currency && (
                        <p className="mt-3 text-sm">
                          <span className="text-gray-500">
                            {t("orders.returns.refundAmountLabel")}:{" "}
                          </span>
                          <span className="font-semibold text-green-600">
                            {formatCurrency(r.refundAmount, r.currency)}
                          </span>
                        </p>
                      )}

                      {r.status === "REJECTED" && r.rejectReason && (
                        <p className="mt-2 text-sm text-red-600">
                          {t("orders.returns.rejectReasonLabel")}:{" "}
                          {r.rejectReason}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MemberPageLayout>
  );
}

export default function ReturnsPage() {
  return (
    <AuthGuard>
      <Suspense
        fallback={
          <div className="min-h-[60vh] flex items-center justify-center">
            <Loader2 className="animate-spin text-blue-600" size={32} />
          </div>
        }
      >
        <ReturnsInner />
      </Suspense>
    </AuthGuard>
  );
}
