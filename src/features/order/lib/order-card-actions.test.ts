import { describe, expect, it } from "vitest";
import {
  getOrderCardActions,
  isActiveReturnStatus,
} from "./order-card-actions";

describe("getOrderCardActions", () => {
  it("asks the buyer to confirm receipt for shipped or delivered orders", () => {
    for (const status of ["SHIPPED", "DELIVERED"] as const) {
      expect(
        getOrderCardActions({
          status,
          hasUnreviewedItem: true,
          hasActiveReturn: false,
        }),
      ).toMatchObject({
        confirmReceived: true,
        rate: false,
        buyAgain: false,
        requestReturn: false,
      });
    }
  });

  it("offers only rate (not buy again) for a completed order with unreviewed items", () => {
    expect(
      getOrderCardActions({
        status: "COMPLETED",
        hasUnreviewedItem: true,
        hasActiveReturn: false,
      }),
    ).toEqual({
      confirmReceived: false,
      rate: true,
      buyAgain: false,
      requestReturn: true,
      viewReturn: false,
    });
  });

  it("offers only buy again once every item is reviewed", () => {
    expect(
      getOrderCardActions({
        status: "COMPLETED",
        hasUnreviewedItem: false,
        hasActiveReturn: true,
      }),
    ).toEqual({
      confirmReceived: false,
      rate: false,
      buyAgain: true,
      requestReturn: false,
      viewReturn: true,
    });
  });

  it("never shows order received, rate and buy again together", () => {
    const statuses = [
      "PENDING",
      "PREPARING",
      "SHIPPED",
      "DELIVERED",
      "COMPLETED",
      "CANCELLED",
      "REJECTED",
    ] as const;
    const withPrimaryAction = new Set([
      "SHIPPED",
      "DELIVERED",
      "COMPLETED",
      "CANCELLED",
      "REJECTED",
    ]);
    for (const status of statuses) {
      for (const hasUnreviewedItem of [true, false]) {
        const actions = getOrderCardActions({
          status,
          hasUnreviewedItem,
          hasActiveReturn: false,
        });
        const count = [
          actions.confirmReceived,
          actions.rate,
          actions.buyAgain,
        ].filter(Boolean).length;
        expect(count).toBe(withPrimaryAction.has(status) ? 1 : 0);
      }
    }
  });

  it("only lets cancelled or rejected orders be bought again", () => {
    for (const status of ["CANCELLED", "REJECTED"] as const) {
      expect(
        getOrderCardActions({
          status,
          hasUnreviewedItem: true,
          hasActiveReturn: false,
        }),
      ).toMatchObject({
        confirmReceived: false,
        rate: false,
        buyAgain: true,
        requestReturn: false,
      });
    }
  });

  it("shows no actions for orders that are still being processed", () => {
    expect(
      getOrderCardActions({
        status: "PREPARING",
        hasUnreviewedItem: true,
        hasActiveReturn: false,
      }),
    ).toEqual({
      confirmReceived: false,
      rate: false,
      buyAgain: false,
      requestReturn: false,
      viewReturn: false,
    });
  });
});

describe("isActiveReturnStatus", () => {
  it("treats requested, approved and received returns as active", () => {
    for (const status of ["REQUESTED", "APPROVED", "ITEM_RECEIVED"]) {
      expect(isActiveReturnStatus(status)).toBe(true);
    }
  });

  it("does not treat finished returns as active", () => {
    for (const status of ["REJECTED", "COMPLETED", "CANCELLED"]) {
      expect(isActiveReturnStatus(status)).toBe(false);
    }
  });
});
