import type { AuthSession } from "@/types";

export interface SessionGroup {
  key: string;
  latest: AuthSession;
  all: AuthSession[];
  containsCurrent: boolean;
}

interface SessionDevice {
  browser: string | null;
  os: string | null;
}

/**
 * Turns a raw user agent into something a non-technical shopper can read.
 * Unknown pieces are returned as null so the caller can fall back to a
 * localized label instead of dumping the raw string into the UI.
 */
export function parseSessionUserAgent(
  userAgent: string | null | undefined,
): SessionDevice {
  if (!userAgent) return { browser: null, os: null };
  const ua = userAgent;

  const browser = /opencode/i.test(ua)
    ? "OpenCode CLI"
    : /curl/i.test(ua)
      ? "curl"
      : /PowerShell/i.test(ua) || /WindowsPowerShell/i.test(ua)
        ? "PowerShell"
        : /Edg\//i.test(ua)
          ? "Edge"
          : /OPR\//i.test(ua)
            ? "Opera"
            : /Chrome\//i.test(ua) || /Chromium\//i.test(ua)
              ? "Chrome"
              : /Firefox\//i.test(ua)
                ? "Firefox"
                : /Safari\//i.test(ua)
                  ? "Safari"
                  : null;

  const os = /Windows NT/i.test(ua)
    ? "Windows"
    : /Android/i.test(ua)
      ? "Android"
      : /iPhone|iPad|iPod/i.test(ua)
        ? "iOS"
        : /Mac OS X/i.test(ua)
          ? "macOS"
          : /Linux/i.test(ua)
            ? "Linux"
            : null;

  return { browser, os };
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
  })).sort((left, right) => {
    // Keep the current device pinned first, then show the most recently
    // active devices so the collapsed list really is "latest 3".
    if (left.containsCurrent !== right.containsCurrent) {
      return left.containsCurrent ? -1 : 1;
    }
    const leftTs = new Date(
      left.latest.lastActiveAt ?? left.latest.createdAt,
    ).getTime();
    const rightTs = new Date(
      right.latest.lastActiveAt ?? right.latest.createdAt,
    ).getTime();
    return rightTs - leftTs;
  });
}
