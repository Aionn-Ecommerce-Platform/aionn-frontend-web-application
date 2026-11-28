"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Eye,
  Headphones,
  Loader2,
  Settings,
  Store,
  Unlock,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import { Badge, Button, FilterDropdown, Modal, Pagination } from "@/shared/ui";
import {
  AdminEmpty,
  AdminHeader,
  AdminPill,
  AdminSearch,
  AdminStats,
  AdminTable,
  adminRow,
  adminTd,
} from "@/features/admin";
import AuthGuard from "@/components/auth/AuthGuard";
import { adminUserService } from "@/lib/services";
import { useDebounce, useTranslation } from "@/hooks";
import { getErrorMessage } from "@/shared/lib/errors";
import { formatDateTime } from "@/shared/lib/utils";
import type { UserStatus } from "@/types";

const ALL_ROLES = ["BUYER", "MERCHANT", "CS_ADMIN", "SYSTEM_ADMIN"] as const;

const statusOptions: Array<{ key: "" | UserStatus; labelKey: string }> = [
  { key: "", labelKey: "adminUsers.allStatuses" },
  { key: "ACTIVE", labelKey: "statuses.user.ACTIVE" },
  { key: "SUSPENDED", labelKey: "statuses.user.SUSPENDED" },
  { key: "LOCKED", labelKey: "statuses.user.LOCKED" },
  { key: "PENDING_DELETION", labelKey: "statuses.user.PENDING_DELETION" },
];

const roleOptions: Array<{
  key: "" | (typeof ALL_ROLES)[number];
  labelKey: string;
}> = [
  { key: "", labelKey: "adminUsers.allRoles" },
  { key: "BUYER", labelKey: "account.roles.BUYER" },
  { key: "MERCHANT", labelKey: "account.roles.MERCHANT" },
  { key: "CS_ADMIN", labelKey: "account.roles.CS_ADMIN" },
  { key: "SYSTEM_ADMIN", labelKey: "account.roles.SYSTEM_ADMIN" },
];

const statusBadge: Record<
  UserStatus,
  "success" | "warning" | "danger" | "default"
> = {
  ACTIVE: "success",
  SUSPENDED: "warning",
  LOCKED: "danger",
  PENDING_DELETION: "default",
};

const roleTone: Record<
  string,
  "info" | "success" | "warning" | "danger" | "purple" | "neutral"
> = {
  BUYER: "info",
  MERCHANT: "success",
  CS_ADMIN: "warning",
  SYSTEM_ADMIN: "danger",
};

const statusLabelKey: Record<UserStatus, string> = {
  ACTIVE: "statuses.user.ACTIVE",
  SUSPENDED: "statuses.user.SUSPENDED",
  LOCKED: "statuses.user.LOCKED",
  PENDING_DELETION: "statuses.user.PENDING_DELETION",
};

const centerTh =
  "whitespace-nowrap px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400";

