---
name: turnolink-e2e
description: >-
  TurnoLink product conventions for Playwright journeys (URLs, seed vs prepare,
  helpers, fixtures, tags, coverage). Use after playwright-web-tester.
  Follow AGENTS.md. For Django seed/prepare changes use playwright-e2e-fixtures
  from the web-testing plugin (product paths: companies.e2e / e2e_prepare).
---

# TurnoLink E2E overlay

Product-specific only. Strategy/CLI → plugin **web-testing**. Gates →
**[AGENTS.md](../../../AGENTS.md)** (read the **Fast path** there). Backend data
patterns → **`playwright-e2e-fixtures`** (same plugin). Local modules:
`companies.e2e` + `e2e_prepare` scenarios.

When asked to create a journey: curl + helpers → CLI → write. Do not re-read this
file or AGENTS if already loaded; do not mine frontend source for locators while
the stack is up; if the stack is down, ask once and stop.

## Seed vs prepare

| Need | Command / helper |
|------|------------------|
| Shared booking tenant (owner, company, hours, variant) | `npm run seed` / `npm run reset` |
| Journey-specific starting state (e.g. onboarding step 0) | `npm run e2e:prepare -- <scenario>` or `prepareE2eScenario` / `prepareE2eOnboardingUser` |

Do **not** add a new manage.py or npm script per journey. Register scenarios on
backend `e2e_prepare`. Parallel onboarding variants use distinct `--email` values.

## URLs and safety

- Prefer `.env` via `src/apps.ts` / `src/env.ts`. Typical local: public `:3000`,
  professional `:3001`, API `:8000`.
- Writes: local only (`src/safety.ts` + fixture `localWrites`).
- No new Python venv in this repo.

## Helpers and fixtures

**Prefer `fixtures/e2e.ts`:**

| Fixture | Use |
|---------|-----|
| `recordedPage` | Single-tab journey (auto video + close) |
| `createRecordedContext` | Multi-app / multi-tab (auto-closes all) |
| `localWrites` | Skip on `TARGET_ENV=production` |
| `seededProfessional` | Require seed credentials |
| `seededCompany` | Require `E2E_ALLOWED_COMPANY_SLUG` |

```ts
import { test, expect } from '../../fixtures/e2e';
```

**Reuse `src/` before inventing:** `booking.ts`, `professionalAuth.ts`,
`appointments.ts`, `browser.ts`, `calendar.ts`, `onboarding.ts`, `services.ts`,
`djangoManage.ts`.

Locators: login `#email` `#password`; booking preview `#name` `#phone` `#email`;
Reservas `#search`. Custom Inputs often lack labels — prefer role + heading;
`data-testid` only if needed.

## Layout and tags

- Specs: `tests/` with `@smoke` / `@auth` / `@journey`
- Onboarding variants: `tests/journeys/onboarding/`
- Externals: `tests/integrations/` + `@integration` / `@calendar` (opt-in scripts)
- Static images: `fixtures/images/` (not Playwright fixtures)

## Anti-patterns

- Duplicating helper steps inline in a new `.spec`
- New Django command for one journey (extend `e2e_prepare`)
- OAuth / Mercado Pago UI unless dedicated
- Playwright MCP (Hermes) for normal authoring
- Inventing locators when the stack is down

## Coverage

**Done:** smoke; professional auth; book → Reservas → delete; book → Google
Calendar; onboarding (happy / domicilio / multi-schedule / images); create
company service; production read-only.

**Next (local writes):** cancel appointment, embed, clients after booking,
calendar page, company config (no OAuth), discounts.
