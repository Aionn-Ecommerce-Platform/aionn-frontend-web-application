# Code and UI Conventions

## 1. TypeScript and naming

- TypeScript strict mode is the baseline.
- Components and exported types use PascalCase; hooks start with `use`; services use a domain noun followed by `Service`.
- Avoid `any`, unsafe casts, duplicated backend contracts, and arbitrary abbreviations.
- Prefer immutable inputs and derived values over mirrored state.

## 2. React and Next.js

- Keep route files thin and move substantive UI into a feature.
- Add `"use client"` only where browser APIs, state, effects, or event handlers require it.
- Effects synchronize with external systems; they do not duplicate values that can be derived during render.
- Use `next/image` with an accurate aspect ratio and a `sizes` value for fill images.
- Every async screen provides meaningful loading, empty, and error states.

## 3. API and errors

- Services use the shared API client and typed request/response contracts.
- Paginated responses use the shared page shape rather than page-specific envelope parsing.
- User-facing failures use translated messages and preserve actionable backend error details.
- Never swallow an unexpected failure or log tokens, passwords, OTPs, payment data, or unnecessary personal data.

## 4. Styling and accessibility

- Reuse shared UI primitives and design tokens before adding page-local variants.
- Interactive elements use semantic controls, accessible names, keyboard focus, and valid disabled states.
- Visible product text is translated unless it is user-generated or provider-defined data.
- Responsive behavior is part of the component contract.

## 5. Comments

Comments explain only non-obvious constraints, invariants, or architectural decisions. Do not add section-label comments, historical narratives, or comments that repeat the code.

## 6. Configuration

- Browser-visible variables use the `NEXT_PUBLIC_` prefix and must never contain secrets.
- Local values belong in `.env.local`; committed placeholders belong in `.env.example`.
- Production origins, provider identifiers, and public keys come from deployment configuration.
