import { expect, test } from "@playwright/test";
import {
  loginThroughUi,
  registerCustomer,
  seedPublishedProduct,
} from "./helpers/backend";

test("customer can view a published product, add it to cart and open checkout", async ({
  page,
  request,
}) => {
  const user = await registerCustomer(request);
  const product = await seedPublishedProduct(request, user);
  await loginThroughUi(page, user, `/products/${product.productId}`);

  await expect(
    page.getByRole("heading", { name: product.productName }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Standard" }).click();
  const addToCart = page.getByRole("button", {
    name: /thêm vào giỏ|add to cart/i,
  });
  await expect(addToCart).toBeEnabled();
  await addToCart.click();

  await page.goto("/cart");
  await expect(
    page
      .locator(`a[href="/products/${product.productId}"]`)
      .filter({ hasText: product.productName })
      .first(),
  ).toBeVisible();
  await expect(page.getByText(/standard/i).first()).toBeVisible();
  await page
    .getByRole("checkbox", { name: new RegExp(product.productName) })
    .check();
  await page.getByRole("button", { name: /thanh toán|checkout/i }).click();

  await expect(page).toHaveURL(/\/checkout$/);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /^(thanh toán|checkout)$/i,
    }),
  ).toBeVisible();
});
