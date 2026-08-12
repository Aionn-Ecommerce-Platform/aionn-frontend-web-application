import type { AuthSession } from "@/types";

export interface SessionGroup {
  key: string;
  latest: AuthSession;
  all: AuthSession[];
  containsCurrent: boolean;
}

export function groupSessions(
  list: AuthSession[],
  currentId?: string | null,
): SessionGroup[] {
  const buckets = new Map<string, AuthSession[]>();
  for (const session of list) {
    const key = `${session.userAgent ?? ""}__${session.ipAddress ?? ""}`;
    buckets.set(key, [...(buckets.get(key) ?? []), session]);
  }
  return Array.from(buckets, ([key, sessions]) => ({
    key,
    latest: sessions.reduce((latest, session) =>
      new Date(session.lastActiveAt ?? session.createdAt) >
      new Date(latest.lastActiveAt ?? latest.createdAt)
        ? session
        : latest,
    ),
    all: sessions,
    containsCurrent: sessions.some(
      (session) => session.sessionId === currentId,
    ),
  })).sort(
    (left, right) =>
      Number(right.containsCurrent) - Number(left.containsCurrent),
  );
}
