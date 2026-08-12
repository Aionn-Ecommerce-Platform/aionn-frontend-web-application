import api from "@/shared/api";

export interface ConsentResponse {
  consentId: string;
  userId: string;
  consentType: "TERMS_OF_SERVICE" | "PRIVACY_POLICY" | "MARKETING";
  agreed: boolean;
  version: string | null;
  clientIp: string | null;
  agreedAt: string;
}

export const consentService = {
  getMyConsents() {
    return api.get<ConsentResponse[]>("/consents");
  },
  agreeTerms(version: string) {
    return api.post<ConsentResponse>("/consents/terms", { version });
  },
  agreePrivacy(version: string) {
    return api.post<ConsentResponse>("/consents/privacy", { version });
  },
  updateMarketing(agreed: boolean) {
    return api.patch<ConsentResponse>("/consents/marketing", { agreed });
  },
};
