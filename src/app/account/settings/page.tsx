"use client";

import { useState } from "react";
import { Globe, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Sidebar from "@/components/layout/Sidebar";
import AuthGuard from "@/components/auth/AuthGuard";
import SocialAccountsPanel from "@/components/settings/SocialAccountsPanel";
import { preferenceService } from "@/lib/services";
import { useTranslation } from "@/hooks";
import { qk } from "@/lib/query-keys";
import { getErrorMessage } from "@/shared/lib/errors";
import type { UserPreference } from "@/types";

function SettingsInner() {
  const { t, locale, setLocale } = useTranslation();
  const qc = useQueryClient();
  const { data, isLoading: loading } = useQuery({
    queryKey: qk.preferences,
    queryFn: () => preferenceService.get(),
  });
  const [savingLanguage, setSavingLanguage] = useState(false);

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

  return (
    <div className="member-page bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          <Sidebar />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">
              {t("settings.title")}
            </h1>

            {loading || !data ? (
              <div className="bg-white rounded-xl border border-gray-100 p-12 flex justify-center">
                <Loader2 className="animate-spin text-blue-600" size={28} />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-gray-100 p-6">
                  <h3 className="flex items-center gap-2 font-semibold text-gray-900 mb-4">
                    <Globe size={18} className="text-blue-600" />
                    {t("settings.generalTitle")}
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {t("settings.language")}
                        </p>
                        <p className="text-xs text-gray-500">
                          {t("settings.languageDesc")}
                        </p>
                      </div>
                      <select
                        value={locale}
                        disabled={savingLanguage}
                        onChange={(e) =>
                          handleLanguageChange(
                            e.target.value === "en" ? "en" : "vi",
                          )
                        }
                        className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-50"
                      >
                        <option value="vi">{t("settings.languageVi")}</option>
                        <option value="en">{t("settings.languageEn")}</option>
                      </select>
                    </div>
                  </div>
                </div>

                <SocialAccountsPanel />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <AuthGuard>
      <SettingsInner />
    </AuthGuard>
  );
}
