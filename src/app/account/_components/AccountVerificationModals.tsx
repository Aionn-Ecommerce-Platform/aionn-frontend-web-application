"use client";

import { Mail, Phone } from "lucide-react";
import { Button, Input, Modal } from "@/shared/ui";
import { useTranslation } from "@/hooks";

interface ChangeContactModalProps {
  kind: "email" | "phone";
  open: boolean;
  step: "input" | "otp";
  value: string;
  otp: string;
  loading: boolean;
  onClose: () => void;
  onValueChange: (value: string) => void;
  onOtpChange: (value: string) => void;
  onRequest: () => void;
  onConfirm: () => void;
}

export function ChangeContactModal(props: ChangeContactModalProps) {
  const { t, locale } = useTranslation();
  const email = props.kind === "email";
  return (
    <Modal
      isOpen={props.open}
      onClose={props.onClose}
      title={t(email ? "account.changeEmail" : "account.changePhone")}
      size="sm"
    >
      {props.step === "input" ? (
        <div className="space-y-4">
          <Input
            id={email ? "newEmail" : "newPhone"}
            label={t(email ? "account.newEmail" : "account.newPhone")}
            type={email ? "email" : "tel"}
            value={props.value}
            onChange={(event) => props.onValueChange(event.target.value)}
            placeholder={email ? "email@example.com" : "0901234567"}
            icon={email ? <Mail size={16} /> : <Phone size={16} />}
            required
          />
          <Button
            onClick={props.onRequest}
            className="w-full"
            loading={props.loading}
          >
            {t("account.sendOtp")}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {locale === "en"
              ? "Enter the OTP sent to "
              : t("account.enterOtpSentTo")}
            <span className="font-medium">{props.value}</span>
          </p>
          <Input
            id={`${props.kind}Otp`}
            label="OTP"
            value={props.otp}
            onChange={(event) =>
              props.onOtpChange(event.target.value.replace(/\D/g, ""))
            }
            maxLength={6}
            className="text-center tracking-[0.3em] font-mono"
            required
          />
          <Button
            onClick={props.onConfirm}
            className="w-full"
            loading={props.loading}
          >
            {t("common.confirm")}
          </Button>
        </div>
      )}
    </Modal>
  );
}

interface VerifyEmailModalProps {
  open: boolean;
  email?: string;
  otp: string;
  loading: boolean;
  onClose: () => void;
  onOtpChange: (value: string) => void;
  onConfirm: () => void;
}

export function VerifyEmailModal(props: VerifyEmailModalProps) {
  const { t, locale } = useTranslation();
  return (
    <Modal
      isOpen={props.open}
      onClose={props.onClose}
      title={t("account.verifyEmail")}
      size="sm"
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          {locale === "en"
            ? "Enter the OTP sent to "
            : t("account.enterOtpSentTo")}
          <span className="font-medium">{props.email}</span>
        </p>
        <Input
          id="verifyOtp"
          label="OTP"
          value={props.otp}
          onChange={(event) =>
            props.onOtpChange(event.target.value.replace(/\D/g, ""))
          }
          maxLength={6}
          className="text-center tracking-[0.3em] font-mono"
          required
        />
        <Button
          onClick={props.onConfirm}
          className="w-full"
          loading={props.loading}
        >
          {t("common.confirm")}
        </Button>
      </div>
    </Modal>
  );
}
