"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Loader2,
  Mail,
  Phone,
  User,
  ShieldAlert,
  Unlock,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button, ConfirmDialog, Modal } from "@/shared/ui";
import { AdminHeader, AdminPill } from "@/features/admin";
import AuthGuard from "@/components/auth/AuthGuard";
import { adminUserService } from "@/lib/services";
import { getErrorMessage } from "@/shared/lib/errors";
import { formatDateTime } from "@/shared/lib/utils";
import type { UserStatus } from "@/types";
import { useTranslation } from "@/hooks";

const ALL_ROLES = ["BUYER", "MERCHANT", "CS_ADMIN", "SYSTEM_ADMIN"] as const;

const STATUS_CFG: Record<
  UserStatus,
  { labelKey: string; variant: "success" | "warning" | "danger" | "default" }
> = {
  ACTIVE: { labelKey: "statuses.user.ACTIVE", variant: "success" },
  SUSPENDED: { labelKey: "statuses.user.SUSPENDED", variant: "warning" },
  LOCKED: { labelKey: "statuses.user.LOCKED", variant: "danger" },
  PENDING_DELETION: {
    labelKey: "statuses.user.PENDING_DELETION",
    variant: "default",
  },
};

const STATUS_OPTIONS: UserStatus[] = [
  "ACTIVE",
  "SUSPENDED",
  "PENDING_DELETION",
];

const STATUS_TONE = {
  success: "success",
  warning: "warning",
  danger: "danger",
  default: "neutral",
} as const;

