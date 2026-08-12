import { beforeEach, describe, expect, it } from "vitest";
import { ApiError } from "@/shared/api";
import { useLocaleStore } from "@/stores/locale.store";
import {
  NotImplementedError,
  getErrorMessage,
  getFieldErrors,
  isNotImplemented,
} from ".";

beforeEach(() => {
  useLocaleStore.setState({ locale: "vi" });
});

describe("getErrorMessage", () => {
  it("maps a known wire error code to a translated message", () => {
    const error = new ApiError("Invalid credentials", {
      status: 401,
      errorCode: "IDENTITY_203",
    });

    expect(getErrorMessage(error)).toBe(
      "Tên đăng nhập hoặc mật khẩu không chính xác.",
    );
  });

  it("translates the mapped code in the active locale", () => {
    useLocaleStore.setState({ locale: "en" });
    const error = new ApiError("Invalid credentials", {
      status: 401,
      errorCode: "IDENTITY_203",
    });

    expect(getErrorMessage(error)).not.toBe(
      "Tên đăng nhập hoặc mật khẩu không chính xác.",
    );
  });

  it("prefers a field error over the envelope message", () => {
    const error = new ApiError("Validation failed", {
      status: 400,
      fieldErrors: { email: "Email không hợp lệ" },
    });

    expect(getErrorMessage(error)).toBe("Email không hợp lệ");
  });

  it("falls back to the server message for unmapped codes", () => {
    const error = new ApiError("Warehouse is locked", {
      status: 409,
      errorCode: "INVENTORY_311",
    });

    expect(getErrorMessage(error)).toBe("Warehouse is locked");
  });

  it("uses the caller fallback for a value that is not an Error", () => {
    expect(getErrorMessage(null, "fallback text")).toBe("fallback text");
  });

  it("uses the translated default when no fallback is given", () => {
    expect(getErrorMessage(null)).toBe("Đã có lỗi xảy ra");
  });

  it("reports NotImplementedError as a feature gap, not a server error", () => {
    const message = getErrorMessage(
      new NotImplementedError("review.listForMerchant"),
    );

    expect(message).toBe(
      "Tính năng này chưa khả dụng. Chúng tôi đang hoàn thiện.",
    );
  });

  it("returns the message of a plain Error", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });
});

describe("isNotImplemented", () => {
  it("recognises NotImplementedError", () => {
    expect(isNotImplemented(new NotImplementedError("x"))).toBe(true);
  });

  it("rejects other errors", () => {
    expect(isNotImplemented(new Error("x"))).toBe(false);
    expect(isNotImplemented(new ApiError("x", { status: 500 }))).toBe(false);
  });
});

describe("getFieldErrors", () => {
  it("returns the field errors of an ApiError", () => {
    const error = new ApiError("Validation failed", {
      status: 400,
      fieldErrors: { name: "required" },
    });

    expect(getFieldErrors(error)).toEqual({ name: "required" });
  });

  it("returns an empty object for anything else", () => {
    expect(getFieldErrors(new Error("x"))).toEqual({});
    expect(getFieldErrors(undefined)).toEqual({});
  });
});
