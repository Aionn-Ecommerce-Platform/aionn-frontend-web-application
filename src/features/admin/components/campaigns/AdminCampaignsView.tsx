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
import {
  Button,
  Modal,
  Input,
  Badge,
  ConfirmDialog,
  Select,
} from "@/shared/ui";
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
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {t("adminCampaigns.title")}
          </h1>
          <Button onClick={handleCreate}>
            <Plus size={16} className="mr-2" />
            {t("adminCampaigns.create")}
          </Button>
        </div>

        <div className="flex items-center gap-2 mb-6">
          {(["RUNNING", "SCHEDULED", "ENDED", "DRAFT"] as const).map((s) => (
            <Button
              key={s}
              variant={filter === s ? "primary" : "outline"}
              size="sm"
              onClick={() => setFilter(s)}
            >
              {t(STATUS_CONFIG[s].labelKey)}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="bg-white rounded-md border border-gray-400 p-12 flex justify-center">
            <Loader2 className="animate-spin text-blue-600" size={28} />
          </div>
        ) : campaigns.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {campaigns.map((campaign) => {
              const budgetUsed =
                ((campaign.budget - campaign.budgetRemaining) /
                  campaign.budget) *
                100;

              return (
                <div
                  key={campaign.campaignId}
                  className="bg-white rounded-md border border-gray-400 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-50 rounded-lg">
                        <Sparkles size={20} className="text-purple-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {campaign.name}
                        </h3>
                        <p className="text-xs text-gray-500">{campaign.type}</p>
                      </div>
                    </div>
                    <Badge className={STATUS_CONFIG[campaign.status].color}>
                      {t(STATUS_CONFIG[campaign.status].labelKey)}
                    </Badge>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign size={16} className="text-gray-400" />
                      <span className="text-gray-600">
                        {t("adminCampaigns.budget")}:
                      </span>
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(
                          campaign.budget,
                          campaign.currency,
                          locale,
                        )}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                        <span>{t("adminCampaigns.used")}</span>
                        <span>{budgetUsed.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${Math.min(budgetUsed, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {t("adminCampaigns.remaining")}:{" "}
                        {formatCurrency(
                          campaign.budgetRemaining,
                          campaign.currency,
                          locale,
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar size={16} className="text-gray-400" />
                      <span>
                        {formatDate(campaign.startDate, locale)} →{" "}
                        {formatDate(campaign.endDate, locale)}
                      </span>
                    </div>

                    {campaign.minOrderValue && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Tag size={16} className="text-gray-400" />
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

                  <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-gray-400">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 min-w-[120px]"
                      onClick={() =>
                        (window.location.href = `/admin/promotions/campaigns/${campaign.campaignId}/vouchers`)
                      }
                    >
                      <TrendingUp size={14} className="mr-1" />
                      Xem vouchers
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
                        <XCircle size={14} className="text-red-600 mr-1" />
                        <span className="text-red-600">
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
          <div className="bg-white rounded-md border border-gray-400 p-12 text-center">
            <Sparkles className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t("adminCampaigns.emptyTitle")}
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              {t("adminCampaigns.emptyDescription")}
            </p>
            <Button onClick={handleCreate}>{t("adminCampaigns.create")}</Button>
          </div>
        )}
      </div>

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
