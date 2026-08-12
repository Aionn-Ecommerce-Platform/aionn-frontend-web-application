"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Check, Loader2, Mail, Phone } from "lucide-react";
import toast from "react-hot-toast";
import { Button, Input, Avatar } from "@/shared/ui";
import Sidebar from "@/components/layout/Sidebar";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuthStore } from "@/stores/auth.store";
import { mediaService, uploadToCloudinary, userService } from "@/lib/services";
import { getErrorMessage } from "@/shared/lib/errors";
import { formatDate } from "@/shared/lib/utils";
import { useTranslation } from "@/hooks";
import {
  ChangeContactModal,
  VerifyEmailModal,
} from "./AccountVerificationModals";

function AccountInner() {
  const user = useAuthStore((s) => s.user);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const setUser = useAuthStore((s) => s.setUser);
  const { t, locale } = useTranslation();

  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState<string | null>(null);
  const displayName = draftName ?? user?.displayName ?? "";
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailStep, setEmailStep] = useState<"input" | "otp">("input");
  const [emailLoading, setEmailLoading] = useState(false);

  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneStep, setPhoneStep] = useState<"input" | "otp">("input");
  const [phoneLoading, setPhoneLoading] = useState(false);

  const [verifyEmailModalOpen, setVerifyEmailModalOpen] = useState(false);
  const [verifyOtp, setVerifyOtp] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      void refreshProfile();
    }
  }, [refreshProfile, user]);

  async function handleSaveDisplayName() {
    const trimmed = displayName.trim();
    if (!trimmed) {
      toast.error(
        locale === "en"
          ? "Display name cannot be empty"
          : t("account.displayNameRequired"),
      );
      return;
    }
    if (trimmed === user?.displayName) {
      setDraftName(null);
      setEditing(false);
      return;
    }
    setSavingName(true);
    try {
      const updated = await userService.updateDisplayName(trimmed);
      setUser(updated);
      toast.success(
        locale === "en"
          ? "Updated name successfully"
          : t("account.nameUpdateSuccess"),
      );
      setDraftName(null);
      setEditing(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingName(false);
    }
  }

  async function handleAvatarPicked(file: File) {
    setUploadingAvatar(true);
    try {
      const sig = await mediaService.generateAvatarSignature();
      const url = await uploadToCloudinary(file, sig);
      const updated = await userService.updateAvatar(url);
      setUser(updated);
      toast.success(
        locale === "en"
          ? "Updated avatar successfully"
          : t("account.avatarUpdateSuccess"),
      );
    } catch (err) {
      toast.error(getErrorMessage(err, t("account.avatarUploadFailed")));
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleEmailRequestOtp() {
    setEmailLoading(true);
    try {
      await userService.requestEmailChangeOtp(newEmail.trim());
      toast.success(
        locale === "en"
          ? "Verification code sent to new email"
          : t("account.emailOtpSent"),
      );
      setEmailStep("otp");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setEmailLoading(false);
    }
  }

  async function handleEmailConfirm() {
    setEmailLoading(true);
    try {
      const updated = await userService.confirmEmailChange(emailOtp.trim());
      setUser(updated);
      toast.success(t("account.emailChangeSuccess"));
      setEmailModalOpen(false);
      setEmailStep("input");
      setNewEmail("");
      setEmailOtp("");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setEmailLoading(false);
    }
  }

  async function handlePhoneRequestOtp() {
    setPhoneLoading(true);
    try {
      await userService.requestPhoneChangeOtp(newPhone.trim());
      toast.success(
        locale === "en"
          ? "Verification code sent to new number"
          : t("account.phoneOtpSent"),
      );
      setPhoneStep("otp");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setPhoneLoading(false);
    }
  }

  async function handlePhoneConfirm() {
    setPhoneLoading(true);
    try {
      const updated = await userService.confirmPhoneChange(phoneOtp.trim());
      setUser(updated);
      toast.success(
        locale === "en"
          ? "Changed phone number successfully"
          : t("account.phoneChangeSuccess"),
      );
      setPhoneModalOpen(false);
      setPhoneStep("input");
      setNewPhone("");
      setPhoneOtp("");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setPhoneLoading(false);
    }
  }

  async function handleVerifyEmailRequest() {
    setVerifyLoading(true);
    try {
      await userService.sendVerifyEmailOtp();
      toast.success(
        locale === "en"
          ? "Verification code sent to your email"
          : t("account.verifyEmailOtpSent"),
      );
      setVerifyEmailModalOpen(true);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setVerifyLoading(false);
    }
  }

  async function handleVerifyEmailConfirm() {
    setVerifyLoading(true);
    try {
      await userService.confirmVerifyEmailOtp(verifyOtp.trim());
      await refreshProfile();
      toast.success(
        locale === "en"
          ? "Verified email successfully"
          : t("account.emailVerifySuccess"),
      );
      setVerifyEmailModalOpen(false);
      setVerifyOtp("");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setVerifyLoading(false);
    }
  }

  return (
    <div className="member-page bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          <Sidebar />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">
              {t("account.information")}
            </h1>

            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <div className="flex items-center gap-4 mb-8">
                <div className="relative">
                  <Avatar
                    src={user?.avatarUrl ?? undefined}
                    alt={user?.displayName ?? user?.username ?? "U"}
                    size="xl"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-sm hover:bg-blue-700 disabled:opacity-50"
                    aria-label="Change avatar"
                  >
                    {uploadingAvatar ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Camera size={14} />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleAvatarPicked(f);
                      e.target.value = "";
                    }}
                  />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {user?.displayName ??
                      user?.username ??
                      t("account.userFallback")}
                  </h2>
                  {user?.createdAt && (
                    <p className="text-sm text-gray-500">
                      {locale === "en"
                        ? `Member since ${formatDate(user.createdAt)}`
                        : t("account.memberSince", {
                            date: formatDate(user.createdAt, locale),
                          })}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("account.displayName")}
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDraftName(e.target.value)}
                      disabled={!editing || savingName}
                      className="flex-1"
                    />
                    {editing ? (
                      <div className="flex gap-2 shrink-0">
                        <Button
                          onClick={handleSaveDisplayName}
                          loading={savingName}
                          className="h-[42px] px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shrink-0 border-none flex items-center justify-center"
                        >
                          {t("common.save")}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setDraftName(null);
                            setEditing(false);
                          }}
                          disabled={savingName}
                          className="h-[42px] px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 font-semibold rounded-lg shrink-0 flex items-center justify-center"
                        >
                          {t("common.cancel")}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        onClick={() => {
                          setDraftName(user?.displayName ?? "");
                          setEditing(true);
                        }}
                        className="h-[42px] px-4 shrink-0 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold rounded-lg flex items-center justify-center"
                      >
                        {t("common.edit")}
                      </Button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("account.email") || "Email"}
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="email"
                      value={user?.email ?? t("account.none")}
                      disabled
                      icon={<Mail size={16} />}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      onClick={() => setEmailModalOpen(true)}
                      className="h-[42px] px-4 shrink-0 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold rounded-lg flex items-center justify-center"
                    >
                      {user?.email
                        ? locale === "en"
                          ? "Change"
                          : t("account.change")
                        : locale === "en"
                          ? "Add"
                          : t("common.add")}
                    </Button>
                  </div>
                  {user?.email && user.emailVerifiedAt ? (
                    <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
                      <Check size={12} /> {t("account.verified")}
                    </p>
                  ) : user?.email ? (
                    <button
                      type="button"
                      onClick={handleVerifyEmailRequest}
                      disabled={verifyLoading}
                      className="mt-1 text-xs text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                    >
                      {locale === "en"
                        ? "Send verification OTP"
                        : t("account.sendVerifyEmailOtp")}
                    </button>
                  ) : null}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("account.phone")}
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="phone"
                      value={user?.phone ?? t("account.none")}
                      disabled
                      icon={<Phone size={16} />}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      onClick={() => setPhoneModalOpen(true)}
                      className="h-[42px] px-4 shrink-0 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold rounded-lg flex items-center justify-center"
                    >
                      {user?.phone
                        ? locale === "en"
                          ? "Change"
                          : t("account.change")
                        : locale === "en"
                          ? "Add"
                          : t("common.add")}
                    </Button>
                  </div>
                  {!user?.phone ? null : user.phoneVerifiedAt ? (
                    <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
                      <Check size={12} /> {t("account.verified")}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-amber-600">
                      {locale === "en"
                        ? "Phone number not verified."
                        : t("account.phoneNotVerified")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ChangeContactModal
        kind="email"
        open={emailModalOpen}
        step={emailStep}
        value={newEmail}
        otp={emailOtp}
        loading={emailLoading}
        onClose={() => {
          setEmailModalOpen(false);
          setEmailStep("input");
        }}
        onValueChange={setNewEmail}
        onOtpChange={setEmailOtp}
        onRequest={handleEmailRequestOtp}
        onConfirm={handleEmailConfirm}
      />
      <ChangeContactModal
        kind="phone"
        open={phoneModalOpen}
        step={phoneStep}
        value={newPhone}
        otp={phoneOtp}
        loading={phoneLoading}
        onClose={() => {
          setPhoneModalOpen(false);
          setPhoneStep("input");
        }}
        onValueChange={setNewPhone}
        onOtpChange={setPhoneOtp}
        onRequest={handlePhoneRequestOtp}
        onConfirm={handlePhoneConfirm}
      />
      <VerifyEmailModal
        open={verifyEmailModalOpen}
        email={user?.email ?? undefined}
        otp={verifyOtp}
        loading={verifyLoading}
        onClose={() => setVerifyEmailModalOpen(false)}
        onOtpChange={setVerifyOtp}
        onConfirm={handleVerifyEmailConfirm}
      />{" "}
    </div>
  );
}

export default function AccountPage() {
  return (
    <AuthGuard>
      <AccountInner />
    </AuthGuard>
  );
}
