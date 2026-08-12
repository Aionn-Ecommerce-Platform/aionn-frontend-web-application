import { expect, test } from "@playwright/test";
import { loginThroughUi, registerCustomer } from "./helpers/backend";

test("a newly registered customer can log in and reach the account page", async ({
  page,
  request,
}) => {
  const user = await registerCustomer(request);
  await loginThroughUi(page, user);
  await expect(page.locator("main")).toBeVisible();
});