function AdminUsersInner() {
  const { t, locale } = useTranslation();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState<"" | UserStatus>("");
  const [roleFilter, setRoleFilter] = useState<"" | (typeof ALL_ROLES)[number]>(
    "",
  );
  const [page, setPage] = useState(1);
  const size = 20;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [roleDraft, setRoleDraft] = useState<Set<string> | null>(null);
  const [statusModal, setStatusModal] = useState<UserStatus | null>(null);
  const [statusReason, setStatusReason] = useState("");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [
      "admin-users",
      {
        status: statusFilter,
        role: roleFilter,
        search: debouncedSearch,
        page,
      },
    ],
    queryFn: () =>
      adminUserService.list({
        status: statusFilter || undefined,
        role: roleFilter || undefined,
        search: debouncedSearch.trim() || undefined,
        page: page - 1,
        size,
      }),
  });

  const roleCount = (role: string) =>
    adminUserService.list({ role, page: 0, size: 1 });

  const { data: buyerCount } = useQuery({
    queryKey: ["admin-user-count", "BUYER"],
    queryFn: () => roleCount("BUYER"),
  });
  const { data: merchantCount } = useQuery({
    queryKey: ["admin-user-count", "MERCHANT"],
    queryFn: () => roleCount("MERCHANT"),
  });
  const { data: csCount } = useQuery({
    queryKey: ["admin-user-count", "CS_ADMIN"],
    queryFn: () => roleCount("CS_ADMIN"),
  });
  const { data: sysCount } = useQuery({
    queryKey: ["admin-user-count", "SYSTEM_ADMIN"],
    queryFn: () => roleCount("SYSTEM_ADMIN"),
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["admin-user", selectedId],
    queryFn: () => adminUserService.get(selectedId!),
    enabled: !!selectedId,
  });

  const users = useMemo(() => data?.data ?? [], [data]);
  const totalPages = Math.max(1, data?.paging?.totalPages ?? 1);

  const userRoleSet = useMemo(() => {
    if (!detail) return new Set<string>();
    return new Set(
      detail.roles.map((role) =>
        role.startsWith("ROLE_") ? role.slice(5) : role,
      ),
    );
  }, [detail]);

  const selectedRoles = roleDraft ?? userRoleSet;
  const rolesChanged =
    Array.from(selectedRoles)
      .sort((a, b) => a.localeCompare(b))
      .join(",") !==
    Array.from(userRoleSet)
      .sort((a, b) => a.localeCompare(b))
      .join(",");

  function openDetail(userId: string) {
    setSelectedId(userId);
    setRoleDraft(null);
    setStatusModal(null);
    setStatusReason("");
  }

  function refresh() {
    qc.invalidateQueries({ queryKey: ["admin-users"] });
    qc.invalidateQueries({ queryKey: ["admin-user"] });
    qc.invalidateQueries({ queryKey: ["admin-user-count"] });
  }

  const rolesMu = useMutation({
    mutationFn: (roles: string[]) =>
      adminUserService.updateRoles(selectedId!, roles),
    onSuccess: () => {
      toast.success(t("adminUserDetail.rolesSuccess"));
      setRoleDraft(null);
      refresh();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const statusMu = useMutation({
    mutationFn: (vars: { status: UserStatus; reason?: string }) =>
      adminUserService.updateStatus(selectedId!, vars.status, vars.reason),
    onSuccess: () => {
      toast.success(t("adminUserDetail.statusSuccess"));
      setStatusModal(null);
      setStatusReason("");
      refresh();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const unlockMu = useMutation({
    mutationFn: () => adminUserService.unlock(selectedId!),
    onSuccess: () => {
      toast.success(t("adminUsers.unlockSuccess"));
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

  const countOf = (value?: { paging?: { totalElements?: number } | null }) =>
    value?.paging?.totalElements ?? 0;

  const roleLabel = (role: string) =>
    t(`account.roles.${role.replace("ROLE_", "")}`);

  return (
    <div className="min-h-screen">
      <AdminHeader icon={Users} title={t("adminUsers.title")} />

      <AdminStats
        stats={[
          {
            label: t("account.roles.BUYER"),
            value: countOf(buyerCount),
            icon: Users,
          },
          {
            label: t("account.roles.MERCHANT"),
            value: countOf(merchantCount),
            icon: Store,
            iconClass: "text-cyan-300",
          },
          {
            label: t("account.roles.CS_ADMIN"),
            value: countOf(csCount),
            icon: Headphones,
            iconClass: "text-amber-300",
          },
          {
            label: t("account.roles.SYSTEM_ADMIN"),
            value: countOf(sysCount),
            icon: Settings,
            iconClass: "text-rose-300",
          },
        ]}
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-64 flex-1">
          <AdminSearch
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder={t("adminUsers.searchPlaceholder")}
            fullWidth
          />
        </div>
        <FilterDropdown
          label={t("common.status")}
          value={statusFilter}
          onChange={(value) => {
            setStatusFilter(value as "" | UserStatus);
            setPage(1);
          }}
          options={statusOptions.map((option) => ({
            value: option.key,
            label: t(option.labelKey),
          }))}
        />
        <FilterDropdown
          label={t("adminUsers.roles")}
          value={roleFilter}
          onChange={(value) => {
            setRoleFilter(value as "" | (typeof ALL_ROLES)[number]);
            setPage(1);
          }}
          options={roleOptions.map((option) => ({
            value: option.key,
            label: t(option.labelKey),
          }))}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-purple-300" size={28} />
        </div>
      ) : isError ? (
        <AdminEmpty
          icon={AlertCircle}
          title={t("adminUsers.loadError")}
          description={getErrorMessage(error)}
          action={
            <Button variant="outline" onClick={() => void refetch()}>
              {t("common.tryAgain")}
            </Button>
          }
        />
      ) : users.length === 0 ? (
        <AdminEmpty
          icon={Users}
          title={t("adminUsers.emptyTitle")}
          description={t("adminUsers.emptyDescription")}
        />
      ) : (
        <>
          <AdminTable>
            <thead>
              <tr className="border-b border-slate-600/60 bg-white/[0.03]">
                <th className={centerTh}>{t("adminUsers.user")}</th>
                <th className={centerTh}>{t("adminUsers.roles")}</th>
                <th className={centerTh}>{t("common.status")}</th>
                <th className={centerTh}>{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.userId} className={adminRow}>
                  <td className={`${adminTd} text-center`}>
                    <p className="font-semibold text-white">
                      {user.displayName ?? "—"}
                    </p>
                    <p className="text-xs text-slate-400">
                      {user.email ?? "—"}
                    </p>
                  </td>
                  <td className={`${adminTd} text-center`}>
                    <div className="flex flex-wrap justify-center gap-1">
                      {user.roles.map((role) => (
                        <AdminPill
                          key={role}
                          tone={roleTone[role.replace("ROLE_", "")] ?? "purple"}
                        >
                          {roleLabel(role)}
                        </AdminPill>
                      ))}
                    </div>
                  </td>
                  <td className={`${adminTd} text-center`}>
                    <span
                      className={`inline-flex items-center whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold ${
                        user.status === "ACTIVE"
                          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                          : user.status === "SUSPENDED"
                            ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
                            : user.status === "LOCKED"
                              ? "border-rose-400/30 bg-rose-400/10 text-rose-300"
                              : "border-slate-500/40 bg-white/5 text-slate-300"
                      }`}
                    >
                      {t(statusLabelKey[user.status])}
                    </span>
                  </td>
                  <td className={`${adminTd} text-center`}>
                    <button
                      type="button"
                      onClick={() => openDetail(user.userId)}
                      aria-label={t("common.view")}
                      className="inline-flex cursor-pointer items-center justify-center rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </AdminTable>

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      )}

      <Modal
        isOpen={selectedId !== null}
        onClose={() => setSelectedId(null)}
        title={t("adminUserDetail.title")}
        size="full"
      >
        {detailLoading || !detail ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-purple-600" size={26} />
          </div>
        ) : (
          <div className="max-h-[80vh] space-y-6 overflow-y-auto pr-2">
            <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-gray-500">{t("adminUsers.user")}</p>
                <p className="font-medium text-gray-900">
                  {detail.displayName ?? detail.username ?? "—"}
                </p>
                {detail.username && (
                  <p className="mt-0.5 text-xs text-gray-500">
                    @{detail.username}
                  </p>
                )}
              </div>
              <div>
                <p className="text-gray-500">Email</p>
                <p className="break-all font-medium text-gray-900">
                  {detail.email ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-gray-500">{t("common.phone")}</p>
                <p className="font-medium text-gray-900">
                  {detail.phone ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-gray-500">{t("common.createdAt")}</p>
                <p className="font-medium text-gray-900">
                  {formatDateTime(detail.createdAt, locale)}
                </p>
              </div>
              <div>
                <p className="text-gray-500">{t("common.status")}</p>
                <Badge
                  variant={statusBadge[detail.status]}
                  className="!mt-1 !rounded-full !px-3 !py-1 !text-xs"
                >
                  {t(statusLabelKey[detail.status])}
                </Badge>
              </div>
              <div>
                <p className="text-gray-500">User ID</p>
                <p className="break-all font-mono text-xs text-gray-900">
                  {detail.userId}
                </p>
              </div>
            </div>

            <div className="border-t border-gray-300 pt-4">
              <h3 className="mb-3 font-semibold text-gray-900">
                {t("adminUsers.roles")}
              </h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {ALL_ROLES.map((role) => {
                  const checked = selectedRoles.has(role);
                  return (
                    <label
                      key={role}
                      className="flex cursor-pointer items-center gap-2 rounded-lg p-2 transition-colors hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleRole(role)}
                        className="h-4 w-4 rounded border-gray-300 accent-purple-600"
                      />
                      <span className="text-sm text-gray-900">
                        {t(`account.roles.${role}`)}
                      </span>
                    </label>
                  );
                })}
              </div>
              <div className="mt-3 flex justify-end">
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

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-300 pt-4">
              {detail.status === "LOCKED" && (
                <Button
                  size="sm"
                  variant="outline"
                  loading={unlockMu.isPending}
                  onClick={() => unlockMu.mutate()}
                >
                  <Unlock size={14} className="mr-1" />
                  {t("adminUsers.unlock")}
                </Button>
              )}
              {detail.status !== "ACTIVE" && (
                <Button
                  size="sm"
                  className="bg-emerald-600 text-white hover:bg-emerald-500"
                  onClick={() => {
                    setStatusReason("");
                    setStatusModal("ACTIVE");
                  }}
                >
                  {t("statuses.user.ACTIVE")}
                </Button>
              )}
              {detail.status !== "SUSPENDED" && (
                <Button
                  size="sm"
                  className="bg-amber-500 text-white hover:bg-amber-600"
                  onClick={() => {
                    setStatusReason("");
                    setStatusModal("SUSPENDED");
                  }}
                >
                  {t("statuses.user.SUSPENDED")}
                </Button>
              )}
              {detail.status !== "PENDING_DELETION" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-rose-300 text-rose-600 hover:bg-rose-50"
                  onClick={() => {
                    setStatusReason("");
                    setStatusModal("PENDING_DELETION");
                  }}
                >
                  {t("statuses.user.PENDING_DELETION")}
                </Button>
              )}
              <Button variant="outline" onClick={() => setSelectedId(null)}>
                {t("common.close")}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={statusModal !== null}
        onClose={() => setStatusModal(null)}
        title={t("adminUserDetail.changeStatus", {
          status: statusModal ? t(statusLabelKey[statusModal]) : "",
        })}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {t("adminUserDetail.reasonHelp")}
          </p>
          <textarea
            value={statusReason}
            onChange={(e) => setStatusReason(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
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
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <AuthGuard requiredRoles={["SYSTEM_ADMIN", "CS_ADMIN"]}>
      <AdminUsersInner />
    </AuthGuard>
  );
}
