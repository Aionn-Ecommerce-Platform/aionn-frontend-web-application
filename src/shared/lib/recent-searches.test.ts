import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  GUEST_RECENT_SEARCHES_KEY,
  mergeRecentSearches,
  readGuestRecentSearches,
  writeGuestRecentSearches,
} from "./recent-searches";

describe("recent searches", () => {
  beforeEach(() => localStorage.clear());

  it("normalizes, deduplicates case-insensitively and keeps five", () => {
    expect(
      mergeRecentSearches(
        ["  Wireless   Headphones ", "phone", "WIRELESS HEADPHONES"],
        ["laptop", "tablet", "mouse", "camera"],
      ),
    ).toEqual(["Wireless Headphones", "phone", "laptop", "tablet", "mouse"]);
  });

  it("writes and reads guest searches", () => {
    writeGuestRecentSearches(["phone", "laptop"]);

    expect(readGuestRecentSearches()).toEqual(["phone", "laptop"]);
    expect(
      JSON.parse(localStorage.getItem(GUEST_RECENT_SEARCHES_KEY)!),
    ).toEqual(["phone", "laptop"]);
  });

  it("returns an empty list for malformed guest storage", () => {
    localStorage.setItem(GUEST_RECENT_SEARCHES_KEY, "not-json");

    expect(readGuestRecentSearches()).toEqual([]);
  });

  it("handles storage write failures gracefully", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    expect(() => writeGuestRecentSearches(["phone"])).not.toThrow();
  });

  it("coordinates optimistic search queries by merging pending cache with server results", () => {
    const serverSearches = ["laptop", "tablet"];
    const optimisticSearches = ["phone"];

    // When an initial server query resolves after an optimistic runSearch:
    const merged = mergeRecentSearches(optimisticSearches, serverSearches);
    expect(merged).toEqual(["phone", "laptop", "tablet"]);
  });

  it("preserves searches added while bootstrap record is pending", async () => {
    // Simulate server returning initial searches
    const initialServer = ["laptop", "mouse"];
    // Simulate user searching 'keyboard' before bootstrap record call
    const initialOptimistic = ["keyboard"];
    const bootstrapPayload = mergeRecentSearches(initialOptimistic, initialServer);
    // bootstrapPayload = ["keyboard", "laptop", "mouse"]

    // Simulate deferred persistence
    let resolveRecord: (value: string[]) => void;
    const pendingRecord = new Promise<string[]>((resolve) => {
      resolveRecord = resolve;
    });

    // In the meantime, while pendingRecord is in flight, user performs a second search 'monitor'
    const cachedDuringFlight = mergeRecentSearches(["monitor"], initialOptimistic);
    // cachedDuringFlight = ["monitor", "keyboard"]

    // Record completes and returns saved list
    resolveRecord!(bootstrapPayload);
    const saved = await pendingRecord;

    // The bootstrap query re-reads the cache and merges
    const finalState = mergeRecentSearches(cachedDuringFlight, saved);
    expect(finalState).toEqual(["monitor", "keyboard", "laptop", "mouse"]);
  });
});
