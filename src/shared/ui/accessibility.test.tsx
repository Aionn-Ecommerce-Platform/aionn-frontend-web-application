import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import Button from "./Button";
import Input from "./Input";

describe("shared form controls", () => {
  it("has no detectable accessibility violations", async () => {
    const { container } = render(
      <form aria-label="Account details">
        <Input label="Email" type="email" required />
        <Input label="Phone" error="Invalid phone number" />
        <Button type="submit">Save</Button>
      </form>,
    );

    const result = await axe(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(result.violations).toEqual([]);
  });
});
