import { expect, test } from "@playwright/test";

test("public storefront loads and exposes primary navigation", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.locator("header")).toBeVisible();
  await expect(page.locator("main")).toBeVisible();
  await expect(
    page.getByRole("link", { name: /đăng nhập|login/i }).first(),
  ).toBeVisible();
});

test("protected account route redirects an anonymous visitor", async ({
  page,
}) => {
  await page.goto("/account");

  await expect(page).toHaveURL(/\/auth\/login\?redirect=%2Faccount$/);
  await expect(page.locator("#identity")).toBeVisible();
  await expect(page.locator("#password")).toBeVisible();
});
