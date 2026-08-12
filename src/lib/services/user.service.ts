import api from "@/shared/api";
import type { DataExportRequest, DeletionRequest, UserProfile } from "@/types";

export const userService = {
  getMyProfile() {
    return api.get<UserProfile>("/users/me");
  },

  updateDisplayName(displayName: string) {
    return api.patch<UserProfile>("/users/me/display-name", { displayName });
  },

  updateAvatar(avatarUrl: string) {
    return api.patch<UserProfile>("/users/me/avatar", { avatarUrl });
  },

  sendVerifyEmailOtp() {
    return api.post<void>("/users/me/verify-email/otp");
  },

  confirmVerifyEmailOtp(otpCode: string) {
    return api.post<void>("/users/me/verify-email/confirm", { otpCode });
  },

  requestEmailChangeOtp(newEmail: string) {
    return api.post<void>("/users/me/email-change/otp", { newEmail });
  },

  confirmEmailChange(otpCode: string) {
    return api.post<UserProfile>("/users/me/email-change/confirm", { otpCode });
  },

  requestPhoneChangeOtp(newPhone: string) {
    return api.post<void>("/users/me/phone-change/otp", { newPhone });
  },

  confirmPhoneChange(otpCode: string) {
    return api.post<UserProfile>("/users/me/phone-change/confirm", { otpCode });
  },

  requestAccountDeletion() {
    return api.post<DeletionRequest>("/users/me/deletion-requests", undefined, {
      idempotent: true,
    });
  },

  cancelAccountDeletion() {
    return api.delete<void>("/users/me/deletion-requests");
  },

  requestDataExport() {
    return api.post<DataExportRequest>("/users/me/data-exports", undefined, {
      idempotent: true,
    });
  },
};
