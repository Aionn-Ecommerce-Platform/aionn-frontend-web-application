"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Search,
  Loader2,
  Users,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Button, Badge, EmptyState } from "@/shared/ui";
import AuthGuard from "@/components/auth/AuthGuard";
import { adminUserService } from "@/lib/services";
import { useDebounce, useTranslation } from "@/hooks";
import { getErrorMessage } from "@/shared/lib/errors";
import type { UserStatus } from "@/types";

const statusOptions: Array<{ key: "" | UserStatus; labelKey: string }> = [
  { key: "", labelKey: "adminUsers.allStatuses" },
  { key: "ACTIVE", labelKey: "statuses.user.ACTIVE" },
  { key: "SUSPENDED", labelKey: "statuses.user.SUSPENDED" },
  { key: "LOCKED", labelKey: "statuses.user.LOCKED" },
  { key: "PENDING_DELETION", labelKey: "statuses.user.PENDING_DELETION" },
];

const statusConfig: Record<
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

function AdminUsersInner() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState<"" | UserStatus>("");
  const [page, setPage] = useState(0);
  const size = 20;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-users", { status: statusFilter, page }],
    queryFn: () =>
      adminUserService.list({
        status: statusFilter || undefined,
        page,
        size,
      }),
  });

  const users = useMemo(() => data?.data ?? [], [data]);
  const totalElements = data?.paging?.totalElements ?? users.length;
  const totalPages = Math.max(1, data?.paging?.totalPages ?? 1);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        (u.email ?? "").toLowerCase().includes(q) ||
        (u.displayName ?? "").toLowerCase().includes(q),
    );
  }, [users, debouncedSearch]);

  const unlockMutation = useMutation({
    mutationFn: (userId: string) => adminUserService.unlock(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(t("adminUsers.unlockSuccess"));
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {t("adminUsers.title")}
        </h1>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder={t("adminUsers.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as "" | UserStatus);
              setPage(0);
            }}
            className="px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white"
          >
            {statusOptions.map((s) => (
              <option key={s.key} value={s.key}>
                {t(s.labelKey)}
              </option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="animate-spin text-blue-600" size={28} />
          </div>
        ) : isError ? (
          <EmptyState
            icon={AlertCircle}
            title={t("adminUsers.loadError")}
            description={getErrorMessage(error)}
            action={
              <Button variant="outline" onClick={() => void refetch()}>
                {t("common.tryAgain")}
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title={t("adminUsers.emptyTitle")}
            description={t("adminUsers.emptyDescription")}
          />
        ) : (
          <div className="bg-white rounded-md border border-gray-400 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-400 bg-gray-50">
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                      {t("adminUsers.user")}
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                      {t("adminUsers.roles")}
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                      {t("common.status")}
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                      {t("common.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((user) => {
                    const cfg = statusConfig[user.status];
                    return (
                      <tr
                        key={user.userId}
                        className="border-b border-gray-50 hover:bg-gray-50"
                      >
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-gray-900">
                            {user.displayName ?? "—"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {user.email ?? "—"}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-1 flex-wrap">
                            {user.roles.map((role) => (
                              <Badge key={role} variant="info">
                                {role.replace("ROLE_", "")}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {cfg && (
                            <Badge variant={cfg.variant}>
                              {t(cfg.labelKey)}
                            </Badge>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            {user.status === "LOCKED" && (
                              <Button
                                variant="outline"
                                size="sm"
                                loading={
                                  unlockMutation.isPending &&
                                  unlockMutation.variables === user.userId
                                }
                                onClick={() =>
                                  unlockMutation.mutate(user.userId)
                                }
                              >
                                {t("adminUsers.unlock")}
                              </Button>
                            )}
                            <Link
                              href={`/admin/users/${user.userId}`}
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                              aria-label="View detail"
                            >
                              <ChevronRight size={16} />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="border-t border-gray-400 px-6 py-3 flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  {t("adminUsers.pagination", {
                    count: totalElements,
                    page: page + 1,
                    total: totalPages,
                  })}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    {t("common.previous")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page + 1 >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    {t("common.next")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
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
