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

interface RawConsentResponse {
  consentId: string;
  consentType: ConsentResponse["consentType"];
  version: string | null;
  agreedAt: string | null;
  revokedAt: string | null;
  ipAddress: string | null;
}

function normalizeConsent(raw: RawConsentResponse): ConsentResponse {
  return {
    consentId: raw.consentId,
    userId: "",
    consentType: raw.consentType,
    agreed: Boolean(raw.agreedAt) && !raw.revokedAt,
    version: raw.version,
    clientIp: raw.ipAddress,
    agreedAt: raw.agreedAt ?? "",
  };
}

export const consentService = {
  async getMyConsents() {
    const rows = await api.get<RawConsentResponse[]>("/consents");
    return (rows ?? []).map(normalizeConsent);
  },
  async agreeTerms(version: string) {
    const raw = await api.post<RawConsentResponse | undefined>(
      "/consents/terms",
      { version },
    );
    return raw ? normalizeConsent(raw) : undefined;
  },
  async agreePrivacy(version: string) {
    const raw = await api.post<RawConsentResponse | undefined>(
      "/consents/privacy",
      { version },
    );
    return raw ? normalizeConsent(raw) : undefined;
  },
  async updateMarketing(agreed: boolean) {
    const raw = await api.patch<RawConsentResponse | undefined>(
      "/consents/marketing",
      {
        subscribed: agreed,
      },
    );
    return raw ? normalizeConsent(raw) : undefined;
  },
};
