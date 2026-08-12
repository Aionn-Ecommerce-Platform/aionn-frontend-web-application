"use client";

import { useState } from "react";
import { Link as LinkIcon, Unlink, Mail } from "lucide-react";
import toast from "react-hot-toast";
import { Button, ConfirmDialog } from "@/shared/ui";
import { authService } from "@/lib/services";
import { getErrorMessage } from "@/shared/lib/errors";
import { useTranslation } from "@/hooks";

const PROVIDERS = [
  {
    id: "GOOGLE",
    name: "Google",
    color: "bg-red-50 text-red-700 border-red-200",
    icon: Mail,
  },
  {
    id: "FACEBOOK",
    name: "Facebook",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    icon: Mail,
  },
];

export default function SocialAccountsPanel() {
  const { t } = useTranslation();

  const [linkedAccounts, setLinkedAccounts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<string | null>(null);
  const [unlinkProvider, setUnlinkProvider] = useState<string | null>(null);

  async function handleLink(provider: string) {
    setLoading(provider);
    try {
      toast(t("settings.socialComingSoon"));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(null);
    }
  }

  async function handleUnlink(provider: string) {
    setLoading(provider);
    try {
      await authService.unlinkSocial(provider);
      setLinkedAccounts((prev) => {
        const next = new Set(prev);
        next.delete(provider);
        return next;
      });
      toast.success(
        t("settings.socialUnlinked").replace("{provider}", provider),
      );
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(null);
      setUnlinkProvider(null);
    }
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h3 className="flex items-center gap-2 font-semibold text-gray-900 mb-4">
          <LinkIcon size={18} className="text-blue-600" />
          {t("settings.socialTitle")}
        </h3>
        <div className="space-y-4">
          {PROVIDERS.map((provider) => {
            const isLinked = linkedAccounts.has(provider.id);
            const isLoading = loading === provider.id;
            const Icon = provider.icon;

            return (
              <div
                key={provider.id}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${provider.color.split(" ")[0]}`}
                  >
                    <Icon size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {provider.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {isLinked
                        ? t("settings.socialLinked")
                        : t("settings.socialDesc")}
                    </p>
                  </div>
                </div>
                {isLinked ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setUnlinkProvider(provider.id)}
                    loading={isLoading}
                  >
                    <Unlink size={14} className="mr-1" />
                    {t("settings.socialUnlink")}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleLink(provider.id)}
                    loading={isLoading}
                  >
                    {t("settings.socialLink")}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <ConfirmDialog
        isOpen={unlinkProvider !== null}
        onClose={() => setUnlinkProvider(null)}
        onConfirm={() => unlinkProvider && handleUnlink(unlinkProvider)}
        title={t("settings.socialUnlinkTitle")}
        message={t("settings.socialUnlinkMessage")}
        confirmLabel={t("settings.socialUnlink")}
        loading={loading === unlinkProvider}
      />
    </>
  );
}
