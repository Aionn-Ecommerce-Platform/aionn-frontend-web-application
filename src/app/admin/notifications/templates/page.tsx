"use client";

import { useState } from "react";
import {
  Mail,
  Plus,
  Edit2,
  Eye,
  Bell,
  MessageSquare,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button, Modal, Input, Select, Textarea } from "@/shared/ui";
import {
  AdminEmpty,
  AdminHeader,
  AdminPill,
  AdminSearch,
  AdminTable,
  adminPrimaryClass,
  adminRow,
  adminTd,
  adminTh,
} from "@/features/admin";
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
    <div className="min-h-screen">
      <AdminHeader
        icon={Mail}
        title={t("adminTemplates.title")}
        actions={
          <button
            type="button"
            onClick={openCreate}
            className={adminPrimaryClass}
          >
            <Plus size={16} />
            {t("adminTemplates.create")}
          </button>
        }
      />

      <div className="mb-5">
        <AdminSearch
          value={search}
          onChange={setSearch}
          placeholder={t("adminTemplates.searchPlaceholder")}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-purple-300" size={28} />
        </div>
      ) : templates.length > 0 ? (
        <AdminTable>
          <thead>
            <tr className="border-b border-slate-600/60 bg-white/[0.03]">
              <th className={adminTh}>{t("common.name")}</th>
              <th className={adminTh}>{t("adminTemplates.content")}</th>
              <th className={`${adminTh} text-right`}>{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((template) => {
              const ChannelIcon =
                CHANNELS.find((c) => c.value === template.channel)?.icon ??
                Mail;
              return (
                <tr key={template.templateId} className={adminRow}>
                  <td className={adminTd}>
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-purple-500/10 p-2">
                        <ChannelIcon size={18} className="text-purple-300" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">
                          {template.eventType}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <AdminPill tone="neutral">
                            {template.channel}
                          </AdminPill>
                          <AdminPill tone="purple">
                            {template.category}
                          </AdminPill>
                          <AdminPill tone="success">
                            {template.locale}
                          </AdminPill>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className={adminTd}>
                    {template.subject && (
                      <p className="text-xs text-slate-400">
                        {t("adminTemplates.subject")}: {template.subject}
                      </p>
                    )}
                    <p className="mt-1 line-clamp-2 max-w-xl text-sm text-slate-300">
                      {template.content}
                    </p>
                  </td>
                  <td className={`${adminTd} text-right`}>
                    <div className="flex items-center justify-end gap-2">
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
                  </td>
                </tr>
              );
            })}
          </tbody>
        </AdminTable>
      ) : (
        <AdminEmpty
          icon={Mail}
          title={t("adminTemplates.emptyTitle")}
          description={t("adminTemplates.emptyDescription")}
          action={
            <button
              type="button"
              onClick={openCreate}
              className={adminPrimaryClass}
            >
              {t("adminTemplates.create")}
            </button>
          }
        />
      )}

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

          <div className="bg-purple-500/10 border border-purple-400/30 rounded-lg p-3">
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
                <p className="text-sm font-medium text-gray-900">
                  {t("adminTemplates.subject")}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {viewTemplate.subject}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-gray-900">
                {t("adminTemplates.content")}
              </p>
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
