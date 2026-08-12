import { expect, test } from "@playwright/test";
import { loginThroughUi, registerCustomer } from "./helpers/backend";

const runtimeErrors = new WeakMap<import("@playwright/test").Page, string[]>();

const publicRoutes = [
  "/products",
  "/categories",
  "/promotions",
  "/merchants",
  "/contact",
  "/feedback",
  "/auth/forgot-password",
];

const customerRoutes = [
  "/account",
  "/account/settings",
  "/account/addresses",
  "/account/payment-methods",
  "/account/privacy",
  "/account/security",
  "/account/security/mfa-setup",
  "/account/kyc",
  "/account/agent-identities",
  "/orders",
  "/orders/returns",
  "/vouchers",
  "/notifications",
  "/chat",
  "/chat/blocked",
];

const merchantRoutes = [
  "/merchant/dashboard",
  "/merchant/products",
  "/merchant/products/new",
  "/merchant/products/bulk-price",
  "/merchant/warehouses",
  "/merchant/inventory",
  "/merchant/inventory/low-stock",
  "/merchant/inventory/transfers",
  "/merchant/orders",
  "/merchant/orders/returns",
  "/merchant/reviews",
  "/merchant/settings",
  "/merchant/payouts",
  "/merchant/promotions/vouchers",
  "/merchant/promotions/flash-sales",
  "/merchant/promotions/analytics",
  "/merchant/chat",
  "/merchant/chat/auto-reply",
];

const adminRoutes = [
  "/admin",
  "/admin/users",
  "/admin/merchants",
  "/admin/products/pending",
  "/admin/orders",
  "/admin/orders/returns",
  "/admin/inventory",
  "/admin/inventory/reservations",
  "/admin/warehouses",
  "/admin/categories",
  "/admin/brands",
  "/admin/attribute-templates",
  "/admin/reviews",
  "/admin/payments",
  "/admin/payouts",
  "/admin/kyc",
  "/admin/chat",
  "/admin/feedbacks",
  "/admin/analytics",
  "/admin/promotions/campaigns",
  "/admin/promotions/flash-sales",
  "/admin/promotions/banners",
  "/admin/notifications/templates",
  "/admin/notifications/providers",
  "/admin/notifications/dispatch",
  "/admin/shipping/rates",
];

async function expectRouteShell(
  page: import("@playwright/test").Page,
  route: string,
) {
  let errors = runtimeErrors.get(page);
  if (!errors) {
    errors = [];
    runtimeErrors.set(page, errors);
    page.on("pageerror", (error) => errors!.push(error.message));
  }
  errors.length = 0;
  await page.goto(route, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(new RegExp(route.replaceAll("/", "\\/")));
  await expect(page.locator("body")).not.toContainText(
    /application error|internal server error/i,
  );
  await expect(page.locator("body")).toBeVisible();
  expect(errors, `Runtime errors while rendering ${route}`).toEqual([]);
}

async function mockRoleSession(
  page: import("@playwright/test").Page,
  role: "MERCHANT" | "SYSTEM_ADMIN",
) {
  const now = new Date();
  const expires = new Date(now.getTime() + 3_600_000).toISOString();
  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/auth/refresh")) {
      await route.fulfill({
        json: {
          data: {
            accessToken: `playwright-${role}`,
            expiresAt: expires,
            sessionExpiresAt: expires,
            sessionId: `pw-${role}`,
            userId: `pw-${role}`,
          },
        },
      });
      return;
    }
    if (url.pathname.endsWith("/users/me")) {
      await route.fulfill({
        json: {
          data: {
            userId: `pw-${role}`,
            email: `${role.toLowerCase()}@playwright.local`,
            phone: null,
            username: `playwright_${role.toLowerCase()}`,
            displayName: `Playwright ${role}`,
            avatarUrl: null,
            roles: [role],
            status: "ACTIVE",
            emailVerifiedAt: now.toISOString(),
            phoneVerifiedAt: null,
            createdAt: now.toISOString(),
          },
        },
      });
      return;
    }
    if (url.pathname.includes("/catalog/merchants/me")) {
      await route.fulfill({
        json: {
          data: {
            merchantId: "pw-merchant",
            ownerId: `pw-${role}`,
            name: "Playwright Merchant",
            status: "ACTIVE",
            suspensionReason: null,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
          },
        },
      });
      return;
    }
    if (url.pathname.includes("analytics")) {
      await route.fulfill({
        json: {
          data: {
            from: now.toISOString(),
            to: now.toISOString(),
            currency: "VND",
            totalRevenue: 0,
            totalOrders: 0,
            completedOrders: 0,
            totalUsers: 0,
            totalProducts: 0,
            totalFeedbacks: 0,
            totalKyc: 0,
            totalPayments: 0,
            revenueTrend: [],
            statusBreakdown: [],
            topVouchers: [],
            topMerchants: [],
            topProducts: [],
          },
        },
      });
      return;
    }
    await route.fulfill({
      json: {
        data: [],
        paging: { page: 0, size: 20, totalElements: 0, totalPages: 0 },
      },
    });
  });
}

test("all public feature shells render without a fatal error", async ({
  page,
}) => {
  for (const route of publicRoutes) await expectRouteShell(page, route);
});

test("customer account, order, voucher, notification, chat, KYC and security shells render", async ({
  page,
  request,
}) => {
  const customer = await registerCustomer(request);
  await loginThroughUi(page, customer);
  for (const route of customerRoutes) await expectRouteShell(page, route);
});

test("merchant product, inventory, order, promotion, chat and settings shells render", async ({
  page,
}) => {
  await mockRoleSession(page, "MERCHANT");
  for (const route of merchantRoutes) await expectRouteShell(page, route);
});

test("admin moderation, inventory, payment, KYC, promotion and notification shells render", async ({
  page,
}) => {
  await mockRoleSession(page, "SYSTEM_ADMIN");
  for (const route of adminRoutes) await expectRouteShell(page, route);
});

test("buyer cannot access an admin route", async ({ page, request }) => {
  const buyer = await registerCustomer(request);
  await loginThroughUi(page, buyer);
  await page.goto("/admin");
  await expect(page).toHaveURL("http://127.0.0.1:3000/");
});
