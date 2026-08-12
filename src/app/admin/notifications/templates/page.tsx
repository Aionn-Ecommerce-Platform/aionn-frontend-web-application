"use client";

import { useState } from "react";
import {
  Mail,
  Plus,
  Edit2,
  Eye,
  Search,
  Bell,
  MessageSquare,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button, Modal, Input, Badge, Select, Textarea } from "@/shared/ui";
import AuthGuard from "@/components/auth/AuthGuard";
import { getErrorMessage } from "@/shared/lib/errors";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/query-keys";
import { notificationTemplateService } from "@/lib/services/notification.service";
import type { TemplateResult } from "@/lib/services/notification.service";
import { useTranslation } from "@/hooks";

interface TemplateForm {
  eventType: string;
  channel: string;
  category: string;
  locale: string;
  subject: string;
  content: string;
}

const CHANNELS = [
  { value: "EMAIL", label: "Email", icon: Mail },
  { value: "PUSH", label: "Push", icon: Bell },
  { value: "SMS", label: "SMS", icon: MessageSquare },
];

const CATEGORIES = [
  { value: "ORDER", labelKey: "adminTemplates.categoryOrder" },
  { value: "PROMOTION", labelKey: "adminTemplates.categoryPromotion" },
  { value: "CHAT", labelKey: "adminTemplates.categoryChat" },
  { value: "SYSTEM", labelKey: "adminTemplates.categorySystem" },
  { value: "SECURITY", labelKey: "adminTemplates.categorySecurity" },
];

const LOCALES = [
  { value: "vi", labelKey: "settings.languageVi" },
  { value: "en", labelKey: "settings.languageEn" },
];

