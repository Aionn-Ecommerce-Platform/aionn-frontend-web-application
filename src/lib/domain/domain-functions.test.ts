import { describe, expect, it } from "vitest";
import {
  calculateCheckoutPricing,
  calculateCheckoutTotal,
  calculateShopVoucherDiscount,
  getVerifiedPaymentMethods,
  resolvePaymentOption,
  selectCheckoutItems,
} from "./checkout";
import {
  buildCategoryFilterItems,
  buildFilterItems,
  hasCatalogFilters,
  readMultiParam,
} from "./catalog";
import { filterMerchantOrders } from "./merchant-orders";
import { groupSessions } from "./security-sessions";
import type {
  AuthSession,
  CartItem,
  CategoryTreeNode,
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
      goodsDiscount: 200,
      shippingDiscount: 0,
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

  it("subtracts a free-shipping voucher from the payable total", () => {
    const items = [cartItem("a", 300_000, 1), cartItem("b", 610_000, 1)];
    const platform = {
      minOrderValue: 699_000,
      voucherDiscountAmount: 25_000,
    } as UserVoucher;
    const shippingVoucher = {
      voucherType: "FREE_SHIPPING",
      minOrderValue: 0,
      voucherDiscountAmount: 30_000,
    } as UserVoucher;
    const pricing = calculateCheckoutPricing(
      items,
      { platform, shipping: shippingVoucher },
      30_000,
    );
    expect(pricing.shippingDiscount).toBe(30_000);
    expect(
      calculateCheckoutTotal({
        subtotal: pricing.subtotal,
        platformDiscount: 25_000,
        shopDiscount: 0,
        shipping: 30_000,
        shippingDiscount: pricing.shippingDiscount,
      }),
    ).toBe(885_000);
  });

  it("caps a shop voucher at that shop's goods total and honours its minimum", () => {
    const voucher = {
      minOrderValue: 100,
      voucherDiscountAmount: 30,
    } as UserVoucher;
    expect(calculateShopVoucherDiscount(voucher, 200)).toBe(30);
    expect(calculateShopVoucherDiscount(voucher, 60)).toBe(0);
    expect(
      calculateShopVoucherDiscount(
        { ...voucher, voucherDiscountAmount: 500 } as UserVoucher,
        120,
      ),
    ).toBe(120);
    expect(calculateShopVoucherDiscount(null, 200)).toBe(0);
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

  it("dynamically hides encompassing parent category when search narrows to subcategories", () => {
    const mockNodes: CategoryTreeNode[] = [
      {
        category: {
          categoryId: "CAT_HBE",
          name: "Sức khỏe & Sắc đẹp",
          slug: "health-beauty",
          active: true,
          createdAt: "",
          updatedAt: "",
          parentId: null,
          iconUrl: null,
        },
        children: [
          {
            category: {
              categoryId: "CAT_SKN",
              name: "Chăm sóc da",
              slug: "skincare",
              active: true,
              createdAt: "",
              updatedAt: "",
              parentId: "CAT_HBE",
              iconUrl: null,
            },
            children: [],
          },
          {
            category: {
              categoryId: "CAT_VIT",
              name: "Vitamin",
              slug: "vitamins",
              active: true,
              createdAt: "",
              updatedAt: "",
              parentId: "CAT_HBE",
              iconUrl: null,
            },
            children: [],
          },
        ],
      },
      {
        category: {
          categoryId: "CAT_ELE",
          name: "Điện tử",
          slug: "electronics",
          active: true,
          createdAt: "",
          updatedAt: "",
          parentId: null,
          iconUrl: null,
        },
        children: [
          {
            category: {
              categoryId: "CAT_PHO",
              name: "Điện thoại",
              slug: "smartphones",
              active: true,
              createdAt: "",
              updatedAt: "",
              parentId: "CAT_ELE",
              iconUrl: null,
            },
            children: [],
          },
        ],
      },
    ];

    const names = new Map([
      ["CAT_HBE", "Sức khỏe & Sắc đẹp"],
      ["CAT_SKN", "Chăm sóc da"],
      ["CAT_VIT", "Vitamin"],
      ["CAT_ELE", "Điện tử"],
      ["CAT_PHO", "Điện thoại"],
    ]);

    const resultSpecific = buildCategoryFilterItems({
      names,
      counts: { CAT_HBE: 9, CAT_SKN: 9 },
      selectedIds: [],
      nodes: mockNodes,
    });
    expect(resultSpecific).toEqual([
      { id: "CAT_SKN", label: "Chăm sóc da", count: 9, selected: false },
    ]);

    const resultSelected = buildCategoryFilterItems({
      names,
      counts: { CAT_HBE: 9, CAT_SKN: 9 },
      selectedIds: ["CAT_HBE"],
      nodes: mockNodes,
    });
    expect(resultSelected).toEqual([
      { id: "CAT_SKN", label: "Chăm sóc da", count: 9, selected: false },
      { id: "CAT_HBE", label: "Sức khỏe & Sắc đẹp", count: 9, selected: true },
    ]);

    const resultBroad = buildCategoryFilterItems({
      names,
      counts: { CAT_SKN: 5, CAT_PHO: 3 },
      selectedIds: [],
      nodes: mockNodes,
    });
    expect(resultBroad).toEqual([
      { id: "CAT_SKN", label: "Chăm sóc da", count: 5, selected: false },
      { id: "CAT_PHO", label: "Điện thoại", count: 3, selected: false },
    ]);
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
