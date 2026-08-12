import api from "@/shared/api";
import type {
  AuthSession,
  AuthTokens,
  RegistrationSession,
  VerifyOtpResult,
} from "@/types";

interface LoginRequest {
  identity: string;
  password: string;
  mfaCode?: string;
}

interface SocialAuthRequest {
  provider: "google" | "facebook";
  providerToken: string;
}

export const authService = {
  login(body: LoginRequest) {
    return api.post<AuthTokens>("/auth/login", body, { anonymous: true });
  },

  socialLogin(body: SocialAuthRequest) {
    return api.post<AuthTokens>("/auth/social-login", body, {
      anonymous: true,
    });
  },

  refresh() {
    return api.post<AuthTokens>("/auth/refresh", {}, { anonymous: true });
  },

  logout() {
    return api.post<void>("/auth/logout");
  },

  logoutAll() {
    return api.post<{ revokedSessions: number }>("/auth/logout-all");
  },

  listSessions() {
    return api.get<AuthSession[]>("/auth/sessions");
  },

  revokeSession(sessionId: string) {
    return api.delete<void>(`/auth/sessions/${sessionId}`);
  },

  linkSocial(body: { provider: string; providerToken: string }) {
    return api.post<{
      provider: string;
      providerUserId: string;
      linkedAt: string;
    }>("/auth/social-links", body, { idempotent: true });
  },

  unlinkSocial(provider: string) {
    return api.delete<void>(`/auth/social-links/${provider}`);
  },
};

interface InitiateRegistrationRequest {
  phoneNumber: string;
  captchaToken: string;
}

interface CompleteRegistrationRequest {
  password: string;
  username: string;
  verificationToken: string;
}

export const registrationService = {
  initiate(body: InitiateRegistrationRequest) {
    return api.post<RegistrationSession>("/registrations/initiate", body, {
      anonymous: true,
      idempotent: true,
    });
  },
  verifyOtp(regId: string, otpCode: string) {
    return api.post<VerifyOtpResult>(
      `/registrations/${regId}/verify-otp`,
      { otpCode },
      { anonymous: true },
    );
  },

  resendOtp(regId: string) {
    return api.post<RegistrationSession>(
      `/registrations/${regId}/resend-otp`,
      {},
      { anonymous: true, idempotent: true },
    );
  },
  complete(regId: string, body: CompleteRegistrationRequest) {
    return api.post<AuthTokens>(`/registrations/${regId}/complete`, body, {
      anonymous: true,
    });
  },
};
