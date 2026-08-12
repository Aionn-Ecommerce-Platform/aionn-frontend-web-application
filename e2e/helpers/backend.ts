import { expect, type APIRequestContext, type Page } from "@playwright/test";

const apiUrl = process.env.E2E_API_URL ?? "http://127.0.0.1:8080/api/v1";

export function payload<T>(body: unknown): T {
  const envelope = body as { data?: T };
  return (envelope.data ?? body) as T;
}

async function json<T>(
  response: Awaited<ReturnType<APIRequestContext["get"]>>,
) {
  const text = await response.text();
  expect(response.ok(), text).toBeTruthy();
  return payload<T>(JSON.parse(text));
}

export async function registerCustomer(request: APIRequestContext) {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const phone = `09${suffix.slice(-8)}`;
  const username = `playwright_${suffix}`;
  const password = "E2eTest123!";

  const session = await json<{ regId: string; otpCode: string }>(
    await request.post(`${apiUrl}/registrations/initiate`, {
      data: { phoneNumber: phone, captchaToken: "playwright" },
    }),
  );
  const verification = await json<{ verificationToken: string }>(
    await request.post(`${apiUrl}/registrations/${session.regId}/verify-otp`, {
      data: { otpCode: session.otpCode },
    }),
  );
  const tokens = await json<{ accessToken: string }>(
    await request.post(`${apiUrl}/registrations/${session.regId}/complete`, {
      data: {
        password,
        username,
        verificationToken: verification.verificationToken,
      },
    }),
  );

  return { suffix, phone, username, password, accessToken: tokens.accessToken };
}

export async function loginThroughUi(
  page: Page,
  user: { username: string; password: string },
  redirect = "/account",
) {
  await page.goto(`/auth/login?redirect=${encodeURIComponent(redirect)}`);
  await page.locator("#identity").fill(user.username);
  await page.locator("#password").fill(user.password);
  await page
    .locator("form")
    .getByRole("button", { name: /đăng nhập|login/i })
    .click();
  await expect(page).toHaveURL(new RegExp(`${redirect.replace("/", "\\/")}$`));
}

function firstCategoryId(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  if ("categoryId" in value && typeof value.categoryId === "string") {
    return value.categoryId;
  }
  for (const child of Object.values(value)) {
    if (Array.isArray(child)) {
      for (const item of child) {
        const found = firstCategoryId(item);
        if (found) return found;
      }
    } else {
      const found = firstCategoryId(child);
      if (found) return found;
    }
  }
  return undefined;
}

export async function seedPublishedProduct(
  request: APIRequestContext,
  user: Awaited<ReturnType<typeof registerCustomer>>,
  initialQty = 20,
) {
  const authHeaders = { Authorization: `Bearer ${user.accessToken}` };
  const merchant = await json<{ merchantId: string }>(
    await request.post(`${apiUrl}/catalog/merchants`, {
      headers: authHeaders,
      data: { name: `Playwright Merchant ${user.suffix}` },
    }),
  );
  const headers = { ...authHeaders, "X-Merchant-Id": merchant.merchantId };
  const warehouse = await json<{ warehouseId: string }>(
    await request.post(`${apiUrl}/inventory/warehouses`, {
      headers,
      data: { address: "123 Playwright Street", priorityLevel: 1 },
    }),
  );
  const productName = `Playwright Product ${user.suffix}`;
  const product = await json<{ productId: string }>(
    await request.post(`${apiUrl}/catalog/products`, {
      headers,
      data: { name: productName },
    }),
  );
  const skuId = `SKU_PW_${user.suffix}`;
  await json<unknown>(
    await request.post(
      `${apiUrl}/catalog/products/${product.productId}/variants`,
      {
        headers,
        data: {
          skuId,
          attributeValues: { size: "Standard" },
          price: 150000,
          currency: "VND",
        },
      },
    ),
  );
  const categories = await json<unknown>(
    await request.get(`${apiUrl}/catalog/categories/roots`),
  );
  const categoryId = firstCategoryId(categories);
  expect(categoryId, "E2E category fixture is missing").toBeTruthy();
  await json<unknown>(
    await request.put(
      `${apiUrl}/catalog/products/${product.productId}/categories`,
      {
        headers,
        data: { categoryIds: [categoryId] },
      },
    ),
  );
  await json<unknown>(
    await request.post(
      `${apiUrl}/catalog/products/${product.productId}/publish`,
      { headers },
    ),
  );
  await json<unknown>(
    await request.post(`${apiUrl}/inventory/items`, {
      headers,
      data: { skuId, warehouseId: warehouse.warehouseId, initialQty },
    }),
  );
  return {
    merchantId: merchant.merchantId,
    warehouseId: warehouse.warehouseId,
    productId: product.productId,
    productName,
    skuId,
  };
}

export function authHeaders(user: { accessToken: string }) {
  return { Authorization: `Bearer ${user.accessToken}` };
}

export async function createAddress(
  request: APIRequestContext,
  user: Awaited<ReturnType<typeof registerCustomer>>,
) {
  const provinces = await json<Array<{ code: string }>>(
    await request.get(`${apiUrl}/geography/provinces?countryCode=VN`),
  );
  const provinceCode = provinces[0]?.code;
  expect(provinceCode, "E2E province fixture is missing").toBeTruthy();
  const districts = await json<Array<{ code: string }>>(
    await request.get(
      `${apiUrl}/geography/districts?provinceCode=${encodeURIComponent(provinceCode!)}`,
    ),
  );
  const districtCode = districts[0]?.code;
  expect(districtCode, "E2E district fixture is missing").toBeTruthy();
  const wards = await json<Array<{ code: string }>>(
    await request.get(
      `${apiUrl}/geography/wards?districtCode=${encodeURIComponent(districtCode!)}`,
    ),
  );
  const wardCode = wards[0]?.code;
  expect(wardCode, "E2E ward fixture is missing").toBeTruthy();

  const address = await json<{ addressId: string }>(
    await request.post(`${apiUrl}/addresses`, {
      headers: authHeaders(user),
      data: {
        contactName: "Playwright Customer",
        phone: user.phone,
        provinceCode,
        districtCode,
        wardCode,
        detailAddress: "123 Playwright Street",
        type: "HOME",
        isDefault: true,
      },
    }),
  );
  return { ...address, provinceCode, districtCode, wardCode };
}

export { apiUrl, json };
