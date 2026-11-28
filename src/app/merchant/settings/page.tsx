"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Store,
  Save,
  XCircle,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Camera,
  Pencil,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { Avatar, Button, Input, Modal, FormField as Field } from "@/shared/ui";
import { DEFAULT_AVATAR_URL } from "@/shared/ui/Avatar";
import AuthGuard from "@/components/auth/AuthGuard";
import {
  merchantService,
  geographyService,
  mediaService,
  uploadToCloudinary,
} from "@/lib/services";
import { ConsolePanel, MerchantAutoReplySection } from "@/features/merchant";
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

const MAX_FILE_SIZE_MB = 1;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

const STATUS_PILL_CLASS: Record<MerchantStatus, string> = {
  ACTIVE: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  SUSPENDED: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  CLOSED: "border-rose-400/30 bg-rose-400/10 text-rose-300",
};

const statusLabelKey: Record<MerchantStatus, string> = {
  ACTIVE: "merchant.settings.statusActive",
  SUSPENDED: "merchant.settings.statusSuspended",
  CLOSED: "merchant.settings.statusClosed",
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

  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<MerchantSettingsForm> | null>(
    null,
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      let logoUrl = form.logoUrl.trim() || undefined;
      if (selectedFile) {
        const signature = await mediaService.generateAvatarSignature();
        logoUrl = await uploadToCloudinary(selectedFile, signature);
      }
      return merchantService.updateProfile(merchant!.merchantId, {
        name: form.name.trim(),
        logoUrl,
        description: form.description.trim() || undefined,
        provinceCode: form.provinceCode || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.merchantMe });
      toast.success(t("merchant.settings.toastSaved"));
      closeEdit(true);
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

  function openEdit() {
    if (!merchant) return;
    setDraft({
      name: merchant.name ?? "",
      logoUrl: merchant.logoUrl ?? "",
      description: merchant.description ?? "",
      provinceCode: merchant.provinceCode ?? "",
    });
    setSelectedFile(null);
    setPreviewUrl(null);
    setEditOpen(true);
  }

  function closeEdit(force = false) {
    if (saveMutation.isPending && !force) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSelectedFile(null);
    setDraft(null);
    setEditOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFileChange(file: File) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
      toast.error(t("account.fileTypeUnsupported"));
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error(t("account.fileSizeLimit", { max: MAX_FILE_SIZE_MB }));
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function handleResetImage() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  if (isLoading) {
    return (
      <ConsolePanel>
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-purple-400" size={32} />
        </div>
      </ConsolePanel>
    );
  }

  if (!merchant) {
    return (
      <ConsolePanel>
        <div className="flex min-h-[50vh] items-center justify-center px-4">
          <div className="max-w-md rounded-2xl border border-gray-600 bg-white/[0.04] p-8 text-center">
            <Store className="mx-auto mb-4 text-purple-300" size={40} />
            <h2 className="mb-1 text-base font-semibold text-white">
              {t("merchant.settings.noMerchantTitle")}
            </h2>
            <p className="mb-4 text-sm text-gray-500">
              {t("merchant.settings.noMerchantDesc")}
            </p>
            <Button
              onClick={() => (window.location.href = "/merchant/register")}
            >
              {t("merchant.settings.registerCta")}
            </Button>
          </div>
        </div>
      </ConsolePanel>
    );
  }

  const isClosed = merchant.status === "CLOSED";
  const dirty =
    form.name !== (merchant.name ?? "") ||
    form.logoUrl !== (merchant.logoUrl ?? "") ||
    form.description !== (merchant.description ?? "") ||
    form.provinceCode !== (merchant.provinceCode ?? "") ||
    Boolean(selectedFile);
  const provinceName =
    provinces.find((province) => province.code === merchant.provinceCode)
      ?.name ?? t("merchant.settings.provincePlaceholder");
  const currentLogo = merchant.logoUrl?.trim() || DEFAULT_AVATAR_URL;
  const displayLogo = previewUrl || form.logoUrl || currentLogo;

  return (
    <ConsolePanel>
      <div className="console-dark">
        <div>
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-purple-300">
              <Store size={22} className="text-purple-300" />
              {t("merchant.settings.title")}
            </h1>
            <span
              className={`inline-flex items-center whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_PILL_CLASS[merchant.status]}`}
            >
              {t(statusLabelKey[merchant.status])}
            </span>
          </div>

          {merchant.status === "SUSPENDED" && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-400/30 bg-amber-400/10 p-4">
              <AlertTriangle
                className="mt-0.5 flex-shrink-0 text-amber-400"
                size={18}
              />
              <div className="text-sm">
                <p className="font-medium text-amber-200">
                  {t("merchant.settings.suspendedTitle")}
                </p>
                <p className="mt-1 text-amber-200/70">
                  {t("merchant.settings.suspendedDesc")}
                </p>
              </div>
            </div>
          )}

          {isClosed && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-rose-400/30 bg-rose-400/10 p-4">
              <XCircle
                className="mt-0.5 flex-shrink-0 text-rose-400"
                size={18}
              />
              <div className="text-sm">
                <p className="font-medium text-rose-200">
                  {t("merchant.settings.closedTitle")}
                </p>
                <p className="mt-1 text-rose-200/70">
                  {t("merchant.settings.closedDesc")}
                </p>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-gray-600 bg-white/[0.04] p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <Avatar
                src={merchant.logoUrl}
                alt={merchant.name}
                size="3xl"
                className="shrink-0 ring-2 ring-purple-400/30"
              />
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold text-white">
                  {merchant.name}
                </h2>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-400">
                  {merchant.description ||
                    t("merchant.settings.descriptionEmpty")}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={openEdit}
                disabled={isClosed}
                className="shrink-0 self-start"
              >
                <Pencil size={14} className="mr-1.5" />
                {t("merchant.settings.editBtn")}
              </Button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 border-t border-gray-600 pt-5 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs text-gray-500">
                  {t("merchant.settings.provinceLabel")}
                </p>
                <p className="mt-1 font-medium text-slate-200">
                  {provinceName}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">
                  {t("merchant.settings.createdLabel")}
                </p>
                <p className="mt-1 font-medium text-slate-200">
                  {formatDateTime(merchant.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">
                  {t("merchant.settings.updatedLabel")}
                </p>
                <p className="mt-1 font-medium text-slate-200">
                  {formatDateTime(merchant.updatedAt)}
                </p>
              </div>
            </div>
          </div>

          <MerchantAutoReplySection />

          {!isClosed && (
            <div className="mt-8 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6">
              <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-rose-300">
                <AlertTriangle size={14} className="text-rose-400" />
                {t("merchant.settings.dangerZoneTitle")}
              </h2>
              <p className="mb-4 text-xs text-rose-200/70">
                {t("merchant.settings.dangerZoneDesc")}
              </p>
              <button
                type="button"
                onClick={() => setCloseOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/50 bg-rose-500/15 px-3 py-2 text-xs font-semibold text-rose-200 transition-colors hover:bg-rose-500/25 hover:text-rose-100"
              >
                <XCircle size={14} />
                {t("merchant.settings.closeBtn")}
              </button>
            </div>
          )}

          <Modal
            isOpen={editOpen}
            onClose={closeEdit}
            title={t("merchant.settings.editTitle")}
            size="md"
          >
            <div className="space-y-6">
              <div className="flex flex-col items-center justify-center">
                <div className="relative group">
                  <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-gray-400 bg-gray-50 shadow-md">
                    <Image
                      src={displayLogo}
                      alt={t("merchant.settings.logoPreviewAlt")}
                      fill
                      sizes="112px"
                      className="object-cover"
                      unoptimized={Boolean(previewUrl)}
                    />
                    {saveMutation.isPending && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <Loader2
                          size={28}
                          className="animate-spin text-white"
                        />
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={saveMutation.isPending}
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 cursor-pointer rounded-full bg-brand p-2 text-white shadow-md transition-transform hover:scale-105 hover:bg-brand-strong disabled:opacity-50"
                    title={t("account.changePhoto")}
                  >
                    <Camera size={16} />
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/jpg"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileChange(file);
                  }}
                />

                {selectedFile ? (
                  <div className="mt-2.5 flex items-center gap-2 rounded-full border border-gray-300 bg-gray-50 px-3 py-1 text-xs text-gray-600">
                    <span className="max-w-[180px] truncate">
                      {selectedFile.name}
                    </span>
                    <button
                      type="button"
                      onClick={handleResetImage}
                      className="cursor-pointer text-gray-400 hover:text-gray-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 cursor-pointer text-xs font-medium text-brand hover:text-brand-strong"
                  >
                    {t("account.changeProfilePhoto")}
                  </button>
                )}

                <div className="mt-2.5 space-y-0.5 text-center text-xs text-gray-400">
                  <p>{t("account.fileSizeLimit", { max: MAX_FILE_SIZE_MB })}</p>
                  <p>{t("account.fileFormatNote")}</p>
                </div>
              </div>

              <Field label={t("merchant.settings.nameLabel")} required>
                <Input
                  value={form.name}
                  onChange={(e) => updateForm({ name: e.target.value })}
                  maxLength={150}
                  placeholder={t("merchant.settings.nameLabel")}
                />
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
                  className="w-full rounded-lg border border-gray-400 px-3 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
                <p className="mt-1 text-xs text-gray-400">
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
                  className="w-full rounded-lg border border-gray-400 bg-white px-3 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                >
                  <option value="">
                    {t("merchant.settings.provincePlaceholder")}
                  </option>
                  {provinces.map((province) => (
                    <option key={province.code} value={province.code}>
                      {province.name}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="flex justify-end gap-3 border-t border-gray-300 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => closeEdit()}
                  disabled={saveMutation.isPending}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  type="button"
                  onClick={() => saveMutation.mutate()}
                  loading={saveMutation.isPending}
                  disabled={!form.name.trim() || !dirty}
                >
                  <Save size={14} className="mr-1.5" />
                  {t("merchant.settings.saveBtn")}
                </Button>
              </div>
            </div>
          </Modal>

          <Modal
            isOpen={closeOpen}
            onClose={() => {
              setCloseOpen(false);
              setCloseReason("");
            }}
            title={t("merchant.settings.closeModalTitle")}
          >
            <div className="space-y-4">
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs">
                <AlertTriangle
                  size={14}
                  className="mt-0.5 flex-shrink-0 text-red-600"
                />
                <p className="text-red-700">
                  {t("merchant.settings.closeModalWarning")}
                </p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  {t("merchant.settings.closeReasonLabel")}
                </label>
                <textarea
                  value={closeReason}
                  onChange={(e) => setCloseReason(e.target.value)}
                  rows={3}
                  placeholder={t("merchant.settings.closeReasonPlaceholder")}
                  className="w-full rounded-lg border border-gray-400 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
              </div>
              <div className="flex items-start gap-2 text-xs text-gray-600">
                <CheckCircle2
                  size={14}
                  className="mt-0.5 flex-shrink-0 text-gray-400"
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
    </ConsolePanel>
  );
}

export default function MerchantSettingsPage() {
  return (
    <AuthGuard requiredRoles={["MERCHANT"]}>
      <MerchantSettingsInner />
    </AuthGuard>
  );
}
