"use client";

import { useState } from "react";
import Link from "next/link";
import { Globe, Loader2, Sparkles, Bot, Bell, ArrowRight, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import MemberPageLayout from "@/components/layout/MemberPageLayout";
import AuthGuard from "@/components/auth/AuthGuard";
import SocialAccountsPanel from "@/components/settings/SocialAccountsPanel";
import { preferenceService } from "@/lib/services";
import { useTranslation } from "@/hooks";
import { qk } from "@/lib/query-keys";
import { getErrorMessage } from "@/shared/lib/errors";
import { Button, Switch } from "@/shared/ui";
import type { NotificationSettings, UserPreference } from "@/types";

function SettingsInner() {
  const { t, locale, setLocale } = useTranslation();
  const qc = useQueryClient();
  const { data, isLoading: loading } = useQuery({
    queryKey: qk.preferences,
    queryFn: () => preferenceService.get(),
  });
  const [savingLanguage, setSavingLanguage] = useState(false);
  const [savingAiPrivacy, setSavingAiPrivacy] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);

  function writePreferences(next: UserPreference) {
    qc.setQueryData(qk.preferences, next);
  }

  async function handleLanguageChange(value: "vi" | "en") {
    if (!data) return;
    setSavingLanguage(true);
    const previous = data;
    const previousLocale = locale;
    setLocale(value);
    writePreferences({ ...data, language: value } as UserPreference);
    try {
      const updated = await preferenceService.updateGeneral({
        language: value,
        currency: data.currency ?? "VND",
        timezone: data.timezone ?? "Asia/Ho_Chi_Minh",
        theme: data.theme ?? "light",
      });
      writePreferences(updated);
      qc.invalidateQueries();
      toast.success(t("settings.updateSuccess"));
    } catch (err) {
      setLocale(previousLocale);
      writePreferences(previous);
      toast.error(getErrorMessage(err));
    } finally {
      setSavingLanguage(false);
    }
  }

  async function handleAiPrivacyToggle(val: boolean) {
    if (!data) return;
    setSavingAiPrivacy(true);
    const previous = data;
    writePreferences({
      ...data,
      aiPrivacy: { ...data.aiPrivacy, personalizedRecommendation: val },
    } as UserPreference);
    try {
      const updated = await preferenceService.updateAiPrivacy(
        data.aiPrivacy ?? { personalizedRecommendation: true },
        { personalizedRecommendation: val },
      );
      writePreferences(updated);
      qc.invalidateQueries({ queryKey: qk.preferences });
      toast.success(t("settings.updateSuccess"));
    } catch (err) {
      writePreferences(previous);
      toast.error(getErrorMessage(err));
    } finally {
      setSavingAiPrivacy(false);
    }
  }

  async function handleNotificationToggle(
    key: keyof NotificationSettings,
    val: boolean,
  ) {
    if (!data) return;
    setSavingNotifications(true);
    const previous = data;
    const currentNotifs = data.notifications ?? {
      order: true,
      promotion: true,
      chat: true,
      system: true,
    };
    const nextNotifs = { ...currentNotifs, [key]: val };
    writePreferences({
      ...data,
      notifications: nextNotifs,
    } as UserPreference);
    try {
      const updated = await preferenceService.updateNotifications(
        currentNotifs,
        { [key]: val },
      );
      writePreferences(updated);
      qc.invalidateQueries({ queryKey: qk.preferences });
      toast.success(t("settings.updateSuccess"));
    } catch (err) {
      writePreferences(previous);
      toast.error(getErrorMessage(err));
    } finally {
      setSavingNotifications(false);
    }
  }

  return (
    <MemberPageLayout>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight">
          {t("settings.title")}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {locale === "en"
            ? "Manage language, AI personalization options, notifications, and connected accounts."
            : "Quản lý ngôn ngữ, tùy chọn cá nhân hóa AI, thông báo và tài khoản liên kết."}
        </p>
      </div>

      {loading || !data ? (
        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-16 flex justify-center">
          <Loader2 className="animate-spin text-brand" size={32} />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Card: AI Agent Hub & API Keys */}
          <div className="bg-white rounded-2xl border border-gray-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-6 sm:p-7 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
                  <Bot size={22} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-950 flex items-center gap-2">
                    {t("settings.aiAgentCardTitle")}
                    <span className="px-2 py-0.5 text-2xs font-bold uppercase rounded-md bg-brand/10 text-brand">
                      API / UCP
                    </span>
                  </h3>
                  <p className="text-sm text-gray-500 mt-0.5 max-w-xl">
                    {t("settings.aiAgentCardDesc")}
                  </p>
                </div>
              </div>
              <Link href="/account/agent-identities">
                <Button className="bg-brand hover:bg-brand-strong text-white font-semibold rounded-xl shrink-0 shadow-xs inline-flex items-center gap-2">
                  <span>{t("settings.manageAiAgents")}</span>
                  <ArrowRight size={15} />
                </Button>
              </Link>
            </div>
          </div>

          {/* Card: AI & Personalization */}
          <div className="bg-white rounded-2xl border border-gray-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-6 sm:p-7">
            <h3 className="flex items-center gap-2.5 font-bold text-gray-950 text-base mb-5 border-b border-gray-100 pb-3.5">
              <div className="w-8 h-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center shrink-0">
                <Sparkles size={16} />
              </div>
              {t("settings.aiPrivacyTitle")}
            </h3>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {t("settings.personalizedRecommendation")}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {t("settings.personalizedRecommendationDesc")}
                </p>
              </div>
              <Switch
                checked={data.aiPrivacy?.personalizedRecommendation ?? true}
                onChange={handleAiPrivacyToggle}
                disabled={savingAiPrivacy}
              />
            </div>
          </div>

          {/* Card: Notifications */}
          <div className="bg-white rounded-2xl border border-gray-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-6 sm:p-7">
            <h3 className="flex items-center gap-2.5 font-bold text-gray-950 text-base mb-5 border-b border-gray-100 pb-3.5">
              <div className="w-8 h-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center shrink-0">
                <Bell size={16} />
              </div>
              {t("settings.notifications")}
            </h3>
            <div className="divide-y divide-gray-100">
              <div className="py-3.5 first:pt-0 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {t("settings.orderNotifications")}
                  </p>
                  <p className="text-xs text-gray-500">
                    {locale === "en"
                      ? "Order updates, status changes and delivery tracking"
                      : "Cập nhật đơn hàng, thay đổi trạng thái và hành trình vận chuyển"}
                  </p>
                </div>
                <Switch
                  checked={data.notifications?.order ?? true}
                  onChange={(checked) =>
                    handleNotificationToggle("order", checked)
                  }
                  disabled={savingNotifications}
                />
              </div>

              <div className="py-3.5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {t("settings.promotionNotifications")}
                  </p>
                  <p className="text-xs text-gray-500">
                    {locale === "en"
                      ? "Voucher alerts, discount codes and seasonal offers"
                      : "Thông báo voucher, mã giảm giá và ưu đãi theo mùa"}
                  </p>
                </div>
                <Switch
                  checked={data.notifications?.promotion ?? true}
                  onChange={(checked) =>
                    handleNotificationToggle("promotion", checked)
                  }
                  disabled={savingNotifications}
                />
              </div>

              <div className="py-3.5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {t("settings.chatNotifications")}
                  </p>
                  <p className="text-xs text-gray-500">
                    {locale === "en"
                      ? "Messages and replies from merchants"
                      : "Tin nhắn và phản hồi từ người bán"}
                  </p>
                </div>
                <Switch
                  checked={data.notifications?.chat ?? true}
                  onChange={(checked) =>
                    handleNotificationToggle("chat", checked)
                  }
                  disabled={savingNotifications}
                />
              </div>

              <div className="py-3.5 last:pb-0 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {t("settings.systemNotifications")}
                  </p>
                  <p className="text-xs text-gray-500">
                    {locale === "en"
                      ? "Security alerts and important platform updates"
                      : "Cảnh báo bảo mật và các cập nhật quan trọng của hệ thống"}
                  </p>
                </div>
                <Switch
                  checked={data.notifications?.system ?? true}
                  onChange={(checked) =>
                    handleNotificationToggle("system", checked)
                  }
                  disabled={savingNotifications}
                />
              </div>
            </div>
          </div>

          {/* Card: General / Language */}
          <div className="bg-white rounded-2xl border border-gray-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-6 sm:p-7">
            <h3 className="flex items-center gap-2.5 font-bold text-gray-950 text-base mb-5 border-b border-gray-100 pb-3.5">
              <div className="w-8 h-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center shrink-0">
                <Globe size={16} />
              </div>
              {t("settings.generalTitle")}
            </h3>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {t("settings.language")}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {t("settings.languageDesc")}
                </p>
              </div>
              <select
                value={locale}
                disabled={savingLanguage}
                onChange={(e) =>
                  handleLanguageChange(e.target.value === "en" ? "en" : "vi")
                }
                className="px-3.5 py-2 text-sm font-medium border border-gray-200 rounded-xl bg-white text-gray-900 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand disabled:opacity-50 cursor-pointer shadow-2xs"
              >
                <option value="vi">{t("settings.languageVi")}</option>
                <option value="en">{t("settings.languageEn")}</option>
              </select>
            </div>
          </div>

          {/* Card: Social Accounts Panel */}
          <SocialAccountsPanel />
        </div>
      )}
    </MemberPageLayout>
  );
}

export default function SettingsPage() {
  return (
    <AuthGuard>
      <SettingsInner />
    </AuthGuard>
  );
}
