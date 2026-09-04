import { beforeEach, describe, expect, it } from "vitest";
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
    expect(JSON.parse(localStorage.getItem(GUEST_RECENT_SEARCHES_KEY)!)).toEqual(
      ["phone", "laptop"],
    );
  });

  it("returns an empty list for malformed guest storage", () => {
    localStorage.setItem(GUEST_RECENT_SEARCHES_KEY, "not-json");

    expect(readGuestRecentSearches()).toEqual([]);
  });
});
