"use client";

import { AppImage } from "@/shared/ui";

import { useState } from "react";
import { Award, Plus, Edit2, Trash2, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button, Modal, Input, ConfirmDialog, Textarea } from "@/shared/ui";
import {
  AdminEmpty,
  AdminHeader,
  AdminPill,
  AdminSearch,
  AdminTable,
  adminRow,
  adminTd,
  adminTh,
} from "@/features/admin";
import AuthGuard from "@/components/auth/AuthGuard";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/query-keys";
import { brandService } from "@/lib/services";
import { getErrorMessage } from "@/shared/lib/errors";
import type { Brand } from "@/types";
import { formatDateTime } from "@/shared/lib/utils";
import { useAuthStore } from "@/stores/auth.store";
import { useTranslation } from "@/hooks";
import { hasRole } from "@/shared/lib/role-utils";

interface BrandFormData {
  name: string;
  logoUrl: string;
  description: string;
}

function AdminBrandsInner() {
  const { t, locale } = useTranslation();
  const userRoles = useAuthStore((s) => s.user?.roles ?? []);
  const canManageBrandStructure = hasRole(userRoles, "SYSTEM_ADMIN");
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const qc = useQueryClient();
  const { data, isLoading: loading } = useQuery({
    queryKey: qk.brands({ page, size: 20 }),
    queryFn: () => brandService.list(page, 20),
  });
  const refetch = () => qc.invalidateQueries({ queryKey: ["brands"] });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState<BrandFormData>({
    name: "",
    logoUrl: "",
    description: "",
  });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const brands = data?.content || [];
  const filteredBrands = brands.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase()),
  );
  const totalPages = data?.totalElements
    ? Math.ceil(data.totalElements / data.size)
    : 1;

  function handleCreate() {
    setEditing(null);
    setFormData({ name: "", logoUrl: "", description: "" });
    setModalOpen(true);
  }

  function handleEdit(brand: Brand) {
    setEditing(brand.brandId);
    setFormData({
      name: brand.name,
      logoUrl: brand.logoUrl || "",
      description: brand.description || "",
    });
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (editing) {
        await brandService.update(editing, formData);
        toast.success(t("adminBrands.updateSuccess"));
      } else {
        await brandService.create(formData);
        toast.success(t("adminBrands.createSuccess"));
      }
      setModalOpen(false);
      void refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setSaving(true);
    try {
      await brandService.delete(id, { reason: "Admin delete" });
      toast.success(t("adminBrands.deleteSuccess"));
      void refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
      setDeleteId(null);
    }
  }

  return (
    <div className="min-h-screen">
      <AdminHeader
        icon={Award}
        title={t("adminBrands.title")}
        actions={
          canManageBrandStructure ? (
            <Button onClick={handleCreate}>
              <Plus size={16} className="mr-2" />
              {t("adminBrands.create")}
            </Button>
          ) : undefined
        }
      />

      <div className="mb-5">
        <AdminSearch
          value={search}
          onChange={setSearch}
          placeholder={t("adminBrands.searchPlaceholder")}
        />
      </div>

      {loading ? (
        <div className="flex justify-center rounded-2xl border border-slate-600/60 bg-white/[0.04] p-12">
          <Loader2 className="animate-spin text-purple-300" size={28} />
        </div>
      ) : filteredBrands.length > 0 ? (
        <>
          <AdminTable>
            <thead>
              <tr className="border-b border-slate-600/60 bg-white/[0.03]">
                <th className={adminTh}>{t("adminBrands.brand")}</th>
                <th className={adminTh}>{t("common.description")}</th>
                <th className={adminTh}>{t("common.status")}</th>
                <th className={adminTh}>{t("common.createdAt")}</th>
                <th className={`${adminTh} text-right`}>
                  {t("common.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredBrands.map((brand) => (
                <tr key={brand.brandId} className={adminRow}>
                  <td className={adminTd}>
                    <div className="flex items-center gap-3">
                      {brand.logoUrl ? (
                        <AppImage
                          src={brand.logoUrl}
                          alt={brand.name}
                          className="h-10 w-10 rounded object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded bg-purple-500/10">
                          <Award size={20} className="text-purple-300" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {brand.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {brand.brandId.slice(0, 16)}...
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className={adminTd}>
                    <p className="line-clamp-2 text-sm text-slate-300">
                      {brand.description || "—"}
                    </p>
                  </td>
                  <td className={adminTd}>
                    <AdminPill
                      tone={brand.status === "ACTIVE" ? "success" : "neutral"}
                    >
                      {t(`statuses.brand.${brand.status}`)}
                    </AdminPill>
                  </td>
                  <td className={adminTd}>
                    <p className="text-sm text-slate-300">
                      {formatDateTime(brand.createdAt, locale)}
                    </p>
                  </td>
                  <td className={`${adminTd} text-right`}>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(brand)}
                      >
                        <Edit2 size={14} className="text-slate-300" />
                      </Button>
                      {canManageBrandStructure && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(brand.brandId)}
                        >
                          <Trash2 size={14} className="text-rose-300" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </AdminTable>

          {data && totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between rounded-2xl border border-slate-600/60 bg-white/[0.04] px-6 py-4">
              <p className="text-sm text-slate-400">
                {t("common.pageOf", { page: page + 1, total: totalPages })}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => page > 0 && setPage(page - 1)}
                >
                  {t("common.previous")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => page < totalPages - 1 && setPage(page + 1)}
                >
                  {t("common.next")}
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <AdminEmpty
          icon={Award}
          title={t("adminBrands.emptyTitle")}
          description={t("adminBrands.emptyDescription")}
          action={
            canManageBrandStructure ? (
              <Button onClick={handleCreate}>{t("adminBrands.create")}</Button>
            ) : undefined
          }
        />
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? t("adminBrands.editTitle") : t("adminBrands.create")}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label={t("adminBrands.name")}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder={t("adminBrands.namePlaceholder")}
          />
          <Input
            label="Logo URL"
            value={formData.logoUrl}
            onChange={(e) =>
              setFormData({ ...formData, logoUrl: e.target.value })
            }
            placeholder="https://..."
          />
          <Textarea
            label={t("common.description")}
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder={t("adminBrands.descriptionPlaceholder")}
            rows={3}
          />
          <Button onClick={handleSave} className="w-full" loading={saving}>
            {editing ? t("common.update") : t("common.create")}
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        title={t("adminBrands.deleteTitle")}
        message={t("adminBrands.deleteMessage")}
        confirmLabel={t("common.delete")}
        loading={saving}
      />
    </div>
  );
}

export default function AdminBrandsPage() {
  return (
    <AuthGuard requiredRoles={["SYSTEM_ADMIN", "CS_ADMIN"]}>
      <AdminBrandsInner />
    </AuthGuard>
  );
}
