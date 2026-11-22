import { describe, expect, it } from "vitest";
import {
  RETURN_REASON_BADGE_CLASS,
  RETURN_REASON_TYPES,
  returnReasonBadgeClass,
  returnReasonLabelKey,
} from "./return-reasons";

describe("return reasons", () => {
  it("exposes every supported reason type", () => {
    expect(RETURN_REASON_TYPES).toEqual([
      "WRONG_ITEM",
      "DAMAGED",
      "DEFECTIVE",
      "NOT_AS_DESCRIBED",
      "MISSING_PARTS",
      "WRONG_SIZE",
      "LATE_DELIVERY",
      "CHANGED_MIND",
      "OTHER",
    ]);
    expect(Object.keys(RETURN_REASON_BADGE_CLASS)).toHaveLength(
      RETURN_REASON_TYPES.length,
    );
  });

  it("returns a badge class for a known reason", () => {
    expect(returnReasonBadgeClass("DAMAGED")).toBe(
      RETURN_REASON_BADGE_CLASS.DAMAGED,
    );
  });

  it("falls back to the neutral badge for missing reasons", () => {
    expect(returnReasonBadgeClass(null)).toBe(RETURN_REASON_BADGE_CLASS.OTHER);
    expect(returnReasonBadgeClass(undefined)).toBe(
      RETURN_REASON_BADGE_CLASS.OTHER,
    );
  });

  it("builds a label key for a known reason and the fallback", () => {
    expect(returnReasonLabelKey("WRONG_SIZE")).toBe(
      "orders.returns.reasonTypes.WRONG_SIZE",
    );
    expect(returnReasonLabelKey(null)).toBe(
      "orders.returns.reasonTypes.OTHER",
    );
  });
});
