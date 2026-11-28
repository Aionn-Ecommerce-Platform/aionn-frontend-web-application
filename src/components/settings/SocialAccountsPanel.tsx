"use client";

import { useEffect, useRef, useState } from "react";
import { Link as LinkIcon, Unlink, Loader2, Check } from "lucide-react";
import toast from "react-hot-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, ConfirmDialog, Modal, Badge } from "@/shared/ui";
import { authService } from "@/lib/services";
import { getErrorMessage } from "@/shared/lib/errors";
import { useSocialAuth, useTranslation } from "@/hooks";
import { qk } from "@/lib/query-keys";

function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29A11.97 11.97 0 0 0 0 12c0 1.94.46 3.77 1.29 5.38l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  );
}

const PROVIDERS = [
  {
    id: "GOOGLE",
    name: "Google",
    icon: GoogleIcon,
  },
];

export default function SocialAccountsPanel() {
  const { t, locale } = useTranslation();
  const qc = useQueryClient();
  const { googleConfigured, googleReady, mountGoogleButton } = useSocialAuth();

  const linksQuery = useQuery({
    queryKey: qk.socialAccounts,
    queryFn: () => authService.listSocialLinks(),
  });
  const linkedProviders = new Set(
    (linksQuery.data ?? []).map((link) => link.provider.toUpperCase()),
  );

  const [loading, setLoading] = useState<string | null>(null);
  const [unlinkProvider, setUnlinkProvider] = useState<string | null>(null);
  const [linkProvider, setLinkProvider] = useState<string | null>(null);
  const googleBtnRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!linkProvider || !googleReady || !googleBtnRef.current) return;
    mountGoogleButton(
      googleBtnRef.current,
      async (idToken) => {
        setLoading(linkProvider);
        try {
          await authService.linkSocial({
            provider: linkProvider,
            providerToken: idToken,
          });
          toast.success(t("settings.socialLinkSuccess"));
          setLinkProvider(null);
          await qc.invalidateQueries({ queryKey: qk.socialAccounts });
        } catch (err) {
          toast.error(getErrorMessage(err));
        } finally {
          setLoading(null);
        }
      },
      { text: "continue_with", width: 280, locale },
    );
  }, [linkProvider, googleReady, mountGoogleButton, qc, t, locale]);

  async function handleUnlink(provider: string) {
    setLoading(provider);
    try {
      await authService.unlinkSocial(provider);
      toast.success(
        t("settings.socialUnlinked").replace("{provider}", provider),
      );
      await qc.invalidateQueries({ queryKey: qk.socialAccounts });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(null);
      setUnlinkProvider(null);
    }
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-6 sm:p-7">
        <h3 className="flex items-center gap-2.5 font-bold text-gray-950 text-base mb-5 border-b border-gray-100 pb-3.5">
          <div className="w-8 h-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center shrink-0">
            <LinkIcon size={16} />
          </div>
          {t("settings.socialTitle")}
        </h3>

        {linksQuery.isLoading ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="animate-spin text-brand" size={24} />
          </div>
        ) : linksQuery.isError ? (
          <div className="flex items-center justify-between gap-4 py-2">
            <p className="text-sm text-gray-500">
              {t("settings.socialLoadError")}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void linksQuery.refetch()}
              className="rounded-xl"
            >
              {t("common.retry")}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {PROVIDERS.map((provider) => {
              const isLinked = linkedProviders.has(provider.id);
              const isLoading = loading === provider.id;
              const Icon = provider.icon;

              return (
                <div
                  key={provider.id}
                  className="flex items-center justify-between gap-4 p-3.5 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Icon size={20} />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {provider.name}
                      </p>
                      {isLinked && (
                        <Badge variant="success" className="mt-1 gap-1">
                          <Check size={12} />
                          {t("settings.socialLinked")}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {isLinked ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setUnlinkProvider(provider.id)}
                      loading={isLoading}
                      className="text-gray-500 hover:text-red-600 rounded-xl"
                    >
                      <Unlink size={14} className="mr-1" />
                      {t("settings.socialUnlink")}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLinkProvider(provider.id)}
                      disabled={!googleConfigured}
                      title={
                        googleConfigured
                          ? undefined
                          : t("settings.socialUnavailable")
                      }
                      className="rounded-xl border-gray-200 hover:border-brand hover:text-brand"
                    >
                      {t("settings.socialLink")}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
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

      <Modal
        isOpen={linkProvider !== null}
        onClose={() => setLinkProvider(null)}
        title={t("settings.socialLinkTitle")}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {t("settings.socialLinkPrompt")}
          </p>
          <div
            ref={googleBtnRef}
            className="flex min-h-[44px] justify-center"
          />
          {!googleReady && (
            <p className="text-xs text-gray-500 text-center">
              {t("settings.socialLinkLoading")}
            </p>
          )}
          <Button
            variant="outline"
            onClick={() => setLinkProvider(null)}
            className="w-full rounded-xl"
            disabled={loading !== null}
          >
            {t("common.cancel")}
          </Button>
        </div>
      </Modal>
    </>
  );
}
