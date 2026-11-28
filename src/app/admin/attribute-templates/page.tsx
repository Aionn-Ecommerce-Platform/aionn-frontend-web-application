"use client";

import { useState } from "react";
import {
  Tags,
  Plus,
  Settings,
  Filter,
  Loader2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button, Modal, Input, Switch as Toggle } from "@/shared/ui";
import {
  AdminEmpty,
  AdminHeader,
  AdminPill,
  adminPrimaryClass,
} from "@/features/admin";
import AuthGuard from "@/components/auth/AuthGuard";
import { useQuery } from "@tanstack/react-query";
import { qk } from "@/lib/query-keys";
import { attributeTemplateService, categoryService } from "@/lib/services";
import { getErrorMessage } from "@/shared/lib/errors";
import type { AttributeTemplate, CategoryTreeNode } from "@/types";
import { useTranslation } from "@/hooks";

interface AttributeForm {
  categoryId: string;
  attributeKeys: string[];
}

function CategorySelectorNode({
  node,
  selected,
  onSelect,
  level,
}: {
  node: CategoryTreeNode;
  selected: string;
  onSelect: (id: string) => void;
  level: number;
}) {
  const [expanded, setExpanded] = useState(level < 1);
  const isSelected = node.category.categoryId === selected;
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div>
      <div
        className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2 transition-colors hover:bg-white/5 ${
          isSelected
            ? "border-purple-400/30 bg-purple-500/10"
            : "border-transparent"
        } ${level > 0 ? "ml-6" : ""}`}
        onClick={() => onSelect(node.category.categoryId)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect(node.category.categoryId);
          }
        }}
        role="button"
        tabIndex={0}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="p-1"
          >
            {expanded ? (
              <ChevronDown size={14} className="text-slate-400" />
            ) : (
              <ChevronRight size={14} className="text-slate-400" />
            )}
          </button>
        ) : (
          <div className="w-6" />
        )}
        <span
          className={`text-sm ${isSelected ? "font-medium text-purple-200" : "text-slate-300"}`}
        >
          {node.category.name}
        </span>
      </div>
      {expanded && hasChildren && (
        <CategorySelector
          tree={node.children}
          selected={selected}
          onSelect={onSelect}
          level={level + 1}
        />
      )}
    </div>
  );
}

function CategorySelector({
  tree,
  selected,
  onSelect,
  level = 0,
}: {
  tree: CategoryTreeNode[];
  selected: string;
  onSelect: (id: string) => void;
  level?: number;
}) {
  return (
    <div className="space-y-1">
      {tree.map((node) => (
        <CategorySelectorNode
          key={node.category.categoryId}
          node={node}
          selected={selected}
          onSelect={onSelect}
          level={level}
        />
      ))}
    </div>
  );
}

function AdminAttributeTemplatesInner() {
  const { t } = useTranslation();
  const { data: categoryTree, isLoading: loadingCategories } = useQuery({
    queryKey: qk.categoriesTree,
    queryFn: () => categoryService.tree(),
  });
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [template, setTemplate] = useState<AttributeTemplate | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState<AttributeForm>({
    categoryId: "",
    attributeKeys: [],
  });
  const [newKey, setNewKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);

  async function loadTemplate(categoryId: string) {
    setLoadingTemplate(true);
    try {
      const result = await attributeTemplateService.getByCategory(categoryId);
      setTemplate(result);
    } catch {
      setTemplate(null);
    } finally {
      setLoadingTemplate(false);
    }
  }

  async function handleCreate() {
    if (formData.attributeKeys.length === 0) {
      toast.error(t("adminAttributeTemplates.attributeRequired"));
      return;
    }
    setSaving(true);
    try {
      const result = await attributeTemplateService.create(formData);
      toast.success(t("adminAttributeTemplates.createSuccess"));
      setTemplate(result);
      setCreateModalOpen(false);
      setFormData({ categoryId: "", attributeKeys: [] });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleFilterable(key: string, filterable: boolean) {
    if (!template) return;
    setUpdatingKey(key);
    try {
      const updated = await attributeTemplateService.configureFilterable(
        template.templateId,
        { attributeKey: key, filterable },
      );
      setTemplate(updated);
      toast.success(t("adminAttributeTemplates.filterableSuccess"));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUpdatingKey(null);
    }
  }

  function addAttributeKey() {
    if (!newKey.trim()) return;
    if (formData.attributeKeys.includes(newKey.trim())) {
      toast.error(t("adminAttributeTemplates.attributeExists"));
      return;
    }
    setFormData({
      ...formData,
      attributeKeys: [...formData.attributeKeys, newKey.trim()],
    });
    setNewKey("");
  }

  function removeAttributeKey(key: string) {
    setFormData({
      ...formData,
      attributeKeys: formData.attributeKeys.filter((k) => k !== key),
    });
  }

  return (
    <div className="min-h-screen">
      <AdminHeader
        icon={Tags}
        title={t("adminAttributeTemplates.title")}
        description={t("adminAttributeTemplates.description")}
        actions={
          <button
            type="button"
            onClick={() => {
              if (!selectedCategory) {
                toast.error(t("adminAttributeTemplates.categoryRequired"));
                return;
              }
              setFormData({
                categoryId: selectedCategory,
                attributeKeys: [],
              });
              setCreateModalOpen(true);
            }}
            className={adminPrimaryClass}
          >
            <Plus size={16} />
            {t("adminAttributeTemplates.create")}
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-slate-600/60 bg-white/[0.04] p-4">
            <h3 className="mb-4 text-sm font-semibold text-white">
              {t("common.categories")}
            </h3>
            {loadingCategories ? (
              <div className="flex justify-center py-8">
                <Loader2 className="animate-spin text-purple-300" size={20} />
              </div>
            ) : categoryTree ? (
              <CategorySelector
                tree={categoryTree}
                selected={selectedCategory}
                onSelect={(id) => {
                  setSelectedCategory(id);
                  loadTemplate(id);
                }}
              />
            ) : (
              <p className="text-sm text-slate-400">
                {t("adminAttributeTemplates.noCategories")}
              </p>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          {!selectedCategory ? (
            <AdminEmpty
              icon={Tags}
              title={t("adminAttributeTemplates.selectCategory")}
              description={t("adminAttributeTemplates.selectCategoryHelp")}
            />
          ) : loadingTemplate ? (
            <div className="flex justify-center rounded-2xl border border-slate-600/60 bg-white/[0.04] p-12">
              <Loader2 className="animate-spin text-purple-300" size={28} />
            </div>
          ) : template ? (
            <div className="rounded-2xl border border-slate-600/60 bg-white/[0.04] p-5">
              <div className="mb-6 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {t("adminAttributeTemplates.template")}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {template.templateId.slice(0, 24)}...
                  </p>
                </div>
                <AdminPill tone="success">{t("common.active")}</AdminPill>
              </div>

              <div className="space-y-3">
                <h4 className="flex items-center gap-2 text-sm font-medium text-slate-200">
                  <Settings size={16} className="text-purple-300" />
                  {t("adminAttributeTemplates.attributes")}
                </h4>
                {Object.entries(template.attributes).map(
                  ([key, filterable]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-600/60 bg-white/[0.04] p-3"
                    >
                      <div className="flex items-center gap-3">
                        <code className="rounded border border-slate-600/60 bg-white/5 px-2 py-1 font-mono text-sm text-purple-200">
                          {key}
                        </code>
                        {filterable && (
                          <AdminPill
                            tone="info"
                            className="flex items-center gap-1"
                          >
                            <Filter size={10} />
                            {t("adminAttributeTemplates.filterable")}
                          </AdminPill>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">
                          {t("adminAttributeTemplates.filterable")}:
                        </span>
                        <Toggle
                          checked={filterable}
                          onChange={(v) => handleToggleFilterable(key, v)}
                          disabled={updatingKey === key}
                        />
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          ) : (
            <AdminEmpty
              icon={Tags}
              title={t("adminAttributeTemplates.emptyTitle")}
              description={t("adminAttributeTemplates.emptyDescription")}
              action={
                <button
                  type="button"
                  onClick={() => {
                    setFormData({
                      categoryId: selectedCategory,
                      attributeKeys: [],
                    });
                    setCreateModalOpen(true);
                  }}
                  className={adminPrimaryClass}
                >
                  {t("adminAttributeTemplates.create")}
                </button>
              }
            />
          )}
        </div>
      </div>

      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title={t("adminAttributeTemplates.createTitle")}
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {t("adminAttributeTemplates.description")}
          </p>

          <div>
            <label className="text-sm font-medium text-gray-900 block mb-2">
              {t("adminAttributeTemplates.addAttribute")}
            </label>
            <div className="flex gap-2">
              <Input
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder={t("adminAttributeTemplates.attributePlaceholder")}
                onKeyPress={(e) => e.key === "Enter" && addAttributeKey()}
              />
              <Button onClick={addAttributeKey} variant="outline">
                {t("common.add")}
              </Button>
            </div>
          </div>

          {formData.attributeKeys.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-900 block mb-2">
                {t("adminAttributeTemplates.attributeCount", {
                  count: formData.attributeKeys.length,
                })}
              </label>
              <div className="space-y-2">
                {formData.attributeKeys.map((key) => (
                  <div
                    key={key}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <code className="text-sm font-mono">{key}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAttributeKey(key)}
                    >
                      {t("common.delete")}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button
            onClick={handleCreate}
            className="w-full"
            loading={saving}
            disabled={formData.attributeKeys.length === 0}
          >
            {t("adminAttributeTemplates.create")}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default function AdminAttributeTemplatesPage() {
  return (
    <AuthGuard requiredRoles={["SYSTEM_ADMIN"]}>
      <AdminAttributeTemplatesInner />
    </AuthGuard>
  );
}
