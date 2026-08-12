"use client";

import { AppImage } from "@/shared/ui";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Smartphone,
  Key,
  CheckCircle2,
  ArrowLeft,
  Copy,
  Download,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button, Input } from "@/shared/ui";
import AuthGuard from "@/components/auth/AuthGuard";
import { securityService } from "@/lib/services";
import { getErrorMessage } from "@/shared/lib/errors";
import type { MfaSetup } from "@/types";
import { useTranslation } from "@/hooks";

const STEPS = [
  { id: 1, labelKey: "mfaSetup.steps.verify" },
  { id: 2, labelKey: "mfaSetup.steps.scan" },
  { id: 3, labelKey: "mfaSetup.steps.confirm" },
  { id: 4, labelKey: "mfaSetup.steps.complete" },
];

function MfaSetupWizardInner() {
  const { t } = useTranslation();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaSetup, setMfaSetup] = useState<MfaSetup | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleVerifyPassword() {
    setLoading(true);
    try {
      const setup = await securityService.setupMfa(password);
      setMfaSetup(setup);
      setStep(2);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleEnableMfa() {
    setLoading(true);
    try {
      const result = await securityService.enableMfa(password, mfaCode.trim());
      setBackupCodes(result.backupCodes);
      setStep(4);
      toast.success(t("mfaSetup.enabledToast"));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function copySecret() {
    if (mfaSetup) {
      navigator.clipboard.writeText(mfaSetup.secret);
      toast.success(t("mfaSetup.copiedToast"));
    }
  }

  function downloadBackupCodes() {
    const text = backupCodes.join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mfa-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t("mfaSetup.downloadedToast"));
  }

  function handleComplete() {
    router.push("/account/security");
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft size={16} />
          {t("mfaSetup.back")}
        </button>

        <div className="bg-white rounded-xl border border-gray-100 p-8">
          <div className="flex items-center justify-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-full">
              <Smartphone className="text-blue-600" size={28} />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
            {t("mfaSetup.title")}
          </h1>
          <p className="text-sm text-gray-500 text-center mb-8">
            {t("mfaSetup.subtitle")}
          </p>

          <div className="flex items-center justify-between mb-8">
            {STEPS.map((s, idx) => (
              <div key={s.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step >= s.id
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {step > s.id ? <CheckCircle2 size={16} /> : s.id}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{t(s.labelKey)}</p>
                </div>
                {idx < STEPS.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 ${
                      step > s.id ? "bg-blue-600" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <Key className="inline-block text-blue-600 mb-2" size={32} />
                <p className="text-sm text-gray-600">
                  {t("mfaSetup.passwordPrompt")}
                </p>
              </div>
              <Input
                type="password"
                label={t("mfaSetup.password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("mfaSetup.passwordPlaceholder")}
                autoComplete="current-password"
              />
              <Button
                onClick={handleVerifyPassword}
                className="w-full"
                loading={loading}
                disabled={!password}
              >
                {t("mfaSetup.continue")}
              </Button>
            </div>
          )}

          {step === 2 && mfaSetup && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <p className="text-sm text-gray-600 mb-4">
                  {t("mfaSetup.scanPrompt")}
                </p>
                <div className="inline-block p-4 bg-white border-2 border-gray-200 rounded-lg">
                  <AppImage
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(mfaSetup.otpauthUri)}`}
                    alt="QR Code"
                    className="w-48 h-48"
                  />
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs font-medium text-gray-700 mb-2">
                  {t("mfaSetup.manualSecret")}
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-white border border-gray-200 rounded text-sm font-mono break-all">
                    {mfaSetup.secret}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copySecret}
                    className="flex-shrink-0"
                  >
                    <Copy size={16} />
                  </Button>
                </div>
              </div>

              <Button onClick={() => setStep(3)} className="w-full">
                {t("mfaSetup.scannedContinue")}
              </Button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <Smartphone
                  className="inline-block text-blue-600 mb-2"
                  size={32}
                />
                <p className="text-sm text-gray-600">
                  {t("mfaSetup.codePrompt")}
                </p>
              </div>
              <Input
                label={t("mfaSetup.code")}
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                maxLength={6}
                placeholder="000000"
                className="text-center tracking-[0.5em] font-mono text-2xl"
              />
              <Button
                onClick={handleEnableMfa}
                className="w-full"
                loading={loading}
                disabled={mfaCode.length !== 6}
              >
                {t("mfaSetup.enable")}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setStep(2)}
                className="w-full"
              >
                {t("mfaSetup.back")}
              </Button>
            </div>
          )}

          {step === 4 && backupCodes.length > 0 && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <CheckCircle2
                  className="inline-block text-green-600 mb-2"
                  size={48}
                />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t("mfaSetup.enabledTitle")}
                </h3>
                <p className="text-sm text-gray-600">
                  {t("mfaSetup.backupDescription")}
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-xs font-medium text-amber-900 mb-3">
                  ⚠️ {t("mfaSetup.backupWarning")}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((code, idx) => (
                    <code
                      key={idx}
                      className="p-2 bg-white border border-amber-200 rounded text-sm font-mono text-center"
                    >
                      {code}
                    </code>
                  ))}
                </div>
              </div>

              <Button
                variant="outline"
                onClick={downloadBackupCodes}
                className="w-full"
              >
                <Download size={16} className="mr-2" />
                {t("mfaSetup.downloadBackup")}
              </Button>

              <Button onClick={handleComplete} className="w-full">
                {t("mfaSetup.steps.complete")}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MfaSetupWizardPage() {
  return (
    <AuthGuard>
      <MfaSetupWizardInner />
    </AuthGuard>
  );
}