function AdminNotificationTemplatesInner() {
  const { t } = useTranslation();
  const categoryOptions = CATEGORIES.map(({ value, labelKey }) => ({
    value,
    label: t(labelKey),
  }));
  const localeOptions = LOCALES.map(({ value, labelKey }) => ({
    value,
    label: t(labelKey),
  }));
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewTemplate, setViewTemplate] = useState<TemplateResult | null>(null);
  const [formData, setFormData] = useState<TemplateForm>({
    eventType: "",
    channel: "EMAIL",
    category: "ORDER",
    locale: "vi",
    subject: "",
    content: "",
  });
  const [saving, setSaving] = useState(false);

  const qc = useQueryClient();
  const { data: list, isLoading: loading } = useQuery({
    queryKey: qk.notificationTemplates(200),
    queryFn: () => notificationTemplateService.list(200),
  });
  const refetch = () =>
    qc.invalidateQueries({ queryKey: qk.notificationTemplates(200) });

  const templates = (list ?? []).filter(
    (t) =>
      t.eventType.toLowerCase().includes(search.toLowerCase()) ||
      t.content.toLowerCase().includes(search.toLowerCase()),
  );

  function resetForm() {
    setFormData({
      eventType: "",
      channel: "EMAIL",
      category: "ORDER",
      locale: "vi",
      subject: "",
      content: "",
    });
    setEditingId(null);
  }

  function openCreate() {
    resetForm();
    setModalOpen(true);
  }

  function openEdit(template: TemplateResult) {
    setEditingId(template.templateId);
    setFormData({
      eventType: template.eventType,
      channel: template.channel,
      category: template.category,
      locale: template.locale,
      subject: template.subject ?? "",
      content: template.content,
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!formData.eventType || !formData.content) {
      toast.error(t("adminTemplates.required"));
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await notificationTemplateService.update(editingId, {
          subject: formData.subject,
          content: formData.content,
        });
        toast.success(t("adminTemplates.updateSuccess"));
      } else {
        await notificationTemplateService.create({
          eventType: formData.eventType,
          channel: formData.channel,
          category: formData.category,
          locale: formData.locale,
          subject: formData.subject,
          content: formData.content,
        });
        toast.success(t("adminTemplates.createSuccess"));
      }
      setModalOpen(false);
      resetForm();
      void refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {t("adminTemplates.title")}
          </h1>
          <Button onClick={openCreate}>
            <Plus size={16} className="mr-2" />
            {t("adminTemplates.create")}
          </Button>
        </div>

        <div className="mb-6">
          <div className="relative max-w-md">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder={t("adminTemplates.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-md border border-gray-200 p-12 flex justify-center">
            <Loader2 className="animate-spin text-blue-600" size={28} />
          </div>
        ) : templates.length > 0 ? (
          <div className="space-y-4">
            {templates.map((template) => {
              const ChannelIcon =
                CHANNELS.find((c) => c.value === template.channel)?.icon ??
                Mail;
              return (
                <div
                  key={template.templateId}
                  className="bg-white rounded-md border border-gray-200 p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <ChannelIcon size={20} className="text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {template.eventType}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className="bg-gray-100 text-gray-700 text-xs">
                            {template.channel}
                          </Badge>
                          <Badge className="bg-blue-100 text-blue-700 text-xs">
                            {template.category}
                          </Badge>
                          <Badge className="bg-green-100 text-green-700 text-xs">
                            {template.locale}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setViewTemplate(template)}
                      >
                        <Eye size={14} className="mr-1" />
                        {t("common.view")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(template)}
                      >
                        <Edit2 size={14} />
                      </Button>
                    </div>
                  </div>

                  {template.subject && (
                    <div className="mb-2">
                      <p className="text-sm font-medium text-gray-700">
                        {t("adminTemplates.subject")}:
                      </p>
                      <p className="text-sm text-gray-600">
                        {template.subject}
                      </p>
                    </div>
                  )}

                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      {t("adminTemplates.content")}:
                    </p>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {template.content}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-md border border-gray-200 p-12 text-center">
            <Mail className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t("adminTemplates.emptyTitle")}
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              {t("adminTemplates.emptyDescription")}
            </p>
            <Button onClick={openCreate}>{t("adminTemplates.create")}</Button>
          </div>
        )}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          resetForm();
        }}
        title={
          editingId
            ? t("adminTemplates.editTitle")
            : t("adminTemplates.createTitle")
        }
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Event Type *"
            value={formData.eventType}
            onChange={(e) =>
              setFormData({ ...formData, eventType: e.target.value })
            }
            placeholder="ORDER_PLACED, USER_REGISTERED..."
            disabled={!!editingId}
          />

          <div className="grid grid-cols-3 gap-4">
            <Select
              label="Channel"
              value={formData.channel}
              onChange={(val) => setFormData({ ...formData, channel: val })}
              options={CHANNELS}
              disabled={!!editingId}
            />
            <Select
              label="Category"
              value={formData.category}
              onChange={(val) => setFormData({ ...formData, category: val })}
              options={categoryOptions}
              disabled={!!editingId}
            />
            <Select
              label="Locale"
              value={formData.locale}
              onChange={(val) => setFormData({ ...formData, locale: val })}
              options={localeOptions}
              disabled={!!editingId}
            />
          </div>

          {formData.channel === "EMAIL" && (
            <Input
              label="Subject (Email only)"
              value={formData.subject}
              onChange={(e) =>
                setFormData({ ...formData, subject: e.target.value })
              }
              placeholder={t("adminTemplates.variablePlaceholder")}
            />
          )}

          <Textarea
            label="Content *"
            value={formData.content}
            onChange={(e) =>
              setFormData({ ...formData, content: e.target.value })
            }
            placeholder={t("adminTemplates.contentPlaceholder")}
            rows={6}
          />

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-900">
              {t("adminTemplates.placeholderHelp", {
                variables: "{customerName}, {orderId}, {amount}",
              })}
            </p>
          </div>

          <Button
            onClick={handleSave}
            className="w-full"
            loading={saving}
            disabled={!formData.eventType || !formData.content}
          >
            {editingId ? t("common.update") : t("adminTemplates.create")}
          </Button>
        </div>
      </Modal>

      {viewTemplate && (
        <Modal
          isOpen={true}
          onClose={() => setViewTemplate(null)}
          title={t("adminTemplates.detailTitle")}
          size="lg"
        >
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-900">Event Type</p>
              <p className="text-sm text-gray-600 mt-1">
                {viewTemplate.eventType}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-900">Channel</p>
                <p className="text-sm text-gray-600 mt-1">
                  {viewTemplate.channel}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Category</p>
                <p className="text-sm text-gray-600 mt-1">
                  {viewTemplate.category}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Locale</p>
                <p className="text-sm text-gray-600 mt-1">
                  {viewTemplate.locale}
                </p>
              </div>
            </div>
            {viewTemplate.subject && (
              <div>
                <p className="text-sm font-medium text-gray-900">Subject</p>
                <p className="text-sm text-gray-600 mt-1">
                  {viewTemplate.subject}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-gray-900">Content</p>
              <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {viewTemplate.content}
                </p>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function AdminNotificationTemplatesPage() {
  return (
    <AuthGuard requiredRoles={["SYSTEM_ADMIN"]}>
      <AdminNotificationTemplatesInner />
    </AuthGuard>
  );
}
