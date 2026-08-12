"use client";

import { AppImage } from "@/shared/ui";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Store,
  Save,
  XCircle,
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button, Badge, Modal, FormField as Field } from "@/shared/ui";
import AuthGuard from "@/components/auth/AuthGuard";
import { merchantService, geographyService } from "@/lib/services";
import { getErrorMessage } from "@/shared/lib/errors";
import { formatDateTime } from "@/shared/lib/utils";
import { useTranslation } from "@/hooks";
import { qk } from "@/lib/query-keys";
import type { MerchantStatus } from "@/types";

interface MerchantSettingsForm {
  name: string;
  logoUrl: string;
  description: string;
  provinceCode: string;
}

const statusConfig: Record<
  MerchantStatus,
  { labelKey: string; variant: "success" | "warning" | "danger" }
> = {
  ACTIVE: { labelKey: "merchant.settings.statusActive", variant: "success" },
  SUSPENDED: {
    labelKey: "merchant.settings.statusSuspended",
    variant: "warning",
  },
  CLOSED: { labelKey: "merchant.settings.statusClosed", variant: "danger" },
};

function MerchantSettingsInner() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const { data: merchant, isLoading } = useQuery({
    queryKey: qk.merchantMe,
    queryFn: () => merchantService.getMine(),
  });

  const { data: provinces = [] } = useQuery({
    queryKey: qk.provinces(),
    queryFn: () => geographyService.listProvinces(),
  });

  const [draft, setDraft] = useState<Partial<MerchantSettingsForm> | null>(
    null,
  );
  const form: MerchantSettingsForm = {
    name: draft?.name ?? merchant?.name ?? "",
    logoUrl: draft?.logoUrl ?? merchant?.logoUrl ?? "",
    description: draft?.description ?? merchant?.description ?? "",
    provinceCode: draft?.provinceCode ?? merchant?.provinceCode ?? "",
  };
  const updateForm = (patch: Partial<MerchantSettingsForm>) =>
    setDraft((current: Partial<MerchantSettingsForm> | null) => ({
      ...current,
      ...patch,
    }));

  const [closeOpen, setCloseOpen] = useState(false);
  const [closeReason, setCloseReason] = useState("");

  const saveMutation = useMutation({
    mutationFn: () =>
      merchantService.updateProfile(merchant!.merchantId, {
        name: form.name.trim(),
        logoUrl: form.logoUrl.trim() || undefined,
        description: form.description.trim() || undefined,
        provinceCode: form.provinceCode || undefined,
      }),
    onSuccess: () => {
      setDraft(null);
      qc.invalidateQueries({ queryKey: qk.merchantMe });
      toast.success(t("merchant.settings.toastSaved"));
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const closeMutation = useMutation({
    mutationFn: () =>
      merchantService.close(merchant!.merchantId, {
        reason: closeReason.trim(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.merchantMe });
      toast.success(t("merchant.settings.toastClosed"));
      setCloseOpen(false);
      setCloseReason("");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  if (isLoading) {
    return (
      <div className="bg-gray-50 min-h-screen flex justify-center pt-32">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="bg-gray-50 min-h-screen flex items-center justify-center px-4">
        <div className="bg-white rounded-md border border-gray-400 p-8 max-w-md text-center">
          <Store className="mx-auto text-gray-300 mb-4" size={40} />
          <h2 className="text-base font-semibold text-gray-900 mb-1">
            {t("merchant.settings.noMerchantTitle")}
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            {t("merchant.settings.noMerchantDesc")}
          </p>
          <Button onClick={() => (window.location.href = "/merchant/register")}>
            {t("merchant.settings.registerCta")}
          </Button>
        </div>
      </div>
    );
  }

  const cfg = statusConfig[merchant.status];
  const isClosed = merchant.status === "CLOSED";
  const dirty =
    form.name !== (merchant.name ?? "") ||
    form.logoUrl !== (merchant.logoUrl ?? "") ||
    form.description !== (merchant.description ?? "") ||
    form.provinceCode !== (merchant.provinceCode ?? "");

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              {t("merchant.settings.title")}
            </h1>
            <p className="text-gray-500 text-sm">
              {t("merchant.settings.idLabel")}:{" "}
              <span className="font-mono">{merchant.merchantId}</span>
            </p>
          </div>
          <Badge variant={cfg.variant}>{t(cfg.labelKey)}</Badge>
        </div>

        {merchant.status === "SUSPENDED" && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertTriangle
              className="text-amber-600 flex-shrink-0 mt-0.5"
              size={18}
            />
            <div className="text-sm">
              <p className="font-medium text-amber-900">
                {t("merchant.settings.suspendedTitle")}
              </p>
              <p className="text-amber-700 mt-1">
                {t("merchant.settings.suspendedDesc")}
              </p>
            </div>
          </div>
        )}

        {isClosed && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <XCircle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
            <div className="text-sm">
              <p className="font-medium text-red-900">
                {t("merchant.settings.closedTitle")}
              </p>
              <p className="text-red-700 mt-1">
                {t("merchant.settings.closedDesc")}
              </p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-md border border-gray-400 p-6 space-y-5">
          <Field label={t("merchant.settings.nameLabel")} required>
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateForm({ name: e.target.value })}
              maxLength={150}
              disabled={isClosed}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:outline-none disabled:bg-gray-50"
            />
          </Field>

          <Field
            label={t("merchant.settings.logoLabel")}
            hint={t("merchant.settings.logoHint")}
          >
            <input
              type="url"
              value={form.logoUrl}
              onChange={(e) => updateForm({ logoUrl: e.target.value })}
              placeholder="https://..."
              disabled={isClosed}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:outline-none disabled:bg-gray-50"
            />
            {form.logoUrl && (
              <div className="mt-2">
                <AppImage
                  src={form.logoUrl}
                  alt={t("merchant.settings.logoPreviewAlt")}
                  className="h-16 w-16 rounded-lg object-cover border border-gray-200"
                  onError={(e) =>
                    ((e.target as HTMLImageElement).style.display = "none")
                  }
                />
              </div>
            )}
          </Field>

          <Field
            label={t("merchant.settings.descriptionLabel")}
            hint={t("merchant.settings.descriptionHint")}
          >
            <textarea
              value={form.description}
              onChange={(e) => updateForm({ description: e.target.value })}
              rows={4}
              maxLength={1000}
              disabled={isClosed}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:outline-none disabled:bg-gray-50"
            />
            <p className="text-xs text-gray-400 mt-1">
              {form.description.length}/1000
            </p>
          </Field>

          <Field
            label={t("merchant.settings.provinceLabel")}
            hint={t("merchant.settings.provinceHint")}
          >
            <select
              value={form.provinceCode}
              onChange={(e) => updateForm({ provinceCode: e.target.value })}
              disabled={isClosed}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white disabled:bg-gray-50"
            >
              <option value="">
                {t("merchant.settings.provincePlaceholder")}
              </option>
              {provinces.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>

          <div className="pt-4 border-t border-gray-400 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              {t("merchant.settings.updatedAt", {
                time: formatDateTime(merchant.updatedAt),
              })}
            </p>
            <Button
              onClick={() => saveMutation.mutate()}
              loading={saveMutation.isPending}
              disabled={!dirty || isClosed || !form.name.trim()}
            >
              <Save size={14} className="mr-1.5" />
              {t("merchant.settings.saveBtn")}
            </Button>
          </div>
        </div>

        {!isClosed && (
          <div className="mt-8 bg-white rounded-md border border-red-200 p-6">
            <h2 className="text-sm font-semibold text-red-700 mb-1">
              {t("merchant.settings.dangerZoneTitle")}
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              {t("merchant.settings.dangerZoneDesc")}
            </p>
            <Button
              variant="outline"
              onClick={() => setCloseOpen(true)}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <XCircle size={14} className="mr-1.5" />
              {t("merchant.settings.closeBtn")}
            </Button>
          </div>
        )}

        <Modal
          isOpen={closeOpen}
          onClose={() => {
            setCloseOpen(false);
            setCloseReason("");
          }}
          title={t("merchant.settings.closeModalTitle")}
        >
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs flex items-start gap-2">
              <AlertTriangle
                size={14}
                className="text-red-600 flex-shrink-0 mt-0.5"
              />
              <p className="text-red-700">
                {t("merchant.settings.closeModalWarning")}
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {t("merchant.settings.closeReasonLabel")}
              </label>
              <textarea
                value={closeReason}
                onChange={(e) => setCloseReason(e.target.value)}
                rows={3}
                placeholder={t("merchant.settings.closeReasonPlaceholder")}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="flex items-start gap-2 text-xs text-gray-600">
              <CheckCircle2
                size={14}
                className="text-gray-400 flex-shrink-0 mt-0.5"
              />
              <p>{t("merchant.settings.closeOpenOrdersHint")}</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setCloseOpen(false);
                  setCloseReason("");
                }}
                disabled={closeMutation.isPending}
              >
                {t("merchant.settings.cancelBtn")}
              </Button>
              <Button
                onClick={() => closeMutation.mutate()}
                loading={closeMutation.isPending}
                disabled={!closeReason.trim()}
                className="bg-red-600 hover:bg-red-700"
              >
                {t("merchant.settings.confirmCloseBtn")}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}

export default function MerchantSettingsPage() {
  return (
    <AuthGuard requiredRoles={["MERCHANT"]}>
      <MerchantSettingsInner />
    </AuthGuard>
  );
}
