import { describe, expect, it } from "vitest";
import {
  calculateCheckoutPricing,
  getVerifiedPaymentMethods,
  resolvePaymentOption,
  selectCheckoutItems,
} from "./checkout";
import { buildFilterItems, hasCatalogFilters, readMultiParam } from "./catalog";
import { filterMerchantOrders } from "./merchant-orders";
import { groupSessions } from "./security-sessions";
import type {
  AuthSession,
  CartItem,
  Order,
  PaymentMethod,
  UserVoucher,
} from "@/types";

const cartItem = (skuId: string, price: number, qty: number) =>
  ({ skuId, price, qty }) as CartItem;

describe("checkout domain", () => {
  it("selects only requested cart items", () => {
    const items = [cartItem("a", 10, 1), cartItem("b", 20, 2)];
    expect(selectCheckoutItems(items, ["b"])).toEqual([items[1]]);
    expect(selectCheckoutItems(items, [])).toBe(items);
    expect(selectCheckoutItems(items, null)).toEqual([]);
  });

  it("calculates capped voucher discounts and minimum order rules", () => {
    const items = [cartItem("a", 100, 2)];
    const voucher = {
      minOrderValue: 100,
      voucherDiscountAmount: 250,
    } as UserVoucher;
    expect(calculateCheckoutPricing(items, voucher)).toEqual({
      subtotal: 200,
      meetsMinimum: true,
      discount: 200,
      merchandiseTotal: 0,
    });
    expect(
      calculateCheckoutPricing(items, {
        ...voucher,
        minOrderValue: 300,
      }),
    ).toMatchObject({
      meetsMinimum: false,
      discount: 0,
      merchandiseTotal: 200,
    });
  });

  it("uses only verified cards and resolves payment preference safely", () => {
    const verified = { methodId: "card", status: "VERIFIED" } as PaymentMethod;
    const pending = { methodId: "pending", status: "LINKED" } as PaymentMethod;
    expect(getVerifiedPaymentMethods([verified, pending])).toEqual([verified]);
    expect(
      resolvePaymentOption(null, { paymentType: "VNPAY" }, [verified]),
    ).toBe("VNPAY");
    expect(
      resolvePaymentOption(
        null,
        { paymentType: "SAVED_CARD", paymentMethodId: "card" },
        [verified],
      ),
    ).toBe("card");
    expect(resolvePaymentOption(null, { paymentType: "SAVED_CARD" }, [])).toBe(
      "COD",
    );
  });
});

describe("catalog domain", () => {
  it("normalizes comma-separated query values", () => {
    expect(
      readMultiParam(new URLSearchParams("brandIds=a,%20b,,"), "brandIds"),
    ).toEqual(["a", "b"]);
  });

  it("merges names and facet counts into sorted filter items", () => {
    expect(
      buildFilterItems({
        names: new Map([
          ["b", "Beta"],
          ["a", "Alpha"],
        ]),
        counts: { a: 2, c: 1 },
        selectedIds: ["b"],
      }),
    ).toEqual([
      { id: "a", label: "Alpha", count: 2, selected: false },
      { id: "b", label: "Beta", count: 0, selected: true },
      { id: "c", label: "c", count: 1, selected: false },
    ]);
    expect(hasCatalogFilters([null, "", 0, false])).toBe(false);
    expect(hasCatalogFilters([null, 1])).toBe(true);
  });
});

describe("merchant order domain", () => {
  const order = (orderId: string, status: Order["status"], createdAt: string) =>
    ({ orderId, status, createdAt }) as Order;

  it("combines status, search and calendar filters", () => {
    const orders = [
      order("ORDER-ALPHA", "PLACED", "2026-08-10T00:00:00Z"),
      order("ORDER-BETA", "COMPLETED", "2026-07-09T00:00:00Z"),
    ];
    expect(
      filterMerchantOrders(orders, ["PLACED"], "alpha", {
        year: 2026,
        month: 8,
        day: 10,
      }),
    ).toEqual([orders[0]]);
    expect(
      filterMerchantOrders(orders, null, "", {
        year: null,
        month: null,
        day: null,
      }),
    ).toEqual(orders);
  });
});

describe("security session domain", () => {
  const session = (
    sessionId: string,
    lastActiveAt: string,
    userAgent = "Chrome",
  ) =>
    ({
      sessionId,
      userId: "user-1",
      status: "ACTIVE",
      ipAddress: "127.0.0.1",
      userAgent,
      createdAt: "2026-08-01T00:00:00Z",
      lastActiveAt,
      expiresAt: "2026-09-01T00:00:00Z",
    }) satisfies AuthSession;

  it("groups matching devices and puts the current device first", () => {
    const grouped = groupSessions(
      [
        session("old", "2026-08-02T00:00:00Z"),
        session("current", "2026-08-03T00:00:00Z"),
        session("phone", "2026-08-04T00:00:00Z", "Mobile"),
      ],
      "current",
    );
    expect(grouped).toHaveLength(2);
    expect(grouped[0]).toMatchObject({
      containsCurrent: true,
      latest: { sessionId: "current" },
    });
    expect(grouped[0]?.all).toHaveLength(2);
  });
});
