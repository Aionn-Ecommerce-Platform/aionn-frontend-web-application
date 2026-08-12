"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Lock, Eye, EyeOff, User, Phone } from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";
import ReCAPTCHA from "react-google-recaptcha";
import { Button, Input } from "@/shared/ui";
import { useTranslation, useSocialAuth } from "@/hooks";
import { registrationService, userService, authService } from "@/lib/services";
import { useAuthStore } from "@/stores/auth.store";
import { getErrorMessage, getFieldErrors } from "@/shared/lib/errors";

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";

type Step = "initiate" | "verify" | "complete";

export default function RegisterForm({
  onSwitchToLogin,
}: {
  onSwitchToLogin?: () => void;
} = {}) {
  const router = useRouter();
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
          toast.success(t("auth.registerSuccess"));
          router.replace("/");
        } catch (err) {
          toast.error(getErrorMessage(err, t("auth.socialRegisterError")));
        } finally {
          setSocialLoading(null);
        }
      },
      { text: "signup_with", locale },
    );
  }, [
    googleReady,
    mountGoogleButton,
    loginSuccess,
    router,
    t,
    socialLoading,
    locale,
  ]);

  const [step, setStep] = useState<Step>("initiate");
  const [loading, setLoading] = useState(false);

  const [phone, setPhone] = useState("");
  const [regId, setRegId] = useState<string | null>(null);
  const [resendAvailableAt, setResendAvailableAt] = useState<string | null>(
    null,
  );

  const [otp, setOtp] = useState("");
  const [verificationToken, setVerificationToken] = useState<string | null>(
    null,
  );
  const [resendCountdown, setResendCountdown] = useState(0);

  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!resendAvailableAt) return;
    const tick = () => {
      const remaining = Math.max(
        0,
        Math.ceil((new Date(resendAvailableAt).getTime() - Date.now()) / 1000),
      );
      setResendCountdown(remaining);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [resendAvailableAt]);

  const recaptchaRef = useRef<ReCAPTCHA | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const canInitiateRegistration =
    phone.trim().length > 0 && !!captchaToken && !!RECAPTCHA_SITE_KEY;

  async function handleInitiate(e: React.FormEvent) {
    e.preventDefault();
    if (!RECAPTCHA_SITE_KEY) {
      toast.error(t("auth.captchaNotConfigured"));
      return;
    }
    if (!captchaToken) {
      toast.error(t("auth.captchaRequired"));
      return;
    }
    setLoading(true);
    setFieldErrors({});
    try {
      const session = await registrationService.initiate({
        phoneNumber: phone.trim(),
        captchaToken,
      });
      setRegId(session.regId);
      setResendAvailableAt(session.resendAvailableAt);
      setStep("verify");
      if (session.otpCode) {
        toast(`OTP (dev): ${session.otpCode}`, { duration: 6000, icon: "🔧" });
      } else {
        toast.success(t("auth.otpSentToast"));
      }
    } catch (err) {
      recaptchaRef.current?.reset();
      setCaptchaToken(null);
      setFieldErrors(getFieldErrors(err));
      toast.error(getErrorMessage(err, t("auth.otpSendError")));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!regId) return;
    setLoading(true);
    setFieldErrors({});
    try {
      const result = await registrationService.verifyOtp(regId, otp.trim());
      setVerificationToken(result.verificationToken);
      setStep("complete");
      toast.success(t("auth.otpVerifySuccess"));
    } catch (err) {
      setFieldErrors(getFieldErrors(err));
      toast.error(getErrorMessage(err, t("auth.otpInvalid")));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!regId || resendCountdown > 0) return;
    setLoading(true);
    try {
      const session = await registrationService.resendOtp(regId);
      setResendAvailableAt(session.resendAvailableAt);
      if (session.otpCode) {
        toast(`OTP (dev): ${session.otpCode}`, { duration: 6000, icon: "🔧" });
      } else {
        toast.success(t("auth.otpResentSuccess"));
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleComplete(e: React.FormEvent) {
    e.preventDefault();
    if (!regId || !verificationToken) return;
    if (password !== confirmPassword) {
      setFieldErrors({ confirmPassword: t("auth.passwordMismatch") });
      return;
    }
    setLoading(true);
    setFieldErrors({});
    try {
      const tokens = await registrationService.complete(regId, {
        password,
        username: displayName.trim(),
        verificationToken,
      });
      loginSuccess(tokens);
      try {
        const profile = await userService.getMyProfile();
        loginSuccess(tokens, profile);
      } catch {}
      toast.success(t("auth.registerSuccess"));
      router.replace("/");
    } catch (err) {
      setFieldErrors(getFieldErrors(err));
      toast.error(getErrorMessage(err, t("auth.registerError")));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="mb-6">
        <p className="text-sm text-gray-500">{t("auth.registerSubtitle")}</p>
      </div>

      <div className="flex items-center justify-center gap-2 mb-6">
        {(["initiate", "verify", "complete"] as Step[]).map((s, i) => {
          const order = ["initiate", "verify", "complete"];
          const cur = order.indexOf(step);
          return (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                  step === s
                    ? "bg-blue-600 text-white"
                    : i < cur
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-400"
                }`}
                aria-label={`${t("auth.step")} ${i + 1}`}
              >
                {i + 1}
              </div>
              {i < 2 && (
                <div
                  className={`w-6 h-0.5 ${i < cur ? "bg-blue-400" : "bg-gray-200"}`}
                />
              )}
            </div>
          );
        })}
      </div>

      {step === "initiate" && (
        <>
          <form onSubmit={handleInitiate} className="space-y-4">
            <Input
              id="phone"
              label={t("auth.phone")}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="0901234567"
              icon={<Phone size={18} />}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              error={fieldErrors.phoneNumber}
              required
            />
            {RECAPTCHA_SITE_KEY ? (
              <div className="flex justify-center">
                <ReCAPTCHA
                  ref={recaptchaRef}
                  sitekey={RECAPTCHA_SITE_KEY}
                  hl={locale === "vi" ? "vi" : "en"}
                  onChange={(token) => setCaptchaToken(token)}
                  onExpired={() => setCaptchaToken(null)}
                  onErrored={() => setCaptchaToken(null)}
                />
              </div>
            ) : (
              <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">
                {t("auth.captchaNotConfigured")}
              </p>
            )}
            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={loading}
              disabled={!canInitiateRegistration}
            >
              {t("common.continue")}
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

              <div
                ref={googleBtnRef}
                className="flex justify-center min-h-[44px]"
              />
              {socialLoading === "google" && (
                <p className="mt-2 text-center text-xs text-gray-400">
                  {t("auth.authenticating")}
                </p>
              )}
            </>
          )}
        </>
      )}

      {step === "verify" && (
        <form onSubmit={handleVerify} className="space-y-4">
          <p className="text-sm text-gray-600 text-center mb-4">
            {t("auth.otpSent")}{" "}
            <span className="font-medium text-gray-900">{phone}</span>
          </p>
          <Input
            id="otp"
            label={t("auth.verifyOtp")}
            type="text"
            inputMode="numeric"
            placeholder="000000"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            className="text-center text-2xl tracking-[0.3em] font-mono"
            maxLength={6}
            required
          />
          <Button type="submit" className="w-full" size="lg" loading={loading}>
            {t("auth.verifyOtp")}
          </Button>
          <button
            type="button"
            onClick={handleResend}
            disabled={resendCountdown > 0 || loading}
            className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            {resendCountdown > 0
              ? `${t("auth.resendOtp")} (${resendCountdown}s)`
              : t("auth.resendOtp")}
          </button>
        </form>
      )}

      {step === "complete" && (
        <form onSubmit={handleComplete} className="space-y-4">
          <Input
            id="displayName"
            label={t("auth.displayName")}
            type="text"
            placeholder={t("auth.displayNamePlaceholder")}
            icon={<User size={18} />}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            error={fieldErrors.username}
            required
          />
          <div className="relative">
            <Input
              id="password"
              label={t("auth.password")}
              type={showPassword ? "text" : "password"}
              placeholder={t("auth.minPassword")}
              icon={<Lock size={18} />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password}
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
              aria-label="Toggle password"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <Input
            id="confirmPassword"
            label={t("auth.confirmPassword")}
            type="password"
            placeholder={t("auth.minPassword")}
            icon={<Lock size={18} />}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={fieldErrors.confirmPassword}
            autoComplete="new-password"
            required
          />
          <label className="flex items-start gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              required
            />
            <span>
              {t("auth.agreeTerms")}{" "}
              <Link href="/terms" className="text-blue-600 hover:underline">
                {t("auth.termsOfService")}
              </Link>{" "}
              {t("auth.and")}{" "}
              <Link href="/privacy" className="text-blue-600 hover:underline">
                {t("auth.privacyPolicy")}
              </Link>
            </span>
          </label>
          <Button
            type="submit"
            className="w-full"
            size="lg"
            loading={loading}
            disabled={!agreed}
          >
            {t("auth.completeRegistration")}
          </Button>
        </form>
      )}

      {step === "initiate" && (
        <p className="mt-6 text-center text-sm text-gray-500">
          {t("auth.hasAccount")}{" "}
          {onSwitchToLogin ? (
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              {t("auth.loginNow")}
            </button>
          ) : (
            <Link
              href="/auth/login"
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              {t("auth.loginNow")}
            </Link>
          )}
        </p>
      )}
    </>
  );
}
