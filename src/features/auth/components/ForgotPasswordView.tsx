"use client";

import Link from "next/link";
import Image from "next/image";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, ArrowLeft, CheckCircle, Lock } from "lucide-react";
import toast from "react-hot-toast";
import { Button, Input } from "@/shared/ui";
import { useTranslation } from "@/hooks";
import { securityService } from "@/lib/services";
import { getErrorMessage, getFieldErrors } from "@/shared/lib/errors";

function ForgotPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token");

  const [identity, setIdentity] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { t } = useTranslation();

  const isResetMode = Boolean(tokenFromUrl);

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setFieldErrors({});
    try {
      await securityService.requestPasswordReset(identity.trim());
      setSent(true);

      toast.success(t("auth.resetRequestSuccess"));
    } catch (err) {
      setFieldErrors(getFieldErrors(err));
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!tokenFromUrl) return;
    if (newPassword !== confirmPassword) {
      setFieldErrors({ confirmPassword: t("auth.passwordMismatch") });
      return;
    }
    setLoading(true);
    setFieldErrors({});
    try {
      await securityService.completePasswordReset(tokenFromUrl, newPassword);
      setCompleted(true);
      toast.success(t("auth.resetSuccess"));
      setTimeout(() => router.replace("/auth/login"), 1500);
    } catch (err) {
      setFieldErrors(getFieldErrors(err));
      toast.error(getErrorMessage(err, t("auth.invalidOrExpiredToken")));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 bg-gradient-to-br from-purple-50/70 via-gray-50/80 to-purple-50/50 flex items-center justify-center py-12 lg:py-20 px-4">
      <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-7 hidden lg:flex flex-col items-center justify-center space-y-6">
          <div className="relative h-56 w-56 flex items-center justify-center">
            <div className="absolute inset-4 bg-purple-400/20 rounded-full blur-2xl animate-pulse" />
            <Image
              src="/images/logo_without_text.png"
              alt="Aionn"
              width={194}
              height={181}
              className="relative h-full w-full object-contain drop-shadow-md hover:scale-105 transition-transform duration-300"
            />
          </div>
          <div className="space-y-3 text-center">
            <h1 className="font-brand text-5xl lg:text-6xl font-bold text-brand tracking-wide select-none">
              Aionn
            </h1>
            <p className="max-w-md text-xl font-semibold leading-relaxed text-gray-900">
              {t("auth.tagline")}
            </p>
          </div>
        </div>

        <div className="lg:col-span-5 w-full flex justify-center lg:justify-end">
          <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.12),0_4px_16px_rgba(0,0,0,0.06),0_0_1px_rgba(0,0,0,0.2)] border border-gray-200/90 p-8 transition-shadow">
            <div className="mb-7">
              <h1 className="text-2xl font-bold text-gray-950">
                {isResetMode
                  ? t("auth.resetPasswordTitle")
                  : t("auth.forgotPasswordTitle")}
              </h1>
              <p className="mt-1.5 text-sm text-gray-500">
                {isResetMode
                  ? t("auth.resetPasswordSubtitle")
                  : sent
                    ? t("auth.checkEmail")
                    : t("auth.forgotPasswordSubtitle")}
              </p>
            </div>

            {isResetMode ? (
              completed ? (
                <div className="text-center py-4">
                  <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <CheckCircle size={28} className="text-green-600" />
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {t("auth.resetSuccessDesc")}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleReset} className="space-y-4">
                  <Input
                    id="newPassword"
                    label={t("auth.newPassword")}
                    type="password"
                    placeholder={t("auth.minPassword")}
                    icon={<Lock size={18} />}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    error={fieldErrors.newPassword}
                    autoComplete="new-password"
                    required
                  />
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
                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    loading={loading}
                  >
                    {t("auth.resetPassword")}
                  </Button>
                </form>
              )
            ) : !sent ? (
              <form onSubmit={handleRequest} className="space-y-4">
                <Input
                  id="identity"
                  label={t("auth.emailOrPhone")}
                  type="text"
                  placeholder={t("auth.emailOrPhonePlaceholder")}
                  icon={<Mail size={18} />}
                  value={identity}
                  onChange={(e) => setIdentity(e.target.value)}
                  error={fieldErrors.identity}
                  required
                />
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  loading={loading}
                >
                  {t("auth.sendResetLink")}
                </Button>
              </form>
            ) : (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={28} className="text-green-600" />
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {t("auth.resetEmailSent")}
                </p>
              </div>
            )}

            <div className="mt-6 text-center">
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                <ArrowLeft size={14} />
                {t("auth.backToLogin")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  return (
    <Suspense
      fallback={
        <div className="flex-1 bg-gradient-to-br from--brand to--brand-strong flex items-center justify-center">
          <div className="text-white text-lg font-medium">
            {t("common.loading")}
          </div>
        </div>
      }
    >
      <ForgotPasswordInner />
    </Suspense>
  );
}
