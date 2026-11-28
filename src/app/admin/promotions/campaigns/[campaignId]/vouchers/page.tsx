"use client";

import { FormEvent, use, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Gift, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import AuthGuard from "@/components/auth/AuthGuard";
import VoucherManagement from "@/components/promotion/VoucherManagement";
import { adminPrimaryClass } from "@/features/admin";
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
    <div className="mb-6 overflow-hidden rounded-2xl border border-slate-600/60 bg-white/[0.04]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full cursor-pointer items-center justify-between px-5 py-4 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-white">
          <Gift size={16} className="text-purple-300" />
          {t("adminCampaignVouchers.grantTitle")}
        </span>
        <span className="text-xs font-semibold text-purple-300">
          {open
            ? t("adminCampaignVouchers.grantCollapse")
            : t("adminCampaignVouchers.grantExpand")}
        </span>
      </button>

      {open && (
        <form
          onSubmit={submit}
          className="grid gap-4 border-t border-slate-600/60 px-5 pb-5 pt-4 md:grid-cols-3"
        >
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-300">
              {t("adminCampaignVouchers.grantUser")}
            </label>
            <input
              required
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="USER_..."
              className="w-full rounded-xl border border-gray-500 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-300">
              {t("adminCampaignVouchers.grantCode")}
            </label>
            <input
              required
              value={voucherCode}
              onChange={(e) => setVoucherCode(e.target.value)}
              placeholder="SHOP50K"
              className="w-full rounded-xl border border-gray-500 bg-white/5 px-3 py-2 text-sm uppercase text-slate-100 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-300">
              {t("adminCampaignVouchers.grantReason")}
            </label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("adminCampaignVouchers.grantReasonPlaceholder")}
              className="w-full rounded-xl border border-gray-500 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <div className="flex justify-end md:col-span-3">
            <button
              type="submit"
              disabled={grant.isPending}
              className={adminPrimaryClass}
            >
              {grant.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Gift size={14} />
              )}
              {t("adminCampaignVouchers.grantSubmit")}
            </button>
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
