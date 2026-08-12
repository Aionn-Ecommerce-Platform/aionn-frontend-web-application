import api, { request, requestEnvelope } from "@/shared/api";
import type { ApiEnvelope, UserProfile, UserStatus } from "@/types";

interface AdminUserSummary {
  userId: string;
  email: string | null;
  phone: string | null;
  username: string | null;
  displayName: string | null;
  roles: string[];
  status: UserStatus;
  createdAt: string;
}

export const adminUserService = {
  list(params: {
    status?: UserStatus;
    role?: string;
    page?: number;
    size?: number;
  }) {
    return requestEnvelope<AdminUserSummary[]>("/admin/users", {
      query: {
        status: params.status,
        role: params.role,
        page: params.page ?? 0,
        size: params.size ?? 20,
      },
    }) as Promise<ApiEnvelope<AdminUserSummary[]>>;
  },
  get(userId: string) {
    return api.get<UserProfile>(`/admin/users/${userId}`);
  },
  updateRoles(userId: string, roles: string[]) {
    return api.put<{ roles: string[] }>(`/admin/users/${userId}/roles`, {
      roles,
    });
  },
  removeRoles(userId: string, roles: string[]) {
    return request<void>(`/admin/users/${userId}/roles`, {
      method: "DELETE",
      body: { roles },
    });
  },
  updateStatus(userId: string, status: UserStatus, reason?: string) {
    return api.patch<{ status: UserStatus }>(`/admin/users/${userId}/status`, {
      status,
      reason,
    });
  },
  unlock(userId: string) {
    return api.post<void>("/admin/users/unlock", { userId });
  },
};
