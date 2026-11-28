"use client";

import { useState } from "react";
import {
  Sparkles,
  Plus,
  Loader2,
  Calendar,
  DollarSign,
  Tag,
  TrendingUp,
  Play,
  StopCircle,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button, Modal, Input, ConfirmDialog, Select } from "@/shared/ui";
import {
  AdminEmpty,
  AdminHeader,
  AdminPill,
  AdminTabs,
  adminPrimaryClass,
} from "../shared/AdminConsole";
import AuthGuard from "@/components/auth/AuthGuard";
import { formatCurrency, formatDate } from "@/shared/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/query-keys";
import { campaignService } from "@/lib/services";
import { getErrorMessage } from "@/shared/lib/errors";
import type { CampaignStatus, CampaignType } from "@/types";
import { useTranslation } from "@/hooks";
import {
  CAMPAIGN_TYPES,
  STATUS_CONFIG,
  createEmptyCampaignForm,
  type CampaignForm,
} from "./campaign-config";

const STATUS_TONE: Record<
  CampaignStatus,
  "neutral" | "info" | "success" | "danger"
> = {
  DRAFT: "neutral",
  SCHEDULED: "info",
  RUNNING: "success",
  ENDED: "neutral",
  CANCELLED: "danger",
};

function AdminCampaignsInner() {
  const { t, locale } = useTranslation();
  const campaignTypeOptions = CAMPAIGN_TYPES.map(({ value, labelKey }) => ({
    value,
    label: t(labelKey),
  }));
  const [filter, setFilter] = useState<CampaignStatus>("RUNNING");
  const qc = useQueryClient();
  const { data, isLoading: loading } = useQuery({
    queryKey: qk.campaigns(filter),
    queryFn: () => campaignService.listByStatus(filter, 100),
  });
  const refetch = () =>
    qc.invalidateQueries({ queryKey: ["promotions", "campaigns"] });
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState<CampaignForm>(
    createEmptyCampaignForm,
  );
  const [saving, setSaving] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    campaignId: string;
    action: "activate" | "end" | "cancel";
  } | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const campaigns = data || [];

  function handleCreate() {
    setFormData(createEmptyCampaignForm());
    setModalOpen(true);
  }

  async function handleSave() {
    if (!formData.name.trim()) {
      toast.error(t("adminCampaigns.nameRequired"));
      return;
    }
    setSaving(true);
    try {
      const formattedStartDate = new Date(formData.startDate).toISOString();
      const formattedEndDate = new Date(formData.endDate).toISOString();

      const campaign = await campaignService.create({
        name: formData.name,
        type: formData.type,
        budget: formData.budget,
        currency: formData.currency,
        startDate: formattedStartDate,
        endDate: formattedEndDate,
      });

      if (
        formData.minOrderValue !== null ||
        formData.maxClaimsPerUser !== null ||
        formData.maxUsesPerVoucher !== null
      ) {
        await campaignService.configureCondition(campaign.campaignId, {
          minOrderValue: formData.minOrderValue || undefined,
          maxClaimsPerUser: formData.maxClaimsPerUser || undefined,
          maxUsesPerVoucher: formData.maxUsesPerVoucher || undefined,
        });
      }

      toast.success(t("adminCampaigns.createSuccess"));
      setModalOpen(false);
      void refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleLifecycleAction() {
    if (!confirmAction) return;
    const { campaignId, action } = confirmAction;
    setSaving(true);
    try {
      if (action === "activate") {
        await campaignService.activate(campaignId);
        toast.success(t("adminCampaigns.activateSuccess"));
      } else if (action === "end") {
        await campaignService.end(campaignId);
        toast.success(t("adminCampaigns.endSuccess"));
      } else {
        const reason =
          cancelReason.trim() || t("adminCampaigns.defaultCancelReason");
        await campaignService.cancel(campaignId, { reason });
        toast.success(t("adminCampaigns.cancelSuccess"));
        setCancelReason("");
      }
      setConfirmAction(null);
      void refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen">
      <AdminHeader
        icon={Sparkles}
        title={t("adminCampaigns.title")}
        actions={
          <button
            type="button"
            onClick={handleCreate}
            className={adminPrimaryClass}
          >
            <Plus size={16} />
            {t("adminCampaigns.create")}
          </button>
        }
      />

      <AdminTabs
        value={filter}
        onChange={setFilter}
        tabs={(["RUNNING", "SCHEDULED", "ENDED", "DRAFT"] as const).map(
          (status) => ({
            value: status,
            label: t(STATUS_CONFIG[status].labelKey),
          }),
        )}
      />

      {loading ? (
        <div className="flex justify-center rounded-2xl border border-gray-600 bg-white/[0.03] p-12">
          <Loader2 className="animate-spin text-purple-300" size={28} />
        </div>
      ) : campaigns.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {campaigns.map((campaign) => {
            const budgetUsed =
              ((campaign.budget - campaign.budgetRemaining) / campaign.budget) *
              100;

            return (
              <div
                key={campaign.campaignId}
                className="rounded-2xl border border-slate-600/60 bg-white/[0.04] p-5 transition-colors hover:border-purple-400/30"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-purple-400/10 p-2">
                      <Sparkles size={20} className="text-purple-300" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {campaign.name}
                      </h3>
                      <p className="text-xs text-slate-400">{campaign.type}</p>
                    </div>
                  </div>
                  <AdminPill tone={STATUS_TONE[campaign.status]}>
                    {t(STATUS_CONFIG[campaign.status].labelKey)}
                  </AdminPill>
                </div>

                <div className="mb-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign size={16} className="text-slate-500" />
                    <span className="text-slate-400">
                      {t("adminCampaigns.budget")}:
                    </span>
                    <span className="font-semibold text-white">
                      {formatCurrency(
                        campaign.budget,
                        campaign.currency,
                        locale,
                      )}
                    </span>
                  </div>

                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
                      <span>{t("adminCampaigns.used")}</span>
                      <span>{budgetUsed.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-white/10">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500"
                        style={{ width: `${Math.min(budgetUsed, 100)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      {t("adminCampaigns.remaining")}:{" "}
                      {formatCurrency(
                        campaign.budgetRemaining,
                        campaign.currency,
                        locale,
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Calendar size={16} className="text-slate-500" />
                    <span>
                      {formatDate(campaign.startDate, locale)} →{" "}
                      {formatDate(campaign.endDate, locale)}
                    </span>
                  </div>

                  {campaign.minOrderValue && (
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Tag size={16} className="text-slate-500" />
                      <span>
                        {t("adminCampaigns.minimumOrder")}:{" "}
                        {formatCurrency(
                          campaign.minOrderValue,
                          campaign.currency,
                          locale,
                        )}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-slate-600/60 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-w-[120px] flex-1"
                    onClick={() =>
                      (window.location.href = `/admin/promotions/campaigns/${campaign.campaignId}/vouchers`)
                    }
                  >
                    <TrendingUp size={14} className="mr-1" />
                    {t("adminCampaigns.viewVouchers")}
                  </Button>
                  {(campaign.status === "DRAFT" ||
                    campaign.status === "SCHEDULED") && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() =>
                        setConfirmAction({
                          campaignId: campaign.campaignId,
                          action: "activate",
                        })
                      }
                    >
                      <Play size={14} className="mr-1" />
                      {t("adminCampaigns.activate")}
                    </Button>
                  )}
                  {campaign.status === "RUNNING" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setConfirmAction({
                          campaignId: campaign.campaignId,
                          action: "end",
                        })
                      }
                    >
                      <StopCircle size={14} className="mr-1" />
                      {t("adminCampaigns.end")}
                    </Button>
                  )}
                  {(campaign.status === "DRAFT" ||
                    campaign.status === "SCHEDULED" ||
                    campaign.status === "RUNNING") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setConfirmAction({
                          campaignId: campaign.campaignId,
                          action: "cancel",
                        })
                      }
                    >
                      <XCircle size={14} className="mr-1 text-rose-300" />
                      <span className="text-rose-300">
                        {t("common.cancel")}
                      </span>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <AdminEmpty
          icon={Sparkles}
          title={t("adminCampaigns.emptyTitle")}
          description={t("adminCampaigns.emptyDescription")}
          action={
            <button
              type="button"
              onClick={handleCreate}
              className={adminPrimaryClass}
            >
              {t("adminCampaigns.create")}
            </button>
          }
        />
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={t("adminCampaigns.createTitle")}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label={t("adminCampaigns.name")}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder={t("adminCampaigns.namePlaceholder")}
          />

          <Select
            label={t("adminCampaigns.type")}
            value={formData.type}
            onChange={(val) =>
              setFormData({ ...formData, type: val as CampaignType })
            }
            options={campaignTypeOptions}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              type="number"
              label={t("adminCampaigns.budgetRequired")}
              value={formData.budget}
              onChange={(e) =>
                setFormData({ ...formData, budget: parseFloat(e.target.value) })
              }
              min={0}
            />
            <Select
              label={t("adminCampaigns.currency")}
              value={formData.currency}
              onChange={(val) => setFormData({ ...formData, currency: val })}
              options={[
                { value: "VND", label: "VND" },
                { value: "USD", label: "USD" },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              type="datetime-local"
              label={t("adminCampaigns.startDate")}
              value={formData.startDate}
              onChange={(e) =>
                setFormData({ ...formData, startDate: e.target.value })
              }
            />
            <Input
              type="datetime-local"
              label={t("adminCampaigns.endDate")}
              value={formData.endDate}
              onChange={(e) =>
                setFormData({ ...formData, endDate: e.target.value })
              }
            />
          </div>

          <Input
            type="number"
            label={t("adminCampaigns.minimumOrderOptional")}
            value={formData.minOrderValue || ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                minOrderValue: e.target.value
                  ? parseFloat(e.target.value)
                  : null,
              })
            }
            min={0}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              type="number"
              label={t("adminCampaigns.maxClaims")}
              value={formData.maxClaimsPerUser || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  maxClaimsPerUser: e.target.value
                    ? parseInt(e.target.value)
                    : null,
                })
              }
              min={1}
            />
            <Input
              type="number"
              label={t("adminCampaigns.maxUses")}
              value={formData.maxUsesPerVoucher || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  maxUsesPerVoucher: e.target.value
                    ? parseInt(e.target.value)
                    : null,
                })
              }
              min={1}
            />
          </div>

          <Button
            onClick={handleSave}
            className="w-full"
            loading={saving}
            disabled={!formData.name || formData.budget <= 0}
          >
            {t("adminCampaigns.create")}
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirmAction !== null}
        onClose={() => {
          setConfirmAction(null);
          setCancelReason("");
        }}
        onConfirm={handleLifecycleAction}
        title={
          confirmAction?.action === "activate"
            ? t("adminCampaigns.activateTitle")
            : confirmAction?.action === "end"
              ? t("adminCampaigns.endTitle")
              : t("adminCampaigns.cancelTitle")
        }
        message={
          confirmAction?.action === "activate"
            ? t("adminCampaigns.activateMessage")
            : confirmAction?.action === "end"
              ? t("adminCampaigns.endMessage")
              : t("adminCampaigns.cancelMessage")
        }
        confirmLabel={
          confirmAction?.action === "activate"
            ? t("adminCampaigns.activate")
            : confirmAction?.action === "end"
              ? t("adminCampaigns.end")
              : t("adminCampaigns.cancel")
        }
        loading={saving}
      >
        {confirmAction?.action === "cancel" && (
          <Input
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder={t("adminCampaigns.cancelReasonPlaceholder")}
            className="mt-3"
          />
        )}
      </ConfirmDialog>
    </div>
  );
}

export default function AdminCampaignsPage() {
  return (
    <AuthGuard requiredRoles={["SYSTEM_ADMIN"]}>
      <AdminCampaignsInner />
    </AuthGuard>
  );
}