function AdminUserDetailInner() {
  const { t, locale } = useTranslation();
  const params = useParams<{ userId: string }>();
  const userId = params?.userId ?? "";
  const router = useRouter();
  const qc = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ["admin-user", userId],
    queryFn: () => adminUserService.get(userId),
    enabled: !!userId,
  });

  const [roleDraft, setRoleDraft] = useState<Set<string> | null>(null);
  const [statusModal, setStatusModal] = useState<UserStatus | null>(null);
  const [statusReason, setStatusReason] = useState("");
  const [confirmUnlock, setConfirmUnlock] = useState(false);

  const userRoleSet = useMemo(() => {
    if (!user) return new Set<string>();
    return new Set(
      user.roles.map((r) => (r.startsWith("ROLE_") ? r.slice(5) : r)),
    );
  }, [user]);

  const selectedRoles = roleDraft ?? userRoleSet;

  function refresh() {
    setRoleDraft(null);
    qc.invalidateQueries({ queryKey: ["admin-user", userId] });
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  }

  const rolesMu = useMutation({
    mutationFn: (roles: string[]) =>
      adminUserService.updateRoles(userId, roles),
    onSuccess: () => {
      toast.success(t("adminUserDetail.rolesSuccess"));
      refresh();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const statusMu = useMutation({
    mutationFn: (vars: { status: UserStatus; reason?: string }) =>
      adminUserService.updateStatus(userId, vars.status, vars.reason),
    onSuccess: () => {
      toast.success(t("adminUserDetail.statusSuccess"));
      setStatusModal(null);
      setStatusReason("");
      refresh();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const unlockMu = useMutation({
    mutationFn: () => adminUserService.unlock(userId),
    onSuccess: () => {
      toast.success(t("adminUsers.unlockSuccess"));
      setConfirmUnlock(false);
      refresh();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  function toggleRole(role: string) {
    const next = new Set(selectedRoles);
    if (next.has(role)) next.delete(role);
    else next.add(role);
    setRoleDraft(next);
  }

  function saveRoles() {
    if (selectedRoles.size === 0) {
      toast.error(t("adminUserDetail.roleRequired"));
      return;
    }
    rolesMu.mutate(Array.from(selectedRoles));
  }

  function submitStatus() {
    if (!statusModal) return;
    statusMu.mutate({
      status: statusModal,
      reason: statusReason.trim() || undefined,
    });
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen justify-center py-20">
        <Loader2 className="animate-spin text-purple-300" size={28} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen py-20 text-center text-slate-400">
        {t("adminUsers.emptyTitle")}
      </div>
    );
  }

  const statusCfg = STATUS_CFG[user.status];
  const rolesChanged =
    Array.from(selectedRoles).sort().join(",") !==
    Array.from(userRoleSet).sort().join(",");

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-4xl">
        <button
          onClick={() => router.back()}
          className="mb-4 inline-flex items-center gap-1 text-sm text-slate-400 transition-colors hover:text-white"
        >
          <ArrowLeft size={16} /> {t("common.back")}
        </button>

        <AdminHeader
          icon={User}
          title={user.displayName ?? user.username ?? "—"}
          badge={
            <AdminPill tone={STATUS_TONE[statusCfg.variant]}>
              {t(statusCfg.labelKey)}
            </AdminPill>
          }
        />

        <div className="rounded-2xl border border-slate-600/60 bg-white/[0.04] p-6">
          <p className="font-mono text-xs text-slate-400">{user.userId}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-300">
            {user.email && (
              <span className="inline-flex items-center gap-1">
                <Mail size={14} /> {user.email}
              </span>
            )}
            {user.phone && (
              <span className="inline-flex items-center gap-1">
                <Phone size={14} /> {user.phone}
              </span>
            )}
            {user.username && (
              <span className="inline-flex items-center gap-1">
                <User size={14} /> @{user.username}
              </span>
            )}
          </div>
          <p className="mt-3 text-xs text-slate-400">
            {t("adminUserDetail.registeredAt", {
              date: formatDateTime(user.createdAt, locale),
            })}
          </p>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-600/60 bg-white/[0.04] p-6">
          <h2 className="mb-3 font-semibold text-white">
            {t("adminUsers.roles")}
          </h2>
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ALL_ROLES.map((role) => {
              const checked = selectedRoles.has(role);
              return (
                <label
                  key={role}
                  className="flex cursor-pointer items-center gap-2 rounded-lg p-2 transition-colors hover:bg-white/[0.05]"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleRole(role)}
                    className="h-4 w-4 rounded border-white/30 bg-white/5 accent-purple-600"
                  />
                  <span className="text-sm text-slate-200">{role}</span>
                </label>
              );
            })}
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={saveRoles}
              disabled={!rolesChanged}
              loading={rolesMu.isPending}
            >
              {t("adminUserDetail.saveRoles")}
            </Button>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-600/60 bg-white/[0.04] p-6">
          <h2 className="mb-3 font-semibold text-white">
            {t("common.status")}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            {STATUS_OPTIONS.map((s) => (
              <Button
                key={s}
                size="sm"
                variant={user.status === s ? "primary" : "outline"}
                disabled={user.status === s}
                onClick={() => {
                  setStatusReason("");
                  setStatusModal(s);
                }}
              >
                {t(STATUS_CFG[s].labelKey)}
              </Button>
            ))}
            {user.status === "LOCKED" && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setConfirmUnlock(true)}
              >
                <Unlock size={14} className="mr-1" /> {t("adminUsers.unlock")}
              </Button>
            )}
          </div>
          <p className="mt-3 text-xs text-slate-400">
            <ShieldAlert size={12} className="inline mr-1" />
            {t("adminUserDetail.lockedHelp")}
          </p>
        </div>
      </div>

      <Modal
        isOpen={statusModal !== null}
        onClose={() => setStatusModal(null)}
        title={t("adminUserDetail.changeStatus", {
          status: statusModal ? t(STATUS_CFG[statusModal].labelKey) : "",
        })}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            {t("adminUserDetail.reasonHelp")}
          </p>
          <textarea
            value={statusReason}
            onChange={(e) => setStatusReason(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-gray-500 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setStatusModal(null)}
              disabled={statusMu.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button onClick={submitStatus} loading={statusMu.isPending}>
              {t("common.confirm")}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirmUnlock}
        onClose={() => setConfirmUnlock(false)}
        onConfirm={() => unlockMu.mutate()}
        title={t("adminUserDetail.unlockTitle")}
        message={t("adminUserDetail.unlockMessage")}
        variant="primary"
        confirmLabel={t("adminUsers.unlock")}
        loading={unlockMu.isPending}
      />
    </div>
  );
}

export default function AdminUserDetailPage() {
  return (
    <AuthGuard requiredRoles={["SYSTEM_ADMIN", "CS_ADMIN"]}>
      <AdminUserDetailInner />
    </AuthGuard>
  );
}
