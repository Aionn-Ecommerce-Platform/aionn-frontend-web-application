# Operations and Configuration

## 1. Environment

Copy `.env.example` to `.env.local` for development. Only values prefixed with `NEXT_PUBLIC_` are embedded into browser bundles; treat every such value as public.

Required integrated-development values:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_API_ORIGIN`

Provider identifiers and publishable keys are optional until their feature is exercised. Server-side secrets remain in the backend or deployment secret manager.

## 2. Production build

```powershell
npm ci
npm run verify
npm run start
```

Deploy the output of `npm run build` with Node.js 22. Do not deploy `.env.local`, test reports, coverage output, caches, editor state, or agent worktrees.

## 3. Security headers

`next.config.ts` applies CSP, HSTS, frame denial, MIME sniffing protection, referrer policy, and permissions policy. Production CSP excludes `unsafe-eval`. Review provider origins whenever an external integration changes.

## 4. Observability and failures

- Unexpected browser failures use the shared logger and route error boundaries.
- Authentication refresh and logout behavior are centralized in the API client and auth store.
- Provider failures must produce a stable user-facing state rather than a blank or crashed page.
- Source maps, browser telemetry, and deployment monitoring are configured by the hosting platform and must not expose secrets.

## 5. Release verification

Before release, verify:

- `npm ci` succeeds from the lockfile.
- `npm run verify` succeeds.
- Playwright passes against the intended backend environment.
- Production environment variables use the correct HTTPS origins and public provider identifiers.
- `.env.local`, build caches, coverage, reports, and local tooling directories are absent from the release artifact.
