"use client";

import { useState } from "react";
import {
  FolderTree,
  Plus,
  Edit2,
  Trash2,
  ChevronRight,
  ChevronDown,
  Loader2,
  Move,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button, Modal, Input, ConfirmDialog, Badge } from "@/shared/ui";
import AuthGuard from "@/components/auth/AuthGuard";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/query-keys";
import { categoryService } from "@/lib/services";
import { getErrorMessage } from "@/shared/lib/errors";
import type { CategoryTreeNode } from "@/types";
import { useAuthStore } from "@/stores/auth.store";
import { useTranslation } from "@/hooks";
import { hasRole } from "@/shared/lib/role-utils";

interface CategoryFormData {
  name: string;
  slug: string;
  iconUrl: string;
  parentId: string | null;
}

function CategoryTreeItem({
  node,
  level = 0,
  onEdit,
  onDelete,
  onMove,
  canDelete,
}: {
  node: CategoryTreeNode;
  level?: number;
  onEdit: (cat: CategoryTreeNode["category"]) => void;
  onDelete: (id: string) => void;
  onMove: (cat: CategoryTreeNode["category"]) => void;
  canDelete: boolean;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(level < 2);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div>
      <div
        className={`flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg group ${level > 0 ? "ml-6" : ""}`}
      >
        <div className="flex items-center gap-2 flex-1">
          {hasChildren ? (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              {expanded ? (
                <ChevronDown size={16} className="text-gray-600" />
              ) : (
                <ChevronRight size={16} className="text-gray-600" />
              )}
            </button>
          ) : (
            <div className="w-6" />
          )}
          <FolderTree size={16} className="text-blue-600" />
          <span className="text-sm font-medium text-gray-900">
            {node.category.name}
          </span>
          <span className="text-xs text-gray-500">({node.category.slug})</span>
          {!node.category.active && (
            <Badge variant="warning" className="text-xs">
              {t("common.inactive")}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(node.category)}
          >
            <Edit2 size={14} />
          </Button>
          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onMove(node.category)}
            >
              <Move size={14} className="text-blue-600" />
            </Button>
          )}
          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(node.category.categoryId)}
            >
              <Trash2 size={14} className="text-red-600" />
            </Button>
          )}
        </div>
      </div>
      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <CategoryTreeItem
              key={child.category.categoryId}
              node={child}
              level={level + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onMove={onMove}
              canDelete={canDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AdminCategoriesInner() {
  const { t } = useTranslation();
  const userRoles = useAuthStore((s) => s.user?.roles ?? []);
  const canManageCategoryStructure = hasRole(userRoles, "SYSTEM_ADMIN");
  const qc = useQueryClient();
  const { data: tree, isLoading: loading } = useQuery({
    queryKey: qk.categoriesTree,
    queryFn: () => categoryService.tree(),
  });
  const refetch = () => qc.invalidateQueries({ queryKey: qk.categoriesTree });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: "",
    slug: "",
    iconUrl: "",
    parentId: null,
  });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [moveTarget, setMoveTarget] = useState<
    CategoryTreeNode["category"] | null
  >(null);
  const [newParentId, setNewParentId] = useState("");

  async function handleMove() {
    if (!moveTarget) return;
    setSaving(true);
    try {
      await categoryService.move(moveTarget.categoryId, {
        newParentId: newParentId.trim(),
      });
      toast.success(t("adminCategories.moveSuccess"));
      setMoveTarget(null);
      setNewParentId("");
      void refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function handleCreate() {
    setEditing(null);
    setFormData({ name: "", slug: "", iconUrl: "", parentId: null });
    setModalOpen(true);
  }

  function handleEdit(cat: CategoryTreeNode["category"]) {
    setEditing(cat.categoryId);
    setFormData({
      name: cat.name,
      slug: cat.slug,
      iconUrl: cat.iconUrl || "",
      parentId: cat.parentId,
    });
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (editing) {
        await categoryService.update(editing, {
          name: formData.name,
          iconUrl: formData.iconUrl || undefined,
          active: true,
        });
        toast.success(t("adminCategories.updateSuccess"));
      } else {
        await categoryService.create({
          name: formData.name,
          slug: formData.slug,
          parentId: formData.parentId || undefined,
        });
        toast.success(t("adminCategories.createSuccess"));
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
      await categoryService.delete(id);
      toast.success(t("adminCategories.deleteSuccess"));
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
            {t("adminCategories.title")}
          </h1>
          {canManageCategoryStructure && (
            <Button onClick={handleCreate}>
              <Plus size={16} className="mr-2" />
              {t("adminCategories.create")}
            </Button>
          )}
        </div>

        {loading ? (
          <div className="bg-white rounded-md border border-gray-400 p-12 flex justify-center">
            <Loader2 className="animate-spin text-blue-600" size={28} />
          </div>
        ) : tree && tree.length > 0 ? (
          <div className="bg-white rounded-md border border-gray-400 p-4">
            {tree.map((node) => (
              <CategoryTreeItem
                key={node.category.categoryId}
                node={node}
                onEdit={handleEdit}
                onDelete={setDeleteId}
                onMove={setMoveTarget}
                canDelete={canManageCategoryStructure}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-md border border-gray-400 p-12 text-center">
            <FolderTree className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t("adminCategories.emptyTitle")}
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              {t("adminCategories.emptyDescription")}
            </p>
            {canManageCategoryStructure && (
              <Button onClick={handleCreate}>
                {t("adminCategories.create")}
              </Button>
            )}
          </div>
        )}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          editing ? t("adminCategories.editTitle") : t("adminCategories.create")
        }
        size="md"
      >
        <div className="space-y-4">
          <Input
            label={t("adminCategories.name")}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder={t("adminCategories.namePlaceholder")}
          />
          <Input
            label="Slug (URL)"
            value={formData.slug}
            onChange={(e) =>
              setFormData({
                ...formData,
                slug: e.target.value.toLowerCase().replace(/\s+/g, "-"),
              })
            }
            placeholder="vi-du-dien-thoai"
          />
          <Input
            label="Icon URL"
            value={formData.iconUrl}
            onChange={(e) =>
              setFormData({ ...formData, iconUrl: e.target.value })
            }
            placeholder="https://..."
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
        title={t("adminCategories.deleteTitle")}
        message={t("adminCategories.deleteMessage")}
        confirmLabel={t("common.delete")}
        loading={saving}
      />

      <Modal
        isOpen={moveTarget !== null}
        onClose={() => {
          setMoveTarget(null);
          setNewParentId("");
        }}
        title={t("adminCategories.moveTitle")}
        size="md"
      >
        <div className="space-y-4">
          {moveTarget && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <p className="text-gray-500 text-xs">
                {t("adminCategories.moving")}
              </p>
              <p className="font-semibold text-gray-900 mt-1">
                {moveTarget.name}{" "}
                <span className="text-xs text-gray-500 font-mono">
                  ({moveTarget.categoryId})
                </span>
              </p>
            </div>
          )}
          <Input
            label={t("adminCategories.newParentId")}
            value={newParentId}
            onChange={(e) => setNewParentId(e.target.value)}
            placeholder={t("adminCategories.parentPlaceholder")}
          />
          <p className="text-xs text-gray-500">
            {t("adminCategories.parentHelp")}
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setMoveTarget(null);
                setNewParentId("");
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button onClick={handleMove} loading={saving}>
              {t("adminCategories.move")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function AdminCategoriesPage() {
  return (
    <AuthGuard requiredRoles={["SYSTEM_ADMIN", "CS_ADMIN"]}>
      <AdminCategoriesInner />
    </AuthGuard>
  );
}
