"use client";

import { useQuery } from "@tanstack/react-query";
import { Ticket, Clock, Loader2 } from "lucide-react";
import { Badge, EmptyState } from "@/shared/ui";
import MemberPageLayout from "@/components/layout/MemberPageLayout";
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
    <MemberPageLayout>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {t("myVouchers.title")}
      </h1>

      <div className="bg-white rounded-sm border border-gray-100 p-6 shadow-xs">
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
          <div className="space-y-3.5">
            {vouchers.map((voucher) => {
              const status = getVoucherStatus(voucher.status);
              return (
                <div
                  key={voucher.userVoucherId}
                  className="bg-white rounded-sm border border-gray-200 overflow-hidden flex flex-col sm:flex-row items-stretch hover:shadow-sm hover:border-gray-300 transition-all group"
                >
                  {/* Left coupon ticket header */}
                  <div className="w-full sm:w-32 bg-gradient-to-br from-amber-500 to-orange-500 text-white flex flex-col items-center justify-center p-3.5 relative sm:border-r border-b sm:border-b-0 border-dashed border-white/40 shrink-0">
                    <Ticket size={22} className="mb-1 text-white/90" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-center text-amber-100">
                      Voucher
                    </span>
                  </div>

                  {/* Right coupon content */}
                  <div className="flex-1 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 min-w-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <code className="text-sm font-mono font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded-xs">
                          {voucher.voucherCode}
                        </code>
                        <Badge variant={status.variant}>
                          {t(status.labelKey)}
                        </Badge>
                      </div>

                      {voucher.appliedAmount && voucher.currency ? (
                        <p className="text-base text-red-600 font-bold mt-1.5">
                          {t("myVouchers.discountApplied", {
                            amount: formatCurrency(
                              voucher.appliedAmount,
                              voucher.currency,
                              locale,
                            ),
                          })}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-500 mt-1.5">
                          {t("myVouchers.claimedAt", {
                            date: formatDate(voucher.claimedAt, locale),
                          })}
                        </p>
                      )}
                    </div>

                    {voucher.reservedExpiresAt && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-50 px-2.5 py-1.5 rounded-xs border border-gray-100 shrink-0">
                        <Clock size={13} className="text-gray-400" />
                        <span>
                          {t("myVouchers.reservedUntil", {
                            date: formatDate(voucher.reservedExpiresAt, locale),
                          })}
                        </span>
                      </div>
                    )}
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

export default function MyVouchersPage() {
  return (
    <AuthGuard>
      <VouchersInner />
    </AuthGuard>
  );
}
