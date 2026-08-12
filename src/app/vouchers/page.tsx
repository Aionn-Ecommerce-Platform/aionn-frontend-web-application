"use client";

import { useQuery } from "@tanstack/react-query";
import { Ticket, Clock, Loader2 } from "lucide-react";
import { Badge, EmptyState } from "@/shared/ui";
import Sidebar from "@/components/layout/Sidebar";
import AuthGuard from "@/components/auth/AuthGuard";
import { voucherService } from "@/lib/services";
import { qk } from "@/lib/query-keys";
import { getVoucherStatus } from "@/lib/domain/status/voucher";
import { formatCurrency, formatDate } from "@/shared/lib/utils";
import { useTranslation } from "@/hooks";

function VouchersInner() {
  const { t, locale } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: qk.myVouchers(),
    queryFn: () => voucherService.listMine(50),
  });
  const vouchers = data ?? [];

  return (
    <div className="member-page bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          <Sidebar />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">
              {t("myVouchers.title")}
            </h1>

            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
              {isLoading ? (
                <div className="py-20 flex justify-center">
                  <Loader2 className="animate-spin text-blue-600" size={28} />
                </div>
              ) : vouchers.length === 0 ? (
                <EmptyState
                  icon={Ticket}
                  title={t("myVouchers.emptyTitle")}
                  description={t("myVouchers.emptyDescription")}
                />
              ) : (
                <div className="space-y-3">
                  {vouchers.map((voucher) => {
                    const status = getVoucherStatus(voucher.status);
                    return (
                      <div
                        key={voucher.userVoucherId}
                        className="bg-white rounded-xl border border-gray-100 p-5 flex items-center justify-between hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                            <Ticket size={20} className="text-blue-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <code className="text-sm font-mono font-medium text-gray-900">
                                {voucher.voucherCode}
                              </code>
                              <Badge variant={status.variant}>
                                {t(status.labelKey)}
                              </Badge>
                            </div>
                            {voucher.appliedAmount && voucher.currency ? (
                              <p className="text-sm text-blue-600 font-bold mt-0.5">
                                {t("myVouchers.discountApplied", {
                                  amount: formatCurrency(
                                    voucher.appliedAmount,
                                    voucher.currency,
                                    locale,
                                  ),
                                })}
                              </p>
                            ) : (
                              <p className="text-xs text-gray-500 mt-0.5">
                                {t("myVouchers.claimedAt", {
                                  date: formatDate(voucher.claimedAt, locale),
                                })}
                              </p>
                            )}
                          </div>
                        </div>
                        {voucher.reservedExpiresAt && (
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Clock size={12} />
                            {t("myVouchers.reservedUntil", {
                              date: formatDate(
                                voucher.reservedExpiresAt,
                                locale,
                              ),
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MyVouchersPage() {
  return (
    <AuthGuard>
      <VouchersInner />
    </AuthGuard>
  );
}
