const ERROR_CODE_MESSAGE_KEYS: Record<string, string> = {
  IDENTITY_203: "auth.invalidCredentials",
};

export function getMessageKeyForErrorCode(
  errorCode: string | undefined,
): string | undefined {
  if (!errorCode) return undefined;
  return ERROR_CODE_MESSAGE_KEYS[errorCode];
}
