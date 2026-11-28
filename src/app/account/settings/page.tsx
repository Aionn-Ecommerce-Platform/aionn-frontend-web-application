"use client";

import { useState } from "react";
import { Loader2, Bell } from "lucide-react";
import toast from "react-hot-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import MemberPageLayout from "@/components/layout/MemberPageLayout";
import AuthGuard from "@/components/auth/AuthGuard";
import SocialAccountsPanel from "@/components/settings/SocialAccountsPanel";
import PrivacySettings from "@/components/settings/PrivacySettings";
import { preferenceService } from "@/lib/services";
import { useTranslation } from "@/hooks";
import { qk } from "@/lib/query-keys";
import { getErrorMessage } from "@/shared/lib/errors";
import { Switch } from "@/shared/ui";
import type { NotificationSettings, UserPreference } from "@/types";

function SettingsInner() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data, isLoading: loading } = useQuery({
    queryKey: qk.preferences,
    queryFn: () => preferenceService.get(),
  });
  const [savingNotifications, setSavingNotifications] = useState(false);

  function writePreferences(next: UserPreference) {
    qc.setQueryData(qk.preferences, next);
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
      </div>

      {loading || !data ? (
        <div className="bg-white rounded-2xl border border-gray-400 shadow-xs p-16 flex justify-center">
          <Loader2 className="animate-spin text-brand" size={32} />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Card: Notifications */}
          <div className="bg-white rounded-2xl border border-gray-400 shadow-xs p-6 sm:p-7">
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

      {/* Data & privacy stays available even if preferences fail to load. */}
      <section id="privacy" className="scroll-mt-24 mt-6">
        <PrivacySettings />
      </section>
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
