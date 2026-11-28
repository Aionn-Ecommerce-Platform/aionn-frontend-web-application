"use client";

import { useMemo, useState } from "react";
import {
  Shield,
  Key,
  Smartphone,
  Clock,
  AlertTriangle,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronUp,
  LogOut,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button, Badge, Switch } from "@/shared/ui";
import MemberPageLayout from "@/components/layout/MemberPageLayout";
import AuthGuard from "@/components/auth/AuthGuard";
import { MfaModal, PasswordModal, DisableMfaModal } from "./SecurityModals";
import { SecurityConfirmations } from "./SecurityConfirmations";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/hooks";
import { qk } from "@/lib/query-keys";
import { authService, securityService, userService } from "@/lib/services";
import { getErrorMessage } from "@/shared/lib/errors";
import { useAuthStore } from "@/stores/auth.store";
import { formatDateTime } from "@/shared/lib/utils";
import type { MfaSetup } from "@/types";
import {
  groupSessions,
  parseSessionUserAgent,
  type SessionGroup,
} from "@/lib/domain/security-sessions";

type AuditBadgeVariant = "success" | "warning" | "danger" | "info" | "default";

const AUDIT_EVENT_META: Record<
  string,
  { labelKey: string; variant: AuditBadgeVariant }
> = {
  PASSWORD_CHANGED: {
    labelKey: "security.auditEvents.passwordChanged",
    variant: "info",
  },
  PASSWORD_RESET_REQUESTED: {
    labelKey: "security.auditEvents.passwordResetRequested",
    variant: "warning",
  },
  PASSWORD_RESET_COMPLETED: {
    labelKey: "security.auditEvents.passwordResetCompleted",
    variant: "info",
  },
  MFA_SETUP_INITIATED: {
    labelKey: "security.auditEvents.mfaSetupInitiated",
    variant: "info",
  },
  MFA_ENABLED: {
    labelKey: "security.auditEvents.mfaEnabled",
    variant: "success",
  },
  MFA_DISABLED: {
    labelKey: "security.auditEvents.mfaDisabled",
    variant: "warning",
  },
  MFA_BACKUP_CODES_REGENERATED: {
    labelKey: "security.auditEvents.mfaBackupCodesRegenerated",
    variant: "info",
  },
  AGENT_SUSPENDED: {
    labelKey: "security.auditEvents.agentSuspended",
    variant: "danger",
  },
};

const AUDIT_WINDOW_DAYS = 5;

