"use client";

import { use } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import VoucherManagement from "@/components/promotion/VoucherManagement";
import { campaignService } from "@/lib/services";
import { useTranslation } from "@/hooks";

export default function AdminCampaignVouchersPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = use(params);
  const { t } = useTranslation();
  return (
    <AuthGuard requiredRoles={["SYSTEM_ADMIN"]}>
      <VoucherManagement
        title={t("adminCampaignVouchers.title", { id: campaignId })}
        description={t("adminCampaignVouchers.description")}
        queryKey={["campaign-vouchers", campaignId]}
        load={() => campaignService.listVouchers(campaignId, 100)}
        issue={(input) => campaignService.issueVoucher(campaignId, input)}
      />
    </AuthGuard>
  );
}
