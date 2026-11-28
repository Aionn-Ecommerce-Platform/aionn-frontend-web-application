"use client";

import AuthGuard from "@/components/auth/AuthGuard";
import VoucherManagement from "@/components/promotion/VoucherManagement";
import { ConsolePanel } from "@/features/merchant";
import { shopVoucherService } from "@/lib/services";
import { useTranslation } from "@/hooks";

export default function MerchantVouchersPage() {
  const { t } = useTranslation();
  return (
    <AuthGuard requiredRoles={["MERCHANT"]}>
      <ConsolePanel>
        <VoucherManagement
          variant="console"
          title={t("merchant.vouchers.title")}
          queryKey={["shop-vouchers", "mine"]}
          load={(params) =>
            shopVoucherService.listMine({ limit: 100, ...params })
          }
          issue={(input) => shopVoucherService.issue(input)}
          setActive={(voucherCode, active) =>
            shopVoucherService.setActive(voucherCode, active)
          }
        />
      </ConsolePanel>
    </AuthGuard>
  );
}
