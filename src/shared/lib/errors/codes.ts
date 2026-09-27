const ERROR_CODE_MESSAGE_KEYS: Record<string, string> = {
  IDENTITY_001: "auth.phoneAlreadyExists",
  IDENTITY_002: "auth.emailAlreadyExists",
  IDENTITY_005: "auth.usernameAlreadyExists",
  IDENTITY_006: "auth.phoneInvalid",
  IDENTITY_101: "auth.otpInvalid",
  IDENTITY_102: "auth.otpExpired",
  IDENTITY_103: "auth.otpAttemptsExceeded",
  IDENTITY_104: "auth.otpResendTooSoon",
  IDENTITY_201: "auth.userNotFound",
  IDENTITY_203: "auth.invalidCredentials",
  IDENTITY_204: "auth.userInactive",
  IDENTITY_211: "auth.otpRequired",
  IDENTITY_217: "auth.emailVerificationNotFound",
  IDENTITY_218: "auth.emailChangeNotFound",
  IDENTITY_219: "auth.phoneChangeNotFound",
};

export function getMessageKeyForErrorCode(
  errorCode: string | undefined,
): string | undefined {
  if (!errorCode) return undefined;
  return ERROR_CODE_MESSAGE_KEYS[errorCode];
}
