export type UserStatus = "ACTIVE" | "SUSPENDED" | "LOCKED" | "PENDING_DELETION";

export interface UserProfile {
  userId: string;
  email: string | null;
  phone: string | null;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  roles: string[];
  status: UserStatus;
  emailVerifiedAt: string | null;
  phoneVerifiedAt: string | null;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string | null;
  expiresAt: string;
  sessionExpiresAt: string;
  sessionId: string;
  userId: string;
}

export interface AuthSession {
  sessionId: string;
  userId: string;
  status: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  lastActiveAt: string | null;
  expiresAt: string;
}

export type AddressType = "HOME" | "OFFICE";

export interface Address {
  addressId: string;
  contactName: string;
  phone: string;
  provinceCode: string;
  provinceName: string | null;
  districtCode: string;
  districtName: string | null;
  wardCode: string;
  wardName: string | null;
  detailAddress: string;
  fullAddress: string;
  type: AddressType;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GeographyItem {
  code: string;
  name: string;
  nameEn: string | null;
}

export type KycStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "IN_REVIEW"
  | "APPROVED"
  | "REJECTED";

export interface KycProfile {
  kycId: string;
  userId: string;
  docType: string;
  blobUrl: string | null;
  status: KycStatus;
  provider: string | null;
  providerApplicantId: string | null;
  providerLevelName: string | null;
  providerReviewStatus: string | null;
  reviewerId: string | null;
  reviewNote: string | null;
  decisionAdminId: string | null;
  rejectReason: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
}

export interface KycVerificationSession {
  kycId: string;
  provider: string;
  providerApplicantId: string;
  levelName: string;
  sdkAccessToken: string;
  expiresInSeconds: number;
  sandbox: boolean;
}

export interface MfaSetup {
  secret: string;
  otpauthUri: string;
  issuer: string;
  accountName: string;
}

export interface MfaState {
  mfaEnabled: boolean;
  backupCodes: string[];
}

export interface SecurityAuditLog {
  auditId: string;
  eventType: string;
  description: string | null;
  ipAddress: string | null;
  deviceId: string | null;
  timestamp: string;
}

export interface NotificationSettings {
  order: boolean;
  promotion: boolean;
  chat: boolean;
  system: boolean;
}

export interface AiPrivacySettings {
  personalizedRecommendation: boolean;
}

export interface UserPreference {
  userId: string;
  language: string | null;
  currency: string | null;
  timezone: string | null;
  theme: string | null;
  notifications: NotificationSettings;
  aiPrivacy: AiPrivacySettings;
  updatedAt: string | null;
}

export interface UploadSignature {
  signature: string;

  timestamp: string;
  apiKey: string;
  cloudName: string;
  uploadUrl: string;
  folder: string;
}

export interface RegistrationSession {
  regId: string;
  resendAvailableAt: string;
  expiredAt: string;
  otpCode?: string | null;
}

export interface VerifyOtpResult {
  regId: string;
  verificationToken: string;
}

export interface DeletionRequest {
  requestId: string;
  status: string;
  requestedAt: string;
  scheduledDeletionAt: string;
}

export interface DataExportRequest {
  requestId: string;
  status: string;
  requestedAt: string;
}
