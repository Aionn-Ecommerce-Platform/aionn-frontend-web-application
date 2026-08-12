import { describe, expect, it } from "vitest";
import {
  cn,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  getIntlLocale,
  truncate,
} from "./utils";

describe("cn", () => {
  it("joins truthy class names and drops falsy ones", () => {
    expect(cn("a", false && "b", undefined, "c")).toBe("a c");
  });
});

describe("formatCurrency", () => {
  it("formats an amount using the vi-VN currency style", () => {
    expect(formatCurrency(150000).replace(/\u00a0/g, " ")).toBe("150.000 ₫");
  });

  it("honours a non-default currency", () => {
    expect(formatCurrency(10, "USD")).toContain("10");
  });

  it("uses the selected app locale", () => {
    expect(formatCurrency(1500, "USD", "en")).toBe("$1,500.00");
  });
});

describe("locale formatters", () => {
  it("maps app locales to Intl locales", () => {
    expect(getIntlLocale("vi")).toBe("vi-VN");
    expect(getIntlLocale("en")).toBe("en-US");
  });

  it("formats numbers using the selected locale", () => {
    expect(formatNumber(1500, "en")).toBe("1,500");
  });
});

describe("formatDate", () => {
  it("formats an ISO string in the requested locale", () => {
    expect(formatDate("2026-03-14T00:00:00.000Z", "en-US")).toBe(
      "Mar 14, 2026",
    );
  });
});

describe("formatDateTime", () => {
  it("includes hours and minutes", () => {
    expect(formatDateTime("2026-03-14T08:30:00.000Z", "en-US")).toMatch(
      /Mar 14, 2026/,
    );
  });
});

describe("truncate", () => {
  it("returns the input untouched when it is short enough", () => {
    expect(truncate("short", 10)).toBe("short");
  });

  it("appends an ellipsis when the input is too long", () => {
    expect(truncate("abcdefghij", 4)).toBe("abcd...");
  });
});
