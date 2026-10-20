"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import toast from "react-hot-toast";
import { Button, Input, Modal, AppImage } from "@/shared/ui";
import { useTranslation } from "@/hooks";

interface PasswordModalProps {
  open: boolean;
  current: string;
  password: string;
  confirmation: string;
  loading: boolean;
  onClose: () => void;
  onCurrent: (value: string) => void;
  onPassword: (value: string) => void;
  onConfirmation: (value: string) => void;
  onSubmit: () => void;
}

export function PasswordModal(props: PasswordModalProps) {
  const { t } = useTranslation();
  return (
    <Modal
      isOpen={props.open}
      onClose={props.onClose}
      title={t("security.changePassword")}
      size="sm"
    >
      <div className="space-y-4">
        <Input
          type="password"
          label={t("security.currentPassword")}
          value={props.current}
          onChange={(event) => props.onCurrent(event.target.value)}
          autoComplete="current-password"
        />
        <Input
          type="password"
          label={t("security.newPassword")}
          value={props.password}
          onChange={(event) => props.onPassword(event.target.value)}
          autoComplete="new-password"
        />
        <Input
          type="password"
          label={t("security.confirmNewPassword")}
          value={props.confirmation}
          onChange={(event) => props.onConfirmation(event.target.value)}
          autoComplete="new-password"
        />
        <Button
          onClick={props.onSubmit}
          className="w-full"
          loading={props.loading}
        >
          {t("security.update")}
        </Button>
      </div>
    </Modal>
  );
}

interface MfaModalProps {
  open: boolean;
  step: "password" | "scan";
  password: string;
  code: string;
  secret?: string;
  otpauthUri?: string;
  loading: boolean;
  onClose: () => void;
  onPassword: (value: string) => void;
  onCode: (value: string) => void;
  onSetup: () => void;
  onEnable: () => void;
}

export function MfaModal(props: MfaModalProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!props.secret) return;
    navigator.clipboard.writeText(props.secret);
    toast.success(t("mfaSetup.copiedToast"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={props.open}
      onClose={props.onClose}
      title={t("security.enableMfaTitle")}
      size="md"
    >
      {props.step === "password" ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {t("security.mfaPasswordPrompt")}
          </p>
          <Input
            type="password"
            label={t("security.password")}
            value={props.password}
            onChange={(event) => props.onPassword(event.target.value)}
          />
          <Button
            onClick={props.onSetup}
            className="w-full"
            loading={props.loading}
          >
            {t("security.continue")}
          </Button>
        </div>
      ) : props.secret ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">{t("security.mfaScanPrompt")}</p>
          {props.otpauthUri && (
            <div className="flex justify-center p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="p-3 bg-white border border-gray-200 rounded-lg shadow-2xs">
                <AppImage
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(props.otpauthUri)}`}
                  alt="2FA QR Code"
                  className="w-44 h-44"
                />
              </div>
            </div>
          )}
          <div>
            <span className="block text-xs text-gray-600 font-medium mb-1">
              {t("mfaSetup.manualSecret")}
            </span>
            <div className="flex items-center justify-between gap-2 bg-gray-50 rounded-lg p-2.5 border border-gray-200 text-gray-800">
              <span className="font-mono text-xs break-all select-all leading-relaxed">
                {props.secret}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                title={t("mfaSetup.copiedToast") || "Sao chép"}
                aria-label="Sao chép"
                className="p-1.5 text-gray-500 hover:text-brand-600 hover:bg-white rounded-md transition-colors shrink-0 cursor-pointer"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
          <Input
            label={t("security.verificationCode")}
            value={props.code}
            onChange={(event) =>
              props.onCode(event.target.value.replace(/\D/g, ""))
            }
            maxLength={6}
            className="text-center tracking-[0.3em] font-mono text-lg"
            placeholder="000000"
          />
          <Button
            onClick={props.onEnable}
            className="w-full"
            loading={props.loading}
          >
            {t("security.activate")}
          </Button>
        </div>
      ) : null}
    </Modal>
  );
}
