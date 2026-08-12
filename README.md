# Aionn Frontend

Aionn Frontend is a Next.js application for the Aionn e-commerce platform. It contains the public storefront, customer account, merchant console, and administration console.

## Local development

Requirements:

- Node.js 22
- npm
- A running Aionn backend for integrated flows

Create the local environment file:

```powershell
Copy-Item .env.example .env.local
```

Install dependencies and start the application:

```powershell
npm ci
npm run dev
```

The frontend starts on `http://localhost:3000`. The default API URL is `http://localhost:8080/api/v1`.

## Verification

```powershell
npm run verify
```

The verification pipeline checks encoding, API contracts, translations, architecture, design tokens, TypeScript, ESLint, unit-test coverage, dead code, and the production build.

Run Playwright after starting the backend manually:

```powershell
npm run e2e
```

## Documentation

- [Architecture](document/architecture.md): application layers, feature boundaries, state, and API access.
- [Coding conventions](document/coding-conventions.md): TypeScript, React, UI, errors, comments, and configuration.
- [Testing](document/testing.md): unit, integration, Playwright, coverage, and quality gates.
- [Operations](document/operations.md): environment variables, production build, security headers, and release verification.

Documentation describes the current system. Historical refactor plans and completed checklists do not belong in the repository.
