export const GUEST_RECENT_SEARCHES_KEY = "aionn-recent-searches:guest";

export function mergeRecentSearches(
  newest: string[],
  existing: string[],
  limit = 5,
): string[] {
  const merged: string[] = [];
  for (const rawQuery of [...newest, ...existing]) {
    const query = rawQuery.trim().replace(/\s+/g, " ");
    if (!query) continue;
    if (
      merged.some(
        (candidate) =>
          candidate.toLocaleLowerCase() === query.toLocaleLowerCase(),
      )
    ) {
      continue;
    }
    merged.push(query);
    if (merged.length === limit) break;
  }
  return merged;
}

export function readGuestRecentSearches(): string[] {
  try {
    const stored: unknown = JSON.parse(
      localStorage.getItem(GUEST_RECENT_SEARCHES_KEY) ?? "[]",
    );
    return Array.isArray(stored)
      ? mergeRecentSearches(
          stored.filter(
            (value): value is string => typeof value === "string",
          ),
          [],
        )
      : [];
  } catch {
    return [];
  }
}

export function writeGuestRecentSearches(queries: string[]): void {
  localStorage.setItem(
    GUEST_RECENT_SEARCHES_KEY,
    JSON.stringify(mergeRecentSearches(queries, [])),
  );
}
