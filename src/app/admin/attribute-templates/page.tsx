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
import { Button, Modal, Input, Badge, Switch as Toggle } from "@/shared/ui";
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
        className={`flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer ${
          isSelected ? "bg-blue-50 border border-blue-200" : ""
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
              <ChevronDown size={14} className="text-gray-600" />
            ) : (
              <ChevronRight size={14} className="text-gray-600" />
            )}
          </button>
        ) : (
          <div className="w-6" />
        )}
        <span
          className={`text-sm ${isSelected ? "font-medium text-blue-900" : "text-gray-700"}`}
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
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {t("adminAttributeTemplates.title")}
          </h1>
          <Button
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
          >
            <Plus size={16} className="mr-2" />
            {t("adminAttributeTemplates.create")}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-md border border-gray-400 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                {t("common.categories")}
              </h3>
              {loadingCategories ? (
                <div className="py-8 flex justify-center">
                  <Loader2 className="animate-spin text-blue-600" size={20} />
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
                <p className="text-sm text-gray-500">
                  {t("adminAttributeTemplates.noCategories")}
                </p>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            {!selectedCategory ? (
              <div className="bg-white rounded-md border border-gray-400 p-12 text-center">
                <Tags className="mx-auto text-gray-400 mb-4" size={48} />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t("adminAttributeTemplates.selectCategory")}
                </h3>
                <p className="text-sm text-gray-500">
                  {t("adminAttributeTemplates.selectCategoryHelp")}
                </p>
              </div>
            ) : loadingTemplate ? (
              <div className="bg-white rounded-md border border-gray-400 p-12 flex justify-center">
                <Loader2 className="animate-spin text-blue-600" size={28} />
              </div>
            ) : template ? (
              <div className="bg-white rounded-md border border-gray-400 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {t("adminAttributeTemplates.template")}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {template.templateId.slice(0, 24)}...
                    </p>
                  </div>
                  <Badge className="bg-green-100 text-green-700">
                    {t("common.active")}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                    <Settings size={16} className="text-blue-600" />
                    {t("adminAttributeTemplates.attributes")}
                  </h4>
                  {Object.entries(template.attributes).map(
                    ([key, filterable]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <code className="text-sm font-mono text-gray-900 bg-white px-2 py-1 rounded border border-gray-200">
                            {key}
                          </code>
                          {filterable && (
                            <Badge
                              variant="success"
                              className="text-xs flex items-center gap-1"
                            >
                              <Filter size={10} />
                              {t("adminAttributeTemplates.filterable")}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
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
              <div className="bg-white rounded-md border border-gray-400 p-12 text-center">
                <Tags className="mx-auto text-gray-400 mb-4" size={48} />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t("adminAttributeTemplates.emptyTitle")}
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  {t("adminAttributeTemplates.emptyDescription")}
                </p>
                <Button
                  onClick={() => {
                    setFormData({
                      categoryId: selectedCategory,
                      attributeKeys: [],
                    });
                    setCreateModalOpen(true);
                  }}
                >
                  {t("adminAttributeTemplates.create")}
                </Button>
              </div>
            )}
          </div>
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
