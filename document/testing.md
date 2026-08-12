# Testing and Quality

## 1. Strategy

Tests protect behavior, boundaries, accessibility, and failure modes. Coverage is a signal, not a reason to weaken assertions or test implementation details.

| Area                                 | Strategy                                      |
| ------------------------------------ | --------------------------------------------- |
| Pure utilities and domain helpers    | Vitest unit tests                             |
| Hooks, stores, forms, and components | Testing Library with user-visible assertions  |
| Accessibility-sensitive UI           | Testing Library and `vitest-axe`              |
| API transport and services           | Typed request/response and failure-path tests |
| Customer journeys and route guards   | Playwright in Chromium                        |
| Architecture and repository rules    | Scripts under `scripts/`                      |

## 2. Test rules

- Tests are deterministic and do not call the public internet.
- External providers are mocked or use an explicit sandbox outside the default CI suite.
- Prefer accessible roles and names over CSS selectors in browser tests.
- Seed only the data required by the scenario and isolate mutable test state.
- Cover success, validation, authorization, empty, unavailable, and retryable failure behavior where relevant.

## 3. Commands

```powershell
npm test
npm run test:cov
npm run e2e
npm run verify
```

Playwright expects the backend at `E2E_API_URL` and starts the frontend unless `E2E_EXTERNAL_FRONTEND=true` points it at an already running instance.

## 4. Completion criteria

- Relevant unit and browser tests pass.
- Coverage meets the configured thresholds.
- Assertions describe observable behavior and are not weakened to hide a defect.
- TypeScript, ESLint, dead-code, architecture, and production-build gates pass.
