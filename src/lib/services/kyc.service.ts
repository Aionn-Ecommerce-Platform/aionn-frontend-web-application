import api, { requestEnvelope } from "@/shared/api";
import type {
  ApiEnvelope,
  KycProfile,
  KycStatus,
  KycVerificationSession,
} from "@/types";

export const kycService = {
  list() {
    return api.get<KycProfile[]>("/kyc");
  },
  get(kycId: string) {
    return api.get<KycProfile>(`/kyc/${kycId}`);
  },

  create(docType: string) {
    return api.post<KycProfile>("/kyc", { docType }, { idempotent: true });
  },

  generateSession(kycId: string) {
    return api.post<KycVerificationSession>(
      `/kyc/${kycId}/verification-session`,
      undefined,
      { idempotent: true },
    );
  },
};

export const adminKycService = {
  listByStatus(status: KycStatus, limit = 50) {
    return requestEnvelope<KycProfile[]>("/admin/kyc", {
      query: { status, limit },
    }) as Promise<ApiEnvelope<KycProfile[]>>;
  },
  get(kycId: string) {
    return api.get<KycProfile>(`/admin/kyc/${kycId}`);
  },
  markInReview(kycId: string, note?: string) {
    return api.post<KycProfile>(`/admin/kyc/${kycId}/in-review`, { note });
  },
  approve(kycId: string, note?: string) {
    return api.post<KycProfile>(`/admin/kyc/${kycId}/approve`, { note });
  },
  reject(kycId: string, reason: string) {
    return api.post<KycProfile>(`/admin/kyc/${kycId}/reject`, { reason });
  },
};
