"use client";

import AuthGuard from "@/components/auth/AuthGuard";
import VoucherManagement from "@/components/promotion/VoucherManagement";
import { shopVoucherService } from "@/lib/services";
import { useTranslation } from "@/hooks";

export default function MerchantVouchersPage() {
  const { t } = useTranslation();
  return (
    <AuthGuard requiredRoles={["MERCHANT"]}>
      <VoucherManagement
        title={t("merchant.vouchers.title")}
        description={t("merchant.vouchers.description")}
        queryKey={["shop-vouchers", "mine"]}
        load={() => shopVoucherService.listMine(100)}
        issue={(input) => shopVoucherService.issue(input)}
      />
    </AuthGuard>
  );
}