function SecurityInner() {
  const { t, locale } = useTranslation();
  const currentSessionId = useAuthStore((s) => s.tokens?.sessionId);
  const userStatus = useAuthStore((s) => s.user?.status);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const pendingDeletion = userStatus === "PENDING_DELETION";

  const qc = useQueryClient();
  const sessionQuery = useQuery({
    queryKey: qk.sessions,
    queryFn: () => authService.listSessions(),
  });
  const sessions = {
    data: sessionQuery.data,
    loading: sessionQuery.isLoading,
    refetch: () => qc.invalidateQueries({ queryKey: qk.sessions }),
  };
  const auditLogQuery = useQuery({
    queryKey: qk.auditLogs,
    queryFn: () => securityService.auditLogs(),
  });
  const auditLogs = {
    data: auditLogQuery.data,
    loading: auditLogQuery.isLoading,
  };
  const mfaQuery = useQuery({
    queryKey: qk.mfaState,
    queryFn: () => securityService.mfaState(),
  });
  const [auditCutoff] = useState(
    () => Date.now() - AUDIT_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  );
  const recentAuditLogs = useMemo(
    () =>
      (auditLogs.data ?? [])
        .filter((log) => new Date(log.timestamp).getTime() >= auditCutoff)
        .slice(0, 10),
    [auditLogs.data, auditCutoff],
  );

  const [auditOpen, setAuditOpen] = useState(false);
  const [pwdModalOpen, setPwdModalOpen] = useState(false);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);

  const [mfaModalOpen, setMfaModalOpen] = useState(false);
  const [mfaStep, setMfaStep] = useState<"password" | "scan">("password");
  const [mfaPassword, setMfaPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaSetup, setMfaSetup] = useState<MfaSetup | null>(null);
  const [mfaLoading, setMfaLoading] = useState(false);

  const [disableMfaOpen, setDisableMfaOpen] = useState(false);
  const [disableMfaPassword, setDisableMfaPassword] = useState("");
  const [disableMfaCode, setDisableMfaCode] = useState("");
  const [disableMfaLoading, setDisableMfaLoading] = useState(false);

  const [revokeGroupKey, setRevokeGroupKey] = useState<string | null>(null);
  const [revokeAllOpen, setRevokeAllOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [cancelDeletionOpen, setCancelDeletionOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showAllSessions, setShowAllSessions] = useState(false);

  async function handleChangePassword() {
    if (newPwd !== confirmPwd) {
      toast.error(t("security.passwordMismatch"));
      return;
    }
    setPwdLoading(true);
    try {
      await securityService.changePassword(currentPwd, newPwd);
      toast.success(t("security.passwordChanged"));
      setPwdModalOpen(false);
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setPwdLoading(false);
    }
  }

  async function handleMfaSetup() {
    setMfaLoading(true);
    try {
      const setup = await securityService.setupMfa(mfaPassword);
      setMfaSetup(setup);
      setMfaStep("scan");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setMfaLoading(false);
    }
  }

  async function handleMfaEnable() {
    setMfaLoading(true);
    try {
      await securityService.enableMfa(mfaPassword, mfaCode.trim());
      toast.success(t("security.mfaEnabled"));
      void qc.invalidateQueries({ queryKey: qk.mfaState });
      setMfaModalOpen(false);
      setMfaSetup(null);
      setMfaPassword("");
      setMfaCode("");
      setMfaStep("password");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setMfaLoading(false);
    }
  }

  async function handleMfaDisable() {
    setDisableMfaLoading(true);
    try {
      await securityService.disableMfa(
        disableMfaPassword,
        disableMfaCode.trim(),
      );
      toast.success(t("security.mfaDisabled"));
      void qc.invalidateQueries({ queryKey: qk.mfaState });
      setDisableMfaOpen(false);
      setDisableMfaPassword("");
      setDisableMfaCode("");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDisableMfaLoading(false);
    }
  }

  async function handleRevokeGroup(group: SessionGroup) {
    setActionLoading(true);
    try {
      const targets = group.all.filter((s) => s.sessionId !== currentSessionId);
      await Promise.all(
        targets.map((s) => authService.revokeSession(s.sessionId)),
      );
      toast.success(t("security.sessionRevoked"));
      void sessions.refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoading(false);
      setRevokeGroupKey(null);
    }
  }

  async function handleLogoutAll() {
    setActionLoading(true);
    try {
      const result = await authService.logoutAll();
      toast.success(
        t("security.logoutAllSuccess").replace(
          "{count}",
          String(result.revokedSessions),
        ),
      );
      void sessions.refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoading(false);
      setRevokeAllOpen(false);
    }
  }

  async function handleRequestDeletion(payload?: {
    password: string;
    mfaCode?: string;
  }) {
    setActionLoading(true);
    try {
      await userService.requestAccountDeletion(payload);

      toast.success(t("security.deleteRequested"));

      await refreshProfile();
      setDeleteAccountOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancelDeletion() {
    setActionLoading(true);
    try {
      await userService.cancelAccountDeletion();
      toast.success(t("security.deleteCancelled"));
      await refreshProfile();
      setDeleteAccountOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoading(false);
      setCancelDeletionOpen(false);
    }
  }

  const sessionGroups = groupSessions(sessions.data ?? [], currentSessionId);
  const visibleSessionGroups = showAllSessions
    ? sessionGroups
    : sessionGroups.slice(0, 3);

  return (
    <MemberPageLayout>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight">
          {t("security.title")}
        </h1>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-gray-400 shadow-xs p-6 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
                <Key size={20} />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-gray-950">
                  {t("security.passwordTitle")}
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                  {t("security.passwordDesc")}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPwdModalOpen(true)}
              className="rounded-xl border-gray-400 hover:border-brand hover:text-brand font-semibold shrink-0"
            >
              {t("security.changePassword")}
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-400 shadow-xs p-6 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
                <Smartphone size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-gray-950">
                    {t("security.mfaTitle")}
                  </h3>
                  {mfaQuery.data?.mfaEnabled && (
                    <Badge variant="success">{t("security.mfaEnabled")}</Badge>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                  {t("security.mfaDesc")}
                </p>
              </div>
            </div>
            {mfaQuery.isLoading ? (
              <Loader2 className="animate-spin text-brand shrink-0" size={20} />
            ) : (
              <Switch
                ariaLabel={t("security.mfaTitle")}
                checked={Boolean(mfaQuery.data?.mfaEnabled)}
                disabled={mfaLoading || disableMfaLoading}
                onChange={(checked) => {
                  if (checked) {
                    setMfaPassword("");
                    setMfaCode("");
                    setMfaStep("password");
                    setMfaSetup(null);
                    setMfaModalOpen(true);
                  } else {
                    setDisableMfaPassword("");
                    setDisableMfaCode("");
                    setDisableMfaOpen(true);
                  }
                }}
              />
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-400 shadow-xs p-6 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 border-b border-gray-100 pb-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
                <Shield size={20} />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-gray-950">
                  {t("security.sessionsTitle")}
                </h3>
                <p className="text-xs text-gray-500">
                  {t("security.sessionsDesc")}
                </p>
              </div>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setRevokeAllOpen(true)}
            >
              {t("security.logoutAll")}
            </Button>
          </div>
          {sessions.loading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="animate-spin text-brand" size={24} />
            </div>
          ) : sessions.data && sessions.data.length > 0 ? (
            <div>
              <div className="space-y-2">
                {visibleSessionGroups.map((g) => {
                  const device = parseSessionUserAgent(g.latest.userAgent);
                  const deviceLabel =
                    device.browser && device.os
                      ? t("security.deviceOnOs", {
                          browser: device.browser,
                          os: device.os,
                        })
                      : (device.browser ??
                        device.os ??
                        t("security.unknownDevice"));
                  const lastTs = g.latest.lastActiveAt ?? g.latest.createdAt;
                  return (
                    <div
                      key={g.key}
                      className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50/60 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {deviceLabel}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {t("security.lastActive", {
                            date: formatDateTime(
                              lastTs,
                              locale === "vi" ? "vi-VN" : "en-US",
                            ),
                          })}
                        </p>
                      </div>
                      {g.containsCurrent ? (
                        <Badge variant="success">
                          {t("security.currentSession")}
                        </Badge>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRevokeGroupKey(g.key)}
                          className="shrink-0 rounded-xl border-red-200 bg-white font-semibold text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                        >
                          <LogOut size={14} className="mr-1.5" />
                          {t("security.revoke")}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
              {sessionGroups.length > 3 && (
                <button
                  type="button"
                  onClick={() => setShowAllSessions((value) => !value)}
                  className="mt-3 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
                >
                  {showAllSessions ? (
                    <ChevronUp size={14} />
                  ) : (
                    <ChevronDown size={14} />
                  )}
                  {showAllSessions
                    ? t("security.showLessSessions")
                    : t("security.showMoreSessions", {
                        count: sessionGroups.length - 3,
                      })}
                </button>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500 py-2">
              {t("security.noSessions")}
            </p>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-400 shadow-xs overflow-hidden">
          <button
            type="button"
            onClick={() => setAuditOpen((value) => !value)}
            aria-expanded={auditOpen}
            className="flex w-full cursor-pointer items-center gap-3.5 p-6 text-left sm:p-7"
          >
            <ChevronDown
              size={18}
              className={`shrink-0 text-gray-400 transition-transform ${
                auditOpen ? "rotate-180" : ""
              }`}
            />
            <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
              <Clock size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm sm:text-base font-bold text-gray-950">
                {t("security.auditTitle")}
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                {t("security.auditDesc")}
              </p>
            </div>
            {!auditLogs.loading && (
              <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
                {t("security.auditCount", {
                  count: recentAuditLogs.length,
                })}
              </span>
            )}
          </button>
          {auditOpen && (
            <div className="border-t border-gray-100 px-6 pb-6 pt-5 sm:px-7 sm:pb-7">
              {auditLogs.loading ? (
                <div className="py-8 flex justify-center">
                  <Loader2 className="animate-spin text-brand" size={24} />
                </div>
              ) : recentAuditLogs.length > 0 ? (
                <div className="space-y-2">
                  {recentAuditLogs.map((log) => {
                    const meta = AUDIT_EVENT_META[log.eventType];
                    return (
                      <div
                        key={log.auditId}
                        className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50/60 px-4 py-3"
                      >
                        <Badge
                          variant={meta?.variant ?? "default"}
                          className="shrink-0"
                        >
                          {t(
                            meta?.labelKey ?? "security.auditEvents.unknown",
                          )}
                        </Badge>
                        <span className="shrink-0 text-xs text-gray-500">
                          {formatDateTime(
                            log.timestamp,
                            locale === "vi" ? "vi-VN" : "en-US",
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500 py-2">
                  {t("security.noRecentActivity")}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="bg-red-50 rounded-2xl border-2 border-red-200 shadow-[0_4px_24px_rgba(239,68,68,0.08)] p-6 sm:p-7 transition-all">
          <div className="flex items-center gap-3.5 mb-5 border-b border-red-200 pb-4">
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 ring-4 ring-red-50">
              <AlertTriangle size={20} className="stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-red-950">
                  {t("security.dangerTitle")}
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700 rounded-md border border-red-200">
                  Danger Zone
                </span>
              </div>
              <p className="text-xs sm:text-sm text-red-700 mt-0.5 font-medium">
                {t("security.dangerDesc")}
              </p>
            </div>
          </div>
          {pendingDeletion ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-900">
                {t("security.pendingDeletionTitle")}
              </p>
              <p className="text-xs text-amber-700 mt-1 mb-3">
                {t("security.pendingDeletionDesc")}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCancelDeletionOpen(true)}
                className="rounded-xl"
              >
                {t("security.cancelDeletion")}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-xl p-4 border border-red-100 shadow-2xs">
              <div>
                <p className="text-sm font-bold text-gray-900">
                  {t("security.deleteAccount")}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {t("security.deleteAccountDesc")}
                </p>
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setDeleteAccountOpen(true)}
                className="rounded-xl shrink-0 flex items-center gap-1.5 font-semibold shadow-xs"
              >
                <Trash2 size={15} />
                {t("security.requestDeletion")}
              </Button>
            </div>
          )}
        </div>
      </div>

      <PasswordModal
        open={pwdModalOpen}
        current={currentPwd}
        password={newPwd}
        confirmation={confirmPwd}
        loading={pwdLoading}
        onClose={() => setPwdModalOpen(false)}
        onCurrent={setCurrentPwd}
        onPassword={setNewPwd}
        onConfirmation={setConfirmPwd}
        onSubmit={handleChangePassword}
      />
      <MfaModal
        open={mfaModalOpen}
        step={mfaStep}
        password={mfaPassword}
        code={mfaCode}
        secret={mfaSetup?.secret}
        otpauthUri={mfaSetup?.otpauthUri}
        loading={mfaLoading}
        onClose={() => {
          setMfaModalOpen(false);
          setMfaStep("password");
          setMfaSetup(null);
          setMfaPassword("");
          setMfaCode("");
        }}
        onPassword={setMfaPassword}
        onCode={setMfaCode}
        onSetup={handleMfaSetup}
        onEnable={handleMfaEnable}
      />
      <DisableMfaModal
        open={disableMfaOpen}
        password={disableMfaPassword}
        code={disableMfaCode}
        loading={disableMfaLoading}
        onClose={() => {
          setDisableMfaOpen(false);
          setDisableMfaPassword("");
          setDisableMfaCode("");
        }}
        onPassword={setDisableMfaPassword}
        onCode={setDisableMfaCode}
        onConfirm={handleMfaDisable}
      />
      <SecurityConfirmations
        revokeOpen={revokeGroupKey !== null}
        revokeAllOpen={revokeAllOpen}
        deleteOpen={deleteAccountOpen}
        cancelDeleteOpen={cancelDeletionOpen}
        loading={actionLoading}
        mfaEnabled={Boolean(mfaQuery.data?.mfaEnabled)}
        closeRevoke={() => setRevokeGroupKey(null)}
        confirmRevoke={() => {
          if (!revokeGroupKey || !sessions.data) return;
          const group = groupSessions(sessions.data, currentSessionId).find(
            (item) => item.key === revokeGroupKey,
          );
          if (group) void handleRevokeGroup(group);
        }}
        closeRevokeAll={() => setRevokeAllOpen(false)}
        confirmRevokeAll={handleLogoutAll}
        closeDelete={() => setDeleteAccountOpen(false)}
        confirmDelete={handleRequestDeletion}
        closeCancelDelete={() => setCancelDeletionOpen(false)}
        confirmCancelDelete={handleCancelDeletion}
      />
    </MemberPageLayout>
  );
}

export default function SecurityPage() {
  return (
    <AuthGuard>
      <SecurityInner />
    </AuthGuard>
  );
}
