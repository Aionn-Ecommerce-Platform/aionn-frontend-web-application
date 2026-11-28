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
import { Button, Modal, Input, ConfirmDialog } from "@/shared/ui";
import { AdminEmpty, AdminHeader, AdminPill } from "@/features/admin";
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
        className={`group flex items-center justify-between rounded-xl p-3 transition-colors hover:bg-white/[0.05] ${level > 0 ? "ml-6" : ""}`}
      >
        <div className="flex flex-1 items-center gap-2">
          {hasChildren ? (
            <button
              onClick={() => setExpanded(!expanded)}
              className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              {expanded ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
            </button>
          ) : (
            <div className="w-6" />
          )}
          <FolderTree size={16} className="text-purple-300" />
          <span className="text-sm font-medium text-white">
            {node.category.name}
          </span>
          <span className="text-xs text-slate-400">({node.category.slug})</span>
          {!node.category.active && (
            <AdminPill tone="warning" className="text-xs">
              {t("common.inactive")}
            </AdminPill>
          )}
        </div>
        <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(node.category)}
          >
            <Edit2 size={14} className="text-slate-300" />
          </Button>
          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onMove(node.category)}
            >
              <Move size={14} className="text-purple-300" />
            </Button>
          )}
          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(node.category.categoryId)}
            >
              <Trash2 size={14} className="text-rose-300" />
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
    <div className="min-h-screen">
      <AdminHeader
        icon={FolderTree}
        title={t("adminCategories.title")}
        actions={
          canManageCategoryStructure ? (
            <Button onClick={handleCreate}>
              <Plus size={16} className="mr-2" />
              {t("adminCategories.create")}
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <div className="flex justify-center rounded-2xl border border-slate-600/60 bg-white/[0.04] p-12">
          <Loader2 className="animate-spin text-purple-300" size={28} />
        </div>
      ) : tree && tree.length > 0 ? (
        <div className="rounded-2xl border border-slate-600/60 bg-white/[0.04] p-4">
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
        <AdminEmpty
          icon={FolderTree}
          title={t("adminCategories.emptyTitle")}
          description={t("adminCategories.emptyDescription")}
          action={
            canManageCategoryStructure ? (
              <Button onClick={handleCreate}>
                {t("adminCategories.create")}
              </Button>
            ) : undefined
          }
        />
      )}

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
            <div className="rounded-xl border border-slate-600/60 bg-white/[0.04] p-3 text-sm">
              <p className="text-xs text-slate-400">
                {t("adminCategories.moving")}
              </p>
              <p className="mt-1 font-semibold text-white">
                {moveTarget.name}{" "}
                <span className="font-mono text-xs text-slate-400">
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
          <p className="text-xs text-slate-400">
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
