"use client";

import { Button, Input, Modal } from "@/shared/ui";
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
  loading: boolean;
  onClose: () => void;
  onPassword: (value: string) => void;
  onCode: (value: string) => void;
  onSetup: () => void;
  onEnable: () => void;
}

export function MfaModal(props: MfaModalProps) {
  const { t } = useTranslation();
  return (
    <Modal
      isOpen={props.open}
      onClose={props.onClose}
      title={t("security.enableMfaTitle")}
      size="sm"
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
          <div className="bg-gray-50 rounded-lg p-3 font-mono text-xs break-all border border-gray-100">
            {props.secret}
          </div>
          <Input
            label={t("security.verificationCode")}
            value={props.code}
            onChange={(event) =>
              props.onCode(event.target.value.replace(/\D/g, ""))
            }
            maxLength={6}
            className="text-center tracking-[0.3em] font-mono"
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
