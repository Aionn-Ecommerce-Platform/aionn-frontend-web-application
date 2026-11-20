"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Camera, Check, Pencil, Store } from "lucide-react";
import toast from "react-hot-toast";
import { Avatar, Button } from "@/shared/ui";
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
import AddressBook from "./AddressBook";

function AccountInner() {
  const user = useAuthStore((s) => s.user);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const setUser = useAuthStore((s) => s.setUser);
  const { t, locale } = useTranslation();
  const roleCodes = (user?.roles ?? []).map((role) =>
    role.replace(/^ROLE_/, ""),
  );
  const isMerchant = roleCodes.includes("MERCHANT");

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
        const trimmed = data.displayName.trim();
        if (!trimmed) {
          toast.error(t("account.nameRequired"));
          return;
        }
        const updated = await userService.updateDisplayName(trimmed);
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
    <div className="member-page bg-transparent min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="flex gap-8">
          <Sidebar />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-6">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight">
                {t("account.information")}
              </h1>
              <Button
                size="sm"
                onClick={() => setEditProfileOpen(true)}
                className="font-semibold rounded-xl shadow-xs shrink-0"
              >
                <Pencil size={16} className="mr-1" />
                {t("account.editProfile")}
              </Button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-400 p-6 sm:p-8 shadow-xs">
              {/* Header profile info */}
              <div className="flex items-center gap-5 mb-8">
                <button
                  type="button"
                  onClick={() => setEditProfileOpen(true)}
                  className="relative group rounded-full focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 cursor-pointer transition-transform hover:scale-102"
                  title={t("account.clickToEditProfile")}
                >
                  <Avatar
                    src={user?.avatarUrl ?? undefined}
                    alt={user?.displayName ?? user?.username ?? "U"}
                    size="2xl"
                    className="border-2 border-brand/20 shadow-sm"
                  />
                  <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white backdrop-blur-2xs">
                    <Camera size={22} />
                  </div>
                </button>
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-gray-950">
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
                  {roleCodes.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {roleCodes.map((code) => {
                        const isAdmin =
                          code === "CS_ADMIN" || code === "SYSTEM_ADMIN";
                        const labelKey = `account.roles.${code}`;
                        const label = t(labelKey);
                        return (
                          <span
                            key={code}
                            className={
                              isAdmin
                                ? "inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700"
                                : "inline-flex items-center rounded-full border border-brand/20 bg-brand/10 px-2.5 py-0.5 text-[11px] font-bold text-brand"
                            }
                          >
                            {label === labelKey ? code : label}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Profile fields: 4 rows, label and value on same row */}
              <div className="space-y-5 pt-6 border-t border-gray-100">
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
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-sm font-semibold text-gray-900">
                      {user?.email ?? t("account.none")}
                    </span>
                    {user?.email && user.emailVerifiedAt ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full font-semibold">
                        <Check size={12} /> {t("account.verified")}
                      </span>
                    ) : user?.email ? (
                      <button
                        type="button"
                        onClick={handleVerifyEmailRequest}
                        disabled={verifyLoading}
                        className="text-xs text-brand hover:text-brand-strong font-semibold hover:underline disabled:opacity-50 cursor-pointer"
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
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-sm font-semibold text-gray-900">
                      {user?.phone ?? t("account.none")}
                    </span>
                    {!user?.phone ? null : user.phoneVerifiedAt ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full font-semibold">
                        <Check size={12} /> {t("account.verified")}
                      </span>
                    ) : (
                      <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 rounded-full font-semibold">
                        {locale === "en"
                          ? "Phone number not verified."
                          : t("account.phoneNotVerified")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {!isMerchant && (
              <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-gray-400 bg-white p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between sm:p-7">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center text-brand">
                    <Store size={30} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-950">
                      {t("account.sellTitle")}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {t("account.sellDesc")}
                    </p>
                  </div>
                </div>
                <Link href="/merchant/register" className="shrink-0">
                  <Button className="h-10 rounded-xl border border-purple-500/40 bg-gradient-to-r from-purple-700 via-fuchsia-600 to-indigo-700 px-5 text-sm font-bold text-white shadow-md shadow-purple-600/20 transition-all hover:from-purple-600 hover:via-fuchsia-500 hover:to-indigo-600">
                    {t("account.sellCta")}
                  </Button>
                </Link>
              </div>
            )}

            <div className="mt-6">
              <AddressBook />
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
