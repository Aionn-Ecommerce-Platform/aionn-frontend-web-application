# System Architecture

## 1. System model

Aionn Frontend is a Next.js App Router application. Routes compose feature views; features own business-facing UI; shared packages own reusable infrastructure and primitives.

```text
app -> features -> shared
app -> shared
features -X-> other feature internals
shared -X-> features or app
```

The architecture check in `scripts/check-architecture.mjs` enforces these dependency directions.

## 2. Canonical structure

```text
src/
  app/                 route shells, metadata, layouts, route errors
  features/<domain>/   domain UI, hooks, and feature-local components
  components/          cross-feature composed components
  hooks/               application-wide hooks
  stores/              client state with explicit ownership
  lib/                  application services and query keys
  shared/
    api/                HTTP transport and response-envelope handling
    lib/                framework-independent utilities
    types/              backend-facing TypeScript contracts
    ui/                 reusable UI primitives
  i18n/                 locale state, translation lookup, and messages
```

Features expose their public surface through `index.ts`. Code outside a feature does not import its internal files.

## 3. Data and state

- TanStack Query owns remote server state and cache invalidation.
- Zustand stores own authentication, cart, locale, and small cross-route client state.
- Component state owns temporary form and presentation state.
- Query keys come from `src/lib/query-keys.ts`.
- HTTP calls go through `src/shared/api`; components do not call `fetch` directly for application APIs.

## 4. Authentication and authorization

Access tokens remain in memory. Refresh uses the backend session cookie. `AuthInitializer` restores the session, and `AuthGuard` protects customer, merchant, and administrator views. UI guards improve navigation but never replace backend authorization.

## 5. External providers

Stripe, Google, Facebook, reCAPTCHA, Cloudinary-hosted media, and backend WebSocket/API connections are configured through environment variables and the Content Security Policy. Secret provider keys never belong in browser variables.

## 6. Completion criteria

- Architecture, API-contract, encoding, translation, and design checks pass.
- TypeScript and ESLint pass without new suppressions.
- Unit coverage and dead-code checks pass.
- The production build succeeds with production-safe configuration.
- Important customer flows pass Playwright against an available backend.
