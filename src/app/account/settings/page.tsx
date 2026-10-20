"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Loader2,
  Sparkles,
  Bot,
  Bell,
  ArrowRight,
} from "lucide-react";
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
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data, isLoading: loading } = useQuery({
    queryKey: qk.preferences,
    queryFn: () => preferenceService.get(),
  });
  const [savingAiPrivacy, setSavingAiPrivacy] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);

  function writePreferences(next: UserPreference) {
    qc.setQueryData(qk.preferences, next);
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
          {t("settings.subtitle")}
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
                    {t("settings.orderNotificationsDesc")}
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
                    {t("settings.promotionNotificationsDesc")}
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
                    {t("settings.chatNotificationsDesc")}
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
                    {t("settings.systemNotificationsDesc")}
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
