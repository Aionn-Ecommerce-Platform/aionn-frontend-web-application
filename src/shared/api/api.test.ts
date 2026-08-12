import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  request,
  requestEnvelope,
  requestPage,
  setUnauthorizedHandler,
  tokenStore,
} from ".";

function jsonResponse(body: unknown, init: { status?: number } = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "Content-Type": "application/json" },
  });
}

function envelope<T>(data: T, message = "ok") {
  return {
    success: true,
    statusCode: "200",
    message,
    data,
    timestamp: "2026-01-01T00:00:00Z",
  };
}

const TOKEN_FIELDS = {
  refreshToken: "refresh-token",
  expiresAt: "2026-01-01T01:00:00Z",
  sessionExpiresAt: "2026-01-08T00:00:00Z",
  sessionId: "session-1",
  userId: "user-1",
};

let fetchMock: ReturnType<typeof vi.fn>;

function firstFetchCall() {
  const call = fetchMock.mock.calls[0];
  if (!call) throw new Error("Expected fetch to be called");
  return call;
}

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  tokenStore.setTokens(null);
  setUnauthorizedHandler(null);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("request", () => {
  it("unwraps the envelope data", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(envelope({ id: "p1" })));

    await expect(
      request<{ id: string }>("/catalog/products/p1"),
    ).resolves.toEqual({ id: "p1" });
  });

  it("returns undefined for a 204 response", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await expect(request("/catalog/products/p1")).resolves.toBeUndefined();
  });

  it("sends the access token when one is present", async () => {
    tokenStore.setTokens({
      accessToken: "token-abc",
      ...TOKEN_FIELDS,
    });
    fetchMock.mockResolvedValueOnce(jsonResponse(envelope(null)));

    await request("/users/me");

    const headers = new Headers(firstFetchCall()[1].headers);
    expect(headers.get("Authorization")).toBe("Bearer token-abc");
  });

  it("always sends an Accept-Language header", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(envelope(null)));

    await request("/users/me");

    const headers = new Headers(firstFetchCall()[1].headers);
    expect(headers.get("Accept-Language")).toBe("vi");
  });

  it("appends query params and skips null or undefined values", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(envelope(null)));

    await request("/catalog/products", {
      query: { page: 0, size: 20, status: undefined, brand: null },
    });

    const url = new URL(firstFetchCall()[0]);
    expect(url.searchParams.get("page")).toBe("0");
    expect(url.searchParams.get("size")).toBe("20");
    expect(url.searchParams.has("status")).toBe(false);
    expect(url.searchParams.has("brand")).toBe(false);
  });

  it("sends an Idempotency-Key when asked", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(envelope(null)));

    await request("/ordering/orders", {
      method: "POST",
      body: {},
      idempotent: "key-123",
    });

    const headers = new Headers(firstFetchCall()[1].headers);
    expect(headers.get("Idempotency-Key")).toBe("key-123");
  });
});

describe("error mapping", () => {
  it("maps an error envelope onto ApiError", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          success: false,
          statusCode: "401",
          message: "Invalid credentials",
          data: { errorCode: "IDENTITY_203", domain: "identity" },
          timestamp: "2026-01-01T00:00:00Z",
        },
        { status: 401 },
      ),
    );

    const error = await request("/auth/login", {
      method: "POST",
      body: {},
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.status).toBe(401);
    expect(apiError.errorCode).toBe("IDENTITY_203");
    expect(apiError.message).toBe("Invalid credentials");
  });

  it("exposes the first field error", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          success: false,
          statusCode: "400",
          message: "Validation failed",
          data: { fieldErrors: { email: "Email is required" } },
          timestamp: "2026-01-01T00:00:00Z",
        },
        { status: 400 },
      ),
    );

    const error = (await request("/users").catch(
      (e: unknown) => e,
    )) as ApiError;

    expect(error.firstFieldError).toBe("Email is required");
  });

  it("falls back to an HTTP status message when the body is not JSON", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("<html>gateway timeout</html>", { status: 504 }),
    );

    const error = (await request("/users").catch(
      (e: unknown) => e,
    )) as ApiError;

    expect(error.status).toBe(504);
    expect(error.message).toBe("HTTP 504");
  });
});

