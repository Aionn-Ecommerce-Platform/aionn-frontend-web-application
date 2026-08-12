"use client";

import { AppImage } from "@/shared/ui";

import { useState } from "react";
import { Award, Plus, Edit2, Trash2, Loader2, Search } from "lucide-react";
import toast from "react-hot-toast";
import {
  Button,
  Modal,
  Input,
  ConfirmDialog,
  Badge,
  Textarea,
} from "@/shared/ui";
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
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {t("adminBrands.title")}
          </h1>
          {canManageBrandStructure && (
            <Button onClick={handleCreate}>
              <Plus size={16} className="mr-2" />
              {t("adminBrands.create")}
            </Button>
          )}
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder={t("adminBrands.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-md border border-gray-400 p-12 flex justify-center">
            <Loader2 className="animate-spin text-blue-600" size={28} />
          </div>
        ) : filteredBrands.length > 0 ? (
          <div className="bg-white rounded-md border border-gray-400 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-400">
                <tr>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                    {t("adminBrands.brand")}
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                    {t("common.description")}
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                    {t("common.status")}
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                    {t("common.createdAt")}
                  </th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                    {t("common.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredBrands.map((brand) => (
                  <tr key={brand.brandId} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {brand.logoUrl ? (
                          <AppImage
                            src={brand.logoUrl}
                            alt={brand.name}
                            className="w-10 h-10 rounded object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-blue-50 rounded flex items-center justify-center">
                            <Award size={20} className="text-blue-600" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {brand.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {brand.brandId.slice(0, 16)}...
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {brand.description || "—"}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={
                          brand.status === "ACTIVE" ? "success" : "default"
                        }
                      >
                        {brand.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600">
                        {formatDateTime(brand.createdAt, locale)}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(brand)}
                        >
                          <Edit2 size={14} />
                        </Button>
                        {canManageBrandStructure && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteId(brand.brandId)}
                          >
                            <Trash2 size={14} className="text-red-600" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {data && totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-400">
                <p className="text-sm text-gray-600">
                  {t("common.pageOf", { page: page + 1, total: totalPages })}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 0}
                  >
                    {t("common.previous")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page >= totalPages - 1}
                  >
                    {t("common.next")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-md border border-gray-400 p-12 text-center">
            <Award className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t("adminBrands.emptyTitle")}
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              {t("adminBrands.emptyDescription")}
            </p>
            {canManageBrandStructure && (
              <Button onClick={handleCreate}>{t("adminBrands.create")}</Button>
            )}
          </div>
        )}
      </div>

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
