import { expect, test } from "@playwright/test";
import {
  apiUrl,
  authHeaders,
  createAddress,
  json,
  loginThroughUi,
  registerCustomer,
  seedPublishedProduct,
} from "./helpers/backend";

test("customer can manage addresses and cart, place a COD order, inspect and cancel it", async ({
  page,
  request,
}) => {
  const seller = await registerCustomer(request);
  const product = await seedPublishedProduct(request, seller);
  const buyer = await registerCustomer(request);
  const headers = authHeaders(buyer);
  const address = await createAddress(request, buyer);

  const updatedAddress = await json<{ detailAddress: string }>(
    await request.put(`${apiUrl}/addresses/${address.addressId}`, {
      headers,
      data: {
        contactName: "Updated Playwright Customer",
        phone: buyer.phone,
        provinceCode: address.provinceCode,
        districtCode: address.districtCode,
        wardCode: address.wardCode,
        detailAddress: "456 Updated Playwright Street",
        type: "HOME",
      },
    }),
  );
  expect(updatedAddress.detailAddress).toContain("456 Updated");

  await json<unknown>(
    await request.post(`${apiUrl}/ordering/cart/items`, {
      headers,
      data: { skuId: product.skuId, qty: 1 },
    }),
  );
  const updatedCart = await json<{
    items: Array<{ skuId: string; qty: number }>;
  }>(
    await request.put(`${apiUrl}/ordering/cart/items/${product.skuId}`, {
      headers,
      data: { newQty: 2 },
    }),
  );
  expect(updatedCart.items).toContainEqual({ skuId: product.skuId, qty: 2 });

  const order = await json<{ orderId: string; status: string }>(
    await request.post(`${apiUrl}/ordering/orders`, {
      headers: { ...headers, "Idempotency-Key": `pw-order-${buyer.suffix}` },
      data: {
        addressId: address.addressId,
        paymentMethodId: "COD",
        currency: "VND",
        shippingFee: 0,
        gateway: "COD",
        selectedSkuIds: [product.skuId],
        shippingAddress: {
          addressId: address.addressId,
          fullName: "Updated Playwright Customer",
          phone: buyer.phone,
          addressLine: "456 Updated Playwright Street",
          wardCode: address.wardCode,
          districtCode: address.districtCode,
          provinceCode: address.provinceCode,
          countryCode: "VN",
        },
      },
    }),
  );
  expect(order.orderId).toBeTruthy();

  await loginThroughUi(page, buyer, `/orders/${order.orderId}`);
  await expect(page).toHaveURL(new RegExp(`/orders/${order.orderId}$`));
  await expect(page.locator("body")).toContainText(order.orderId.slice(0, 8));

  const cancelled = await json<{ status: string }>(
    await request.post(`${apiUrl}/ordering/orders/${order.orderId}/cancel`, {
      headers,
      data: { reason: "Playwright cancellation coverage" },
    }),
  );
  expect(cancelled.status).toBe("CANCELLED");
  await page.reload();
  await expect(page.locator("body")).toContainText(/cancel|hủy/i);

  const protectedDelete = await request.delete(
    `${apiUrl}/addresses/${address.addressId}`,
    { headers },
  );
  expect(protectedDelete.status()).toBe(409);

  await json<unknown>(
    await request.post(`${apiUrl}/addresses`, {
      headers,
      data: {
        contactName: "Replacement Playwright Address",
        phone: buyer.phone,
        provinceCode: address.provinceCode,
        districtCode: address.districtCode,
        wardCode: address.wardCode,
        detailAddress: "789 Replacement Street",
        type: "HOME",
        isDefault: true,
      },
    }),
  );
  await json<unknown>(
    await request.delete(`${apiUrl}/addresses/${address.addressId}`, {
      headers,
    }),
  );
});

test("out-of-stock variant cannot be added to cart", async ({
  page,
  request,
}) => {
  const seller = await registerCustomer(request);
  const product = await seedPublishedProduct(request, seller, 0);
  const buyer = await registerCustomer(request);
  await loginThroughUi(page, buyer, `/products/${product.productId}`);
  await page.getByRole("button", { name: "Standard" }).click();
  await expect(
    page.getByRole("button", { name: /hết hàng|out of stock/i }).first(),
  ).toBeDisabled();
});

test("protected API rejects an invalid access token", async ({ request }) => {
  const response = await request.get(`${apiUrl}/addresses`, {
    headers: { Authorization: "Bearer expired.playwright.token" },
  });
  expect([401, 403]).toContain(response.status());
});
