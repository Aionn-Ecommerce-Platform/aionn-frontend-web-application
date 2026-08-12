"use client";

import { useState } from "react";
import {
  Shield,
  Key,
  Smartphone,
  Clock,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button, Badge, ConfirmDialog } from "@/shared/ui";
import Sidebar from "@/components/layout/Sidebar";
import AuthGuard from "@/components/auth/AuthGuard";
import { MfaModal, PasswordModal } from "./SecurityModals";
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
  type SessionGroup,
} from "@/lib/domain/security-sessions";

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

  const [revokeGroupKey, setRevokeGroupKey] = useState<string | null>(null);
  const [revokeAllOpen, setRevokeAllOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [cancelDeletionOpen, setCancelDeletionOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

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

  async function handleRequestDeletion() {
    setActionLoading(true);
    try {
      await userService.requestAccountDeletion();
      toast.success(t("security.deleteRequested"));

      await refreshProfile();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoading(false);
      setDeleteAccountOpen(false);
    }
  }

  async function handleCancelDeletion() {
    setActionLoading(true);
    try {
      await userService.cancelAccountDeletion();
      toast.success(t("security.deleteCancelled"));
      await refreshProfile();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoading(false);
      setCancelDeletionOpen(false);
    }
  }

  return (
    <div className="member-page bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          <Sidebar />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">
              {t("security.title")}
            </h1>

            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Key size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">
                        {t("security.passwordTitle")}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {t("security.passwordDesc")}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPwdModalOpen(true)}
                  >
                    {t("security.changePassword")}
                  </Button>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Smartphone size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">
                        {t("security.mfaTitle")}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {t("security.mfaDesc")}
                      </p>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => setMfaModalOpen(true)}>
                    {t("security.enableNow")}
                  </Button>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Shield size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">
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
                    <Loader2 className="animate-spin text-blue-600" size={20} />
                  </div>
                ) : sessions.data && sessions.data.length > 0 ? (
                  <div className="space-y-3">
                    {groupSessions(sessions.data, currentSessionId).map((g) => {
                      const olderCount = g.all.length - 1;
                      const lastTs =
                        g.latest.lastActiveAt ?? g.latest.createdAt;
                      return (
                        <div
                          key={g.key}
                          className="flex items-center justify-between py-2 border-t border-gray-50"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {g.latest.userAgent?.slice(0, 60) ||
                                t("security.unknownDevice")}
                            </p>
                            <p className="text-xs text-gray-500">
                              {g.latest.ipAddress ?? "—"} •{" "}
                              {formatDateTime(
                                lastTs,
                                locale === "vi" ? "vi-VN" : "en-US",
                              )}
                              {olderCount > 0 && (
                                <>
                                  {" "}
                                  •{" "}
                                  <span className="text-gray-400">
                                    {t("security.olderSessions").replace(
                                      "{count}",
                                      String(olderCount),
                                    )}
                                  </span>
                                </>
                              )}
                            </p>
                          </div>
                          {g.containsCurrent ? (
                            <Badge variant="success">
                              {t("security.currentSession")}
                            </Badge>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setRevokeGroupKey(g.key)}
                            >
                              {t("security.revoke")}
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 py-2">
                    {t("security.noSessions")}
                  </p>
                )}
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Clock size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">
                      {t("security.auditTitle")}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {t("security.auditDesc")}
                    </p>
                  </div>
                </div>
                {auditLogs.loading ? (
                  <div className="py-8 flex justify-center">
                    <Loader2 className="animate-spin text-blue-600" size={20} />
                  </div>
                ) : auditLogs.data && auditLogs.data.length > 0 ? (
                  <div className="space-y-3">
                    {auditLogs.data.slice(0, 10).map((log) => (
                      <div
                        key={log.auditId}
                        className="flex items-center justify-between py-2 border-t border-gray-50"
                      >
                        <span className="text-sm text-gray-700">
                          {log.eventType}
                          {log.description ? ` — ${log.description}` : ""}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDateTime(
                            log.timestamp,
                            locale === "vi" ? "vi-VN" : "en-US",
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 py-2">
                    {t("security.noActivity")}
                  </p>
                )}
              </div>

              <div className="bg-white rounded-xl border border-red-100 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-50 rounded-lg">
                    <AlertTriangle size={20} className="text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-red-900">
                      {t("security.dangerTitle")}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {t("security.dangerDesc")}
                    </p>
                  </div>
                </div>
                {pendingDeletion ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm font-medium text-amber-900">
                      {t("security.pendingDeletionTitle")}
                    </p>
                    <p className="text-xs text-amber-700 mt-1 mb-3">
                      {t("security.pendingDeletionDesc")}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCancelDeletionOpen(true)}
                    >
                      {t("security.cancelDeletion")}
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        {t("security.deleteAccount")}
                      </p>
                      <p className="text-xs text-gray-500">
                        {t("security.deleteAccountDesc")}
                      </p>
                    </div>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setDeleteAccountOpen(true)}
                    >
                      {t("security.requestDeletion")}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
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
        loading={mfaLoading}
        onClose={() => {
          setMfaModalOpen(false);
          setMfaStep("password");
          setMfaSetup(null);
        }}
        onPassword={setMfaPassword}
        onCode={setMfaCode}
        onSetup={handleMfaSetup}
        onEnable={handleMfaEnable}
      />{" "}
      <ConfirmDialog
        isOpen={revokeGroupKey !== null}
        onClose={() => setRevokeGroupKey(null)}
        onConfirm={() => {
          if (!revokeGroupKey || !sessions.data) return;
          const group = groupSessions(sessions.data, currentSessionId).find(
            (g) => g.key === revokeGroupKey,
          );
          if (group) void handleRevokeGroup(group);
        }}
        title={t("security.revokeSessionTitle")}
        message={t("security.revokeSessionMessage")}
        confirmLabel={t("security.revoke")}
        loading={actionLoading}
      />
      <SecurityConfirmations
        revokeOpen={revokeGroupKey !== null}
        revokeAllOpen={revokeAllOpen}
        deleteOpen={deleteAccountOpen}
        cancelDeleteOpen={cancelDeletionOpen}
        loading={actionLoading}
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
      />{" "}
    </div>
  );
}

export default function SecurityPage() {
  return (
    <AuthGuard>
      <SecurityInner />
    </AuthGuard>
  );
}
