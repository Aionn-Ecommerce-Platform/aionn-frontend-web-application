import type {
  ApiEnvelope,
  ApiErrorBody,
  AuthTokens,
  PageResult,
} from "@/types";
import { useLocaleStore } from "@/stores/locale.store";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

export class ApiError extends Error {
  status: number;
  errorCode?: string;
  domain?: string;
  fieldErrors?: Record<string, string>;
  raw?: unknown;

  constructor(
    message: string,
    options: {
      status: number;
      errorCode?: string;
      domain?: string;
      fieldErrors?: Record<string, string>;
      raw?: unknown;
    },
  ) {
    super(message);
    this.name = "ApiError";
    this.status = options.status;
    this.errorCode = options.errorCode;
    this.domain = options.domain;
    this.fieldErrors = options.fieldErrors;
    this.raw = options.raw;
  }

  get firstFieldError(): string | undefined {
    if (!this.fieldErrors) return undefined;
    const v = Object.values(this.fieldErrors)[0];
    return v;
  }
}

type TokenListener = (tokens: AuthTokens | null) => void;

class TokenStore {
  private accessToken: string | null = null;
  private currentTokens: AuthTokens | null = null;
  private listeners = new Set<TokenListener>();

  setTokens(tokens: AuthTokens | null) {
    this.currentTokens = tokens;
    this.accessToken = tokens?.accessToken ?? null;
    for (const l of this.listeners) l(tokens);
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getTokens(): AuthTokens | null {
    return this.currentTokens;
  }

  subscribe(listener: TokenListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const tokenStore = new TokenStore();

let refreshPromise: Promise<AuthTokens | null> | null = null;
let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

async function performRefresh(): Promise<AuthTokens | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!res.ok) return null;
    const envelope = (await res.json()) as ApiEnvelope<AuthTokens>;
    if (!envelope?.data?.accessToken) return null;
    tokenStore.setTokens(envelope.data);
    return envelope.data;
  } catch {
    return null;
  }
}

function refreshTokens(): Promise<AuthTokens | null> {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;

  anonymous?: boolean;

  skipAuthRetry?: boolean;
  signal?: AbortSignal;

  idempotent?: boolean | string;
}

function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  const rnd = () => Math.random().toString(16).slice(2, 10);
  return `${rnd()}-${rnd().slice(0, 4)}-${rnd().slice(0, 4)}-${rnd().slice(0, 4)}-${rnd()}${rnd().slice(0, 4)}`;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(
    path.startsWith("http") ? path : `${API_BASE_URL}${path}`,
  );
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      url.searchParams.append(k, String(v));
    }
  }
  return url.toString();
}

async function readEnvelope<T>(res: Response): Promise<ApiEnvelope<T> | null> {
  if (res.status === 204) return null;
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as ApiEnvelope<T>;
  } catch {
    return null;
  }
}

async function rawFetch(
  url: string,
  init: RequestInit,
  opts: RequestOptions,
): Promise<Response> {
  const headers = new Headers(init.headers);

  if (!headers.has("Accept-Language")) {
    headers.set("Accept-Language", useLocaleStore.getState().locale || "vi");
  }
  if (
    !headers.has("Content-Type") &&
    init.body &&
    typeof init.body === "string"
  ) {
    headers.set("Content-Type", "application/json");
  }
  if (!opts.anonymous) {
    const token = tokenStore.getAccessToken();
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }
  if (opts.idempotent && !headers.has("Idempotency-Key")) {
    headers.set(
      "Idempotency-Key",
      typeof opts.idempotent === "string"
        ? opts.idempotent
        : newIdempotencyKey(),
    );
  }

  return fetch(url, {
    ...init,
    headers,
    credentials: "include",
  });
}

const AUTH_PATHS_WITHOUT_REFRESH = [
  "/auth/refresh",
  "/auth/login",
  "/auth/social-login",
];

function shouldAttemptRefresh(path: string, opts: RequestOptions): boolean {
  if (opts.anonymous || opts.skipAuthRetry) return false;
  return !AUTH_PATHS_WITHOUT_REFRESH.some((authPath) =>
    path.includes(authPath),
  );
}

function toApiError(
  res: Response,
  envelope: ApiEnvelope<unknown> | null,
): ApiError {
  const errBody = (envelope?.data as ApiErrorBody | null) ?? null;
  return new ApiError(envelope?.message ?? `HTTP ${res.status}`, {
    status: res.status,
    errorCode: errBody?.errorCode,
    domain: errBody?.domain,
    fieldErrors: errBody?.fieldErrors,
    raw: envelope ?? undefined,
  });
}

async function execute<T>(
  path: string,
  opts: RequestOptions,
): Promise<ApiEnvelope<T> | null> {
  const url = buildUrl(path, opts.query);
  const init: RequestInit = {
    method: opts.method ?? "GET",
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    headers: opts.headers,
    signal: opts.signal,
  };

  let res = await rawFetch(url, init, opts);

  if (res.status === 401 && shouldAttemptRefresh(path, opts)) {
    const refreshed = await refreshTokens();
    if (refreshed) {
      res = await rawFetch(url, init, opts);
    } else {
      tokenStore.setTokens(null);
      if (onUnauthorized) onUnauthorized();
    }
  }

  const envelope = await readEnvelope<T>(res);
  if (!res.ok) throw toApiError(res, envelope);
  return envelope;
}

export async function request<T>(
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const envelope = await execute<T>(path, opts);
  if (envelope === null) return undefined as T;
  return envelope.data;
}

export async function requestEnvelope<T>(
  path: string,
  opts: RequestOptions = {},
): Promise<ApiEnvelope<T>> {
  const envelope = await execute<T>(path, opts);
  if (!envelope) throw new ApiError("Empty response", { status: 204 });
  return envelope;
}

export async function requestPage<T>(
  path: string,
  opts: RequestOptions = {},
): Promise<PageResult<T>> {
  const envelope = await execute<T[]>(path, opts);
  const content = envelope?.data ?? [];
  const paging = envelope?.paging;
  const page = paging?.page ?? 0;
  const size = paging?.size ?? content.length;
  const totalElements = paging?.totalElements ?? content.length;
  const totalPages =
    paging?.totalPages ?? (size > 0 ? Math.ceil(totalElements / size) : 0);

  return { content, page, size, totalElements, totalPages };
}

const api = {
  get: <T>(path: string, opts?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "GET" }),
  post: <T>(
    path: string,
    body?: unknown,
    opts?: Omit<RequestOptions, "method" | "body">,
  ) => request<T>(path, { ...opts, method: "POST", body }),
  put: <T>(
    path: string,
    body?: unknown,
    opts?: Omit<RequestOptions, "method" | "body">,
  ) => request<T>(path, { ...opts, method: "PUT", body }),
  patch: <T>(
    path: string,
    body?: unknown,
    opts?: Omit<RequestOptions, "method" | "body">,
  ) => request<T>(path, { ...opts, method: "PATCH", body }),
  delete: <T>(path: string, opts?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "DELETE" }),
  envelope: requestEnvelope,
  page: requestPage,
};

export default api;
