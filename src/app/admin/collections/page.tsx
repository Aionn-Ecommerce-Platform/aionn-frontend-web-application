"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Folder, Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import AuthGuard from "@/components/auth/AuthGuard";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  Input,
  Modal,
  Textarea,
  Badge,
} from "@/shared/ui";
import { collectionService, type Collection } from "@/lib/services";
import { getErrorMessage } from "@/shared/lib/errors";
import { useTranslation } from "@/hooks";

type FormState = {
  slug: string;
  name: string;
  description: string;
  imageUrl: string;
  active: boolean;
  displayOrder: string;
};

const emptyForm: FormState = {
  slug: "",
  name: "",
  description: "",
  imageUrl: "",
  active: true,
  displayOrder: "0",
};

function AdminCollectionsInner() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Collection | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Collection | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const { data: collections = [], isLoading } = useQuery({
    queryKey: ["admin-collections"],
    queryFn: () => collectionService.list(false),
  });

  const save = useMutation({
    mutationFn: () => {
      const body = {
        slug: form.slug.trim() || undefined,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        imageUrl: form.imageUrl.trim() || undefined,
        active: form.active,
        displayOrder: Number(form.displayOrder) || 0,
      };
      return editing
        ? collectionService.update(editing.collectionId, body)
        : collectionService.create(body);
    },
    onSuccess: () => {
      toast.success(
        editing
          ? t("adminCollections.updated")
          : t("adminCollections.created"),
      );
      setModalOpen(false);
      setEditing(null);
      setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ["admin-collections"] });
      qc.invalidateQueries({ queryKey: ["collections"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const remove = useMutation({
    mutationFn: (collectionId: string) =>
      collectionService.delete(collectionId),
    onSuccess: () => {
      toast.success(t("adminCollections.deleted"));
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ["admin-collections"] });
      qc.invalidateQueries({ queryKey: ["collections"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(collection: Collection) {
    setEditing(collection);
    setForm({
      slug: collection.slug,
      name: collection.name,
      description: collection.description ?? "",
      imageUrl: collection.imageUrl ?? "",
      active: collection.active,
      displayOrder: String(collection.displayOrder),
    });
    setModalOpen(true);
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {t("adminCollections.title")}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {t("adminCollections.subtitle")}
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus size={16} className="mr-1.5" />
            {t("adminCollections.create")}
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-brand" size={28} />
          </div>
        ) : collections.length === 0 ? (
          <EmptyState
            icon={Folder}
            title={t("adminCollections.empty")}
            description={t("adminCollections.emptyDescription")}
          />
        ) : (
          <div className="space-y-3">
            {collections.map((collection) => (
              <div
                key={collection.collectionId}
                className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-gray-900">
                      {collection.name}
                    </h3>
                    <Badge
                      variant={collection.active ? "success" : "warning"}
                      className="text-xs"
                    >
                      {collection.active
                        ? t("adminCollections.active")
                        : t("adminCollections.inactive")}
                    </Badge>
                    <span className="text-xs text-gray-400 font-mono">
                      {collection.slug}
                    </span>
                  </div>
                  {collection.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {collection.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(collection)}
                  >
                    <Pencil size={14} className="mr-1.5" />
                    {t("adminCollections.edit")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteTarget(collection)}
                  >
                    <Trash2 size={14} className="mr-1.5 text-red-600" />
                    <span className="text-red-600">
                      {t("adminCollections.delete")}
                    </span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          editing
            ? t("adminCollections.editTitle")
            : t("adminCollections.createTitle")
        }
        size="md"
      >
        <div className="space-y-4">
          <Input
            label={t("adminCollections.name")}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label={t("adminCollections.slug")}
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            placeholder="thoi-trang"
          />
          <Textarea
            label={t("adminCollections.description")}
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
            rows={3}
          />
          <Input
            label={t("adminCollections.imageUrl")}
            value={form.imageUrl}
            onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
            placeholder="https://..."
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t("adminCollections.displayOrder")}
              type="number"
              min={0}
              value={form.displayOrder}
              onChange={(e) =>
                setForm({ ...form, displayOrder: e.target.value })
              }
            />
            <label className="flex items-center gap-2 text-sm text-gray-700 mt-6">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) =>
                  setForm({ ...form, active: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
              />
              {t("adminCollections.active")}
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
              disabled={save.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => save.mutate()}
              loading={save.isPending}
              disabled={!form.name.trim()}
            >
              {t("common.save")}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() =>
          deleteTarget && remove.mutate(deleteTarget.collectionId)
        }
        title={t("adminCollections.deleteTitle")}
        message={t("adminCollections.deleteMessage")}
        confirmLabel={t("adminCollections.delete")}
        loading={remove.isPending}
      />
    </div>
  );
}

export default function AdminCollectionsPage() {
  return (
    <AuthGuard requiredRoles={["SYSTEM_ADMIN"]}>
      <AdminCollectionsInner />
    </AuthGuard>
  );
}
