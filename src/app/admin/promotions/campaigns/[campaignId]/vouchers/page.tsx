"use client";

import { FormEvent, use, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Gift, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import AuthGuard from "@/components/auth/AuthGuard";
import VoucherManagement from "@/components/promotion/VoucherManagement";
import { Button } from "@/shared/ui";
import { campaignService, voucherService } from "@/lib/services";
import { getErrorMessage } from "@/shared/lib/errors";
import { useTranslation } from "@/hooks";

function GrantVoucherCard({ campaignId }: { campaignId: string }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [voucherCode, setVoucherCode] = useState("");
  const [reason, setReason] = useState("");

  const grant = useMutation({
    mutationFn: () =>
      voucherService.grant({
        userId: userId.trim(),
        voucherCode: voucherCode.trim().toUpperCase(),
        reason: reason.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success(t("adminCampaignVouchers.grantSuccess"));
      setUserId("");
      setVoucherCode("");
      setReason("");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["campaign-vouchers", campaignId] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    grant.mutate();
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm mb-6">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="w-full flex items-center justify-between px-5 py-4 text-left cursor-pointer"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-gray-900">
          <Gift size={16} className="text-brand" />
          {t("adminCampaignVouchers.grantTitle")}
        </span>
        <span className="text-xs font-semibold text-brand">
          {open
            ? t("adminCampaignVouchers.grantCollapse")
            : t("adminCampaignVouchers.grantExpand")}
        </span>
      </button>

      {open && (
        <form
          onSubmit={submit}
          className="px-5 pb-5 grid md:grid-cols-3 gap-4 border-t border-gray-100 pt-4"
        >
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              {t("adminCampaignVouchers.grantUser")}
            </label>
            <input
              required
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="USER_..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              {t("adminCampaignVouchers.grantCode")}
            </label>
            <input
              required
              value={voucherCode}
              onChange={(e) => setVoucherCode(e.target.value)}
              placeholder="SHOP50K"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm uppercase focus:border-brand focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              {t("adminCampaignVouchers.grantReason")}
            </label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("adminCampaignVouchers.grantReasonPlaceholder")}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </div>
          <div className="md:col-span-3 flex justify-end">
            <Button type="submit" disabled={grant.isPending}>
              {grant.isPending ? (
                <Loader2 size={14} className="mr-2 animate-spin" />
              ) : (
                <Gift size={14} className="mr-2" />
              )}
              {t("adminCampaignVouchers.grantSubmit")}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function AdminCampaignVouchersPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = use(params);
  const { t } = useTranslation();
  return (
    <AuthGuard requiredRoles={["SYSTEM_ADMIN"]}>
      <GrantVoucherCard campaignId={campaignId} />
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
