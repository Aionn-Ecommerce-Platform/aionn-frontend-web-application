import api from "@/shared/api";
import type { MfaSetup, MfaState, SecurityAuditLog } from "@/types";

export const securityService = {
  changePassword(currentPassword: string, newPassword: string) {
    return api.put<void>("/security/password", {
      currentPassword,
      newPassword,
    });
  },

  requestPasswordReset(identity: string) {
    return api.post<{ message: string }>(
      "/security/password-reset-requests",
      { identity },
      { anonymous: true, idempotent: true },
    );
  },

  completePasswordReset(token: string, newPassword: string) {
    return api.post<void>(
      "/security/password-reset",
      { token, newPassword },
      { anonymous: true, idempotent: true },
    );
  },
  setupMfa(password: string) {
    return api.post<MfaSetup>("/security/mfa/setup", { password });
  },
  enableMfa(password: string, mfaCode: string) {
    return api.post<MfaState>("/security/mfa/enable", { password, mfaCode });
  },
  disableMfa(password: string, mfaCode: string) {
    return api.post<MfaState>("/security/mfa/disable", { password, mfaCode });
  },
  regenerateBackupCodes(password: string, mfaCode: string) {
    return api.post<{ backupCodes: string[] }>("/security/mfa/backup-codes", {
      password,
      mfaCode,
    });
  },
  auditLogs() {
    return api.get<SecurityAuditLog[]>("/security/audit-logs");
  },
};
