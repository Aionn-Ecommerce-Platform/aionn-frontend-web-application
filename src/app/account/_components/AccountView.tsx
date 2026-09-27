"use client";

import { useEffect, useState } from "react";
import { Camera, Check, Pencil } from "lucide-react";
import toast from "react-hot-toast";
import { Avatar } from "@/shared/ui";
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
import { EditProfileModal } from "./EditProfileModal";

function AccountInner() {
  const user = useAuthStore((s) => s.user);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const setUser = useAuthStore((s) => s.setUser);
  const { t, locale } = useTranslation();

  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

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
    void refreshProfile();
  }, [refreshProfile]);

  async function handleSaveProfile(data: {
    displayName?: string;
    avatarFile?: File;
  }) {
    setProfileSaving(true);
    try {
      if (data.avatarFile) {
        const sig = await mediaService.generateAvatarSignature();
        const url = await uploadToCloudinary(data.avatarFile, sig);
        const updated = await userService.updateAvatar(url);
        setUser(updated);
      }
      if (
        data.displayName !== undefined &&
        data.displayName.trim() !== (user?.displayName ?? "")
      ) {
        const updated = await userService.updateDisplayName(
          data.displayName.trim(),
        );
        setUser(updated);
      }
      await refreshProfile();
      toast.success(t("account.editProfileSuccess"));
      setEditProfileOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setProfileSaving(false);
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

            <div className="bg-white rounded-sm border border-gray-100 p-6">
              {/* Header profile info */}
              <div className="flex items-center gap-4 mb-8">
                <button
                  type="button"
                  onClick={() => setEditProfileOpen(true)}
                  className="relative group rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer"
                  title={t("account.clickToEditProfile")}
                >
                  <Avatar
                    src={user?.avatarUrl ?? undefined}
                    alt={user?.displayName ?? user?.username ?? "U"}
                    size="2xl"
                    className="border-2 border-gray-300 shadow-sm"
                  />
                  <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                    <Camera size={24} />
                  </div>
                </button>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {user?.displayName ??
                      user?.username ??
                      t("account.userFallback")}
                  </h2>
                  {user?.createdAt && (
                    <p className="text-sm text-gray-500 mt-0.5">
                      {locale === "en"
                        ? `Member since ${formatDate(user.createdAt)}`
                        : t("account.memberSince", {
                            date: formatDate(user.createdAt, locale),
                          })}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => setEditProfileOpen(true)}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors mt-1.5 cursor-pointer font-medium group/edit"
                  >
                    <Pencil
                      size={12}
                      className="text-gray-400 group-hover/edit:text-gray-600 transition-colors"
                    />
                    <span>{t("account.editProfile")}</span>
                  </button>
                </div>
              </div>

              {/* Profile fields: 4 rows, label and value on same row */}
              <div className="space-y-4 pt-6 border-t border-gray-100">
                {/* Username field */}
                <div className="flex items-center">
                  <span className="w-36 sm:w-44 shrink-0 text-sm text-gray-500">
                    {t("account.username")}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {user?.username ?? t("account.none")}
                  </span>
                </div>

                {/* Display name field */}
                <div className="flex items-center">
                  <span className="w-36 sm:w-44 shrink-0 text-sm text-gray-500">
                    {t("account.displayName")}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {user?.displayName ?? user?.username ?? t("account.none")}
                  </span>
                </div>

                {/* Email field */}
                <div className="flex items-center">
                  <span className="w-36 sm:w-44 shrink-0 text-sm text-gray-500">
                    {t("account.email") || "Email"}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {user?.email ?? t("account.none")}
                    </span>
                    {user?.email && user.emailVerifiedAt ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-xs font-medium">
                        <Check size={11} /> {t("account.verified")}
                      </span>
                    ) : user?.email ? (
                      <button
                        type="button"
                        onClick={handleVerifyEmailRequest}
                        disabled={verifyLoading}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium hover:underline disabled:opacity-50 cursor-pointer"
                      >
                        {t("account.sendVerifyEmailOtp")}
                      </button>
                    ) : null}
                  </div>
                </div>

                {/* Phone number field */}
                <div className="flex items-center">
                  <span className="w-36 sm:w-44 shrink-0 text-sm text-gray-500">
                    {t("account.phone")}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {user?.phone ?? t("account.none")}
                    </span>
                    {!user?.phone ? null : user.phoneVerifiedAt ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-xs font-medium">
                        <Check size={11} /> {t("account.verified")}
                      </span>
                    ) : (
                      <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-xs font-medium">
                        {locale === "en"
                          ? "Phone number not verified."
                          : t("account.phoneNotVerified")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Change Email Modal */}
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
        onBack={() => setEmailStep("input")}
        onValueChange={setNewEmail}
        onOtpChange={setEmailOtp}
        onRequest={handleEmailRequestOtp}
        onConfirm={handleEmailConfirm}
      />

      {/* Change Phone Modal */}
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
        onBack={() => setPhoneStep("input")}
        onValueChange={setNewPhone}
        onOtpChange={setPhoneOtp}
        onRequest={handlePhoneRequestOtp}
        onConfirm={handlePhoneConfirm}
      />

      {/* Verify Email Modal */}
      <VerifyEmailModal
        open={verifyEmailModalOpen}
        email={user?.email ?? undefined}
        otp={verifyOtp}
        loading={verifyLoading}
        onClose={() => setVerifyEmailModalOpen(false)}
        onOtpChange={setVerifyOtp}
        onConfirm={handleVerifyEmailConfirm}
      />

      {/* Edit Profile Modal (Avatar + Name + contact change entry points) */}
      <EditProfileModal
        open={editProfileOpen}
        onClose={() => setEditProfileOpen(false)}
        user={user}
        loading={profileSaving}
        onSave={handleSaveProfile}
        onOpenEmailModal={() => {
          setEditProfileOpen(false);
          setEmailModalOpen(true);
        }}
        onOpenPhoneModal={() => {
          setEditProfileOpen(false);
          setPhoneModalOpen(true);
        }}
      />
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
