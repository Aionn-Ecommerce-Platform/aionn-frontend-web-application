"use client";

import { AppImage } from "@/shared/ui";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Plus,
  Image as ImageIcon,
  Trash2,
  Edit2,
  Upload,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button, Badge, EmptyState, Modal, ConfirmDialog } from "@/shared/ui";
import AuthGuard from "@/components/auth/AuthGuard";
import {
  adminPromotionBannerService,
  uploadAssetToCloudinary,
} from "@/lib/services";
import type {
  PromotionBannerAdmin,
  CreateBannerInput,
} from "@/lib/services/promotion.service";
import { getErrorMessage } from "@/shared/lib/errors";
import { useTranslation } from "@/hooks";

interface BannerForm {
  title: string;
  imageUrl: string;
  imagePublicId: string;
  displayOrder: number;
  active: boolean;
}

const EMPTY_FORM: BannerForm = {
  title: "",
  imageUrl: "",
  imagePublicId: "",
  displayOrder: 0,
  active: true,
};

function AdminBannersInner() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PromotionBannerAdmin | null>(null);
  const [form, setForm] = useState<BannerForm>(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-banners"],
    queryFn: () => adminPromotionBannerService.listAll(),
  });
  const banners = data ?? [];

  function refresh() {
    qc.invalidateQueries({ queryKey: ["admin-banners"] });
  }

  const createMu = useMutation({
    mutationFn: (body: CreateBannerInput) =>
      adminPromotionBannerService.create(body),
    onSuccess: () => {
      toast.success(t("adminBanners.createSuccess"));
      closeModal();
      refresh();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const updateMu = useMutation({
    mutationFn: (vars: { bannerId: string; body: BannerForm }) =>
      adminPromotionBannerService.update(vars.bannerId, vars.body),
    onSuccess: () => {
      toast.success(t("adminBanners.updateSuccess"));
      closeModal();
      refresh();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const deleteMu = useMutation({
    mutationFn: (bannerId: string) =>
      adminPromotionBannerService.delete(bannerId),
    onSuccess: () => {
      toast.success(t("adminBanners.deleteSuccess"));
      setDeleteId(null);
      refresh();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  function openCreate() {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      displayOrder: banners.length + 1,
    });
    setModalOpen(true);
  }

  function openEdit(b: PromotionBannerAdmin) {
    setEditing(b);
    setForm({
      title: b.title,
      imageUrl: b.imageUrl,
      imagePublicId: b.imagePublicId,
      displayOrder: b.displayOrder,
      active: b.active,
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  }

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const sig = await adminPromotionBannerService.generateUploadSignature();
      const asset = await uploadAssetToCloudinary(file, sig);
      setForm((f) => ({
        ...f,
        imageUrl: asset.url,
        imagePublicId: asset.publicId,
      }));
      toast.success(t("adminBanners.uploadSuccess"));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  function submitForm() {
    if (!form.title.trim()) {
      toast.error(t("adminBanners.titleRequired"));
      return;
    }
    if (!form.imageUrl || !form.imagePublicId) {
      toast.error(t("adminBanners.imageRequired"));
      return;
    }
    if (editing) {
      updateMu.mutate({ bannerId: editing.bannerId, body: form });
    } else {
      createMu.mutate(form);
    }
  }

  const isMutating = createMu.isPending || updateMu.isPending;

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {t("adminBanners.title")}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {t("adminBanners.description")}
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus size={16} className="mr-2" /> {t("adminBanners.create")}
          </Button>
        </div>

        {isLoading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="animate-spin text-blue-600" size={28} />
          </div>
        ) : banners.length === 0 ? (
          <EmptyState
            icon={ImageIcon}
            title={t("adminBanners.emptyTitle")}
            description={t("adminBanners.emptyDescription")}
            action={
              <Button onClick={openCreate}>{t("adminBanners.create")}</Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {banners.map((b) => (
              <div
                key={b.bannerId}
                className="bg-white rounded-md border border-gray-400 overflow-hidden"
              >
                <div className="aspect-[16/6] bg-gray-100 relative overflow-hidden">
                  <AppImage
                    src={b.imageUrl}
                    alt={b.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 flex gap-1">
                    <Badge variant={b.active ? "success" : "default"}>
                      {b.active ? t("common.active") : t("common.disabled")}
                    </Badge>
                    <Badge variant="info">#{b.displayOrder}</Badge>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {b.title}
                  </h3>
                  <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-gray-400">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(b)}
                    >
                      <Edit2 size={14} className="mr-1" /> {t("common.edit")}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteId(b.bannerId)}
                    >
                      <Trash2 size={14} className="text-red-600" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={
          editing ? t("adminBanners.editTitle") : t("adminBanners.createTitle")
        }
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("adminBanners.fieldTitle")}
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("adminBanners.image")}
            </label>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-gray-300 p-3">
              <p className="text-xs text-gray-500">
                {t("adminBanners.imageHelp")}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleUpload(f);
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => fileInputRef.current?.click()}
                loading={uploading}
              >
                <Upload size={14} className="mr-1" /> {t("adminBanners.upload")}
              </Button>
            </div>
            {form.imageUrl && (
              <div className="mt-2 aspect-[16/6] bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                <AppImage
                  src={form.imageUrl}
                  alt="preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("adminBanners.displayOrder")}
              </label>
              <input
                type="number"
                value={form.displayOrder}
                onChange={(e) =>
                  setForm({ ...form, displayOrder: Number(e.target.value) })
                }
                min={0}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("common.status")}
              </label>
              <label className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) =>
                    setForm({ ...form, active: e.target.checked })
                  }
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">
                  {t("common.active")}
                </span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={closeModal}
              disabled={isMutating}
            >
              {t("common.cancel")}
            </Button>
            <Button onClick={submitForm} loading={isMutating}>
              {editing ? t("common.save") : t("adminBanners.create")}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMu.mutate(deleteId)}
        title={t("adminBanners.deleteTitle")}
        message={t("adminBanners.deleteMessage")}
        confirmLabel={t("common.delete")}
        loading={deleteMu.isPending}
      />
    </div>
  );
}

export default function AdminBannersPage() {
  return (
    <AuthGuard requiredRoles={["SYSTEM_ADMIN", "CS_ADMIN"]}>
      <AdminBannersInner />
    </AuthGuard>
  );
}
