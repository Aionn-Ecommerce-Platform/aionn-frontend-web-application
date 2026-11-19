import api from "@/shared/api";

export interface PresenceStatus {
  userId: string;
  online: boolean;
  lastSeenAt: string | null;
}

export const presenceService = {
  get(userId: string) {
    return api.get<PresenceStatus>(`/presence/users/${userId}`, {
      anonymous: true,
    });
  },
};