describe("401 handling", () => {
  it("refreshes once and replays the original request", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(
        jsonResponse(envelope({ accessToken: "fresh", ...TOKEN_FIELDS })),
      )
      .mockResolvedValueOnce(jsonResponse(envelope({ id: "u1" })));

    await expect(request<{ id: string }>("/users/me")).resolves.toEqual({
      id: "u1",
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(tokenStore.getAccessToken()).toBe("fresh");
  });

  it("clears tokens and notifies the handler when refresh fails", async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    tokenStore.setTokens({
      accessToken: "stale",
      ...TOKEN_FIELDS,
    });

    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 401 }));

    const error = (await request("/users/me").catch(
      (e: unknown) => e,
    )) as ApiError;

    expect(error.status).toBe(401);
    expect(tokenStore.getAccessToken()).toBeNull();
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it("does not refresh on the login endpoint", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 401 }));

    await request("/auth/login", { method: "POST", body: {} }).catch(() => {});

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not refresh on the refresh endpoint itself", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 401 }));

    await request("/auth/refresh", { method: "POST" }).catch(() => {});

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not refresh when skipAuthRetry is set", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 401 }));

    await request("/users/me", { skipAuthRetry: true }).catch(() => {});

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not send credentials or refresh for anonymous requests", async () => {
    tokenStore.setTokens({
      accessToken: "token-abc",
      ...TOKEN_FIELDS,
    });
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 401 }));

    await request("/catalog/products", { anonymous: true }).catch(() => {});

    const headers = new Headers(firstFetchCall()[1].headers);
    expect(headers.has("Authorization")).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("shares a single refresh across concurrent 401s", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes("/auth/refresh")) {
        return Promise.resolve(
          jsonResponse(envelope({ accessToken: "fresh", ...TOKEN_FIELDS })),
        );
      }
      if (tokenStore.getAccessToken() === "fresh") {
        return Promise.resolve(jsonResponse(envelope({ ok: true })));
      }
      return Promise.resolve(new Response(null, { status: 401 }));
    });

    await Promise.all([request("/users/me"), request("/users/addresses")]);

    const refreshCalls = fetchMock.mock.calls.filter((call) =>
      String(call[0]).includes("/auth/refresh"),
    );
    expect(refreshCalls).toHaveLength(1);
  });
});

describe("requestEnvelope", () => {
  it("returns the whole envelope including paging", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        ...envelope([{ id: "u1" }]),
        paging: { page: 0, size: 20, totalElements: 1, totalPages: 1 },
      }),
    );

    const result = await requestEnvelope<{ id: string }[]>("/admin/users");

    expect(result.data).toEqual([{ id: "u1" }]);
    expect(result.paging?.totalElements).toBe(1);
  });

  it("throws when the response has no body", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await expect(requestEnvelope("/admin/users")).rejects.toBeInstanceOf(
      ApiError,
    );
  });

  it("uses the same refresh rules as request", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 401 }));

    await requestEnvelope("/auth/login", { method: "POST" }).catch(() => {});

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("requestPage", () => {
  it("combines envelope data and paging metadata", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        ...envelope([{ id: "p1" }]),
        paging: { page: 2, size: 10, totalElements: 31, totalPages: 4 },
      }),
    );

    await expect(
      requestPage<{ id: string }>("/catalog/products/search"),
    ).resolves.toEqual({
      content: [{ id: "p1" }],
      page: 2,
      size: 10,
      totalElements: 31,
      totalPages: 4,
    });
  });

  it("derives safe metadata when paging is absent", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(envelope([{ id: "p1" }, { id: "p2" }])),
    );

    const result = await requestPage<{ id: string }>(
      "/catalog/products/search",
    );

    expect(result).toMatchObject({
      page: 0,
      size: 2,
      totalElements: 2,
      totalPages: 1,
    });
  });

  it("treats null data as an empty page", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(envelope(null)));

    await expect(requestPage("/catalog/products/search")).resolves.toEqual({
      content: [],
      page: 0,
      size: 0,
      totalElements: 0,
      totalPages: 0,
    });
  });

  it("treats a 204 response as an empty page", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await expect(requestPage("/catalog/products/search")).resolves.toEqual({
      content: [],
      page: 0,
      size: 0,
      totalElements: 0,
      totalPages: 0,
    });
  });
});
