"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";
import { Button, Input } from "@/shared/ui";
import { useTranslation, useSocialAuth } from "@/hooks";
import { authService, userService } from "@/lib/services";
import { useAuthStore } from "@/stores/auth.store";
import { getErrorMessage } from "@/shared/lib/errors";

export default function LoginForm({
  onSwitchToRegister,
}: {
  onSwitchToRegister?: () => void;
} = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams?.get("redirect") || "/";

  const [identity, setIdentity] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [needsMfa, setNeedsMfa] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { t, locale } = useTranslation();
  const loginSuccess = useAuthStore((s) => s.loginSuccess);
  const { googleConfigured, googleReady, mountGoogleButton } = useSocialAuth();
  const [socialLoading, setSocialLoading] = useState<null | "google">(null);
  const googleBtnRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!googleBtnRef.current || !googleReady) return;
    mountGoogleButton(
      googleBtnRef.current,
      async (idToken) => {
        if (socialLoading) return;
        setSocialLoading("google");
        try {
          const tokens = await authService.socialLogin({
            provider: "google",
            providerToken: idToken,
          });
          loginSuccess(tokens);
          try {
            const profile = await userService.getMyProfile();
            loginSuccess(tokens, profile);
          } catch {}
          toast.success(t("auth.loginSuccessToast"));
          router.replace(redirectTo);
        } catch (err) {
          toast.error(getErrorMessage(err, t("auth.loginErrorToast")));
        } finally {
          setSocialLoading(null);
        }
      },
      { text: "signin_with", locale },
    );
  }, [
    googleReady,
    mountGoogleButton,
    loginSuccess,
    redirectTo,
    router,
    t,
    socialLoading,
    locale,
  ]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setFieldErrors({});
    try {
      const tokens = await authService.login({
        identity: identity.trim(),
        password,
        mfaCode: needsMfa ? mfaCode.trim() : undefined,
      });
      loginSuccess(tokens);
      try {
        const profile = await userService.getMyProfile();
        loginSuccess(tokens, profile);
      } catch {}
      toast.success(t("auth.loginSuccessToast"));
      router.replace(redirectTo);
    } catch (err) {
      const e = err as {
        errorCode?: string;
        fieldErrors?: Record<string, string>;
      };
      if (
        e?.errorCode === "AUTH_MFA_REQUIRED" ||
        e?.errorCode === "MFA_REQUIRED"
      ) {
        setNeedsMfa(true);
        toast(t("auth.mfaRequiredToast"), { icon: "🔒" });
      } else {
        if (e?.fieldErrors) setFieldErrors(e.fieldErrors);
        toast.error(getErrorMessage(err, t("auth.loginErrorToast")));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="mb-6">
        <p className="text-sm text-gray-500">{t("auth.loginSubtitle")}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="identity"
          label={t("auth.emailOrPhone")}
          type="text"
          placeholder={t("auth.emailOrPhonePlaceholder")}
          autoComplete="username"
          icon={<Mail size={18} />}
          value={identity}
          onChange={(e) => setIdentity(e.target.value)}
          error={fieldErrors.identity}
          required
        />
        <div className="relative">
          <Input
            id="password"
            label={t("auth.password")}
            type={showPassword ? "text" : "password"}
            className="hide-password-reveal pr-10"
            placeholder={t("auth.minPassword")}
            autoComplete="current-password"
            icon={<Lock size={18} />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {needsMfa && (
          <Input
            id="mfaCode"
            label={t("auth.mfaLabel")}
            type="text"
            inputMode="numeric"
            maxLength={8}
            placeholder={t("auth.mfaPlaceholder")}
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value.replace(/\s/g, ""))}
            className="text-center tracking-[0.3em] font-mono"
            required
          />
        )}

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            {t("auth.rememberMe")}
          </label>
          <Link
            href="/auth/forgot-password"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {t("auth.forgotPassword")}
          </Link>
        </div>

        <Button type="submit" className="w-full" size="lg" loading={loading}>
          {t("common.login")}
        </Button>
      </form>

      {googleConfigured && (
        <>
          <div className="my-6 flex items-center gap-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 uppercase font-medium">
              {t("auth.or")}
            </span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <div className="relative">
            <div
              ref={googleBtnRef}
              className={`flex justify-center min-h-[44px] transition-opacity ${
                socialLoading === "google"
                  ? "opacity-30 pointer-events-none"
                  : ""
              }`}
            />
            {socialLoading === "google" && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="inline-block h-5 w-5 rounded-full border-2 border-gray-300 border-t-blue-600 animate-spin" />
              </div>
            )}
          </div>
        </>
      )}

      <p className="mt-6 text-center text-sm text-gray-500">
        {t("auth.noAccount")}{" "}
        {onSwitchToRegister ? (
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="text-blue-600 hover:text-blue-700 font-semibold"
          >
            {t("auth.registerNow")}
          </button>
        ) : (
          <Link
            href="/auth/register"
            className="text-blue-600 hover:text-blue-700 font-semibold"
          >
            {t("auth.registerNow")}
          </Link>
        )}
      </p>
    </>
  );
}
