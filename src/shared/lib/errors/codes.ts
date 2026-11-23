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
  PRM_206: "myVouchers.dailyClaimLimitReached",
  PRM_207: "myVouchers.walletLimitReached",
  CATALOG_310: "merchant.productEdit.errorLastVariant",
  CATALOG_311: "merchant.productList.errorHasOpenOrders",
  CATALOG_312: "merchant.productList.errorFlashSale",
  ORD_111: "merchant.orders.errorShippingQuote",
};

export function getMessageKeyForErrorCode(
  errorCode: string | undefined,
): string | undefined {
  if (!errorCode) return undefined;
  return ERROR_CODE_MESSAGE_KEYS[errorCode];
}
