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

When asked to create a journey: curl + helpers → **CLI open same turn** → write.
Do not re-read this file or AGENTS if already loaded; do not mine frontend source
for locators while the stack is up; if the stack is down, ask once and stop.

## Ownership

| Repo | Owns |
|------|------|
| Testing | Specs, `src/` helpers, `fixtures/e2e.ts`, `.env.example` |
| Public / professional web | Labels, roles, sparse `data-testid` |
| Backend | `e2e_seed` / `e2e_prepare`, stable fixture display names |

## CLI auth (professional panel)

Use Playwright CLI — not temporary explore specs. **Not** Hermes MCP (`agents/`).

```text
npm run cli:professional
# or: npx playwright cli -s=pro open $PROFESSIONAL_WEB_URL --headed
```

Then authenticate **inline** (no new repo files):

1. **UI login:** `run-code` loads `.env` via dotenv, fills `#email` / `#password`,
   submits — never put secrets in shell argv.
2. **Or API cookie:** `run-code` POSTs `login/` and `addCookies` with the same
   `tl_admin_auth` cookie shape as `loginProfessionalViaApi` / `toAuthCookieValue`,
   then `goto` the target route.

Keep the session open; `find` / `generate-locator` / small snapshots only.
`state-save` under `.playwright-cli/` is optional and must stay gitignored —
do not commit auth dumps.

If a policy gate blocks credential use in the shell: ask once or request
approval. **Never** add `tests/**/_explore*.spec.ts` or `scripts/save-*-auth.*`
as a workaround.

## Seed vs prepare

| Need | Command / helper |
|------|------------------|
| Shared booking tenant (owner, company, hours, variant) | `npm run seed` / `npm run reset` |
| Journey-specific starting state (e.g. onboarding step 0) | `npm run e2e:prepare -- <scenario>` or `prepareE2eScenario` / `prepareE2eOnboardingUser` |

Do **not** add a new manage.py or npm script per journey. Register scenarios on
backend `e2e_prepare`. Parallel onboarding variants use distinct `--email` values.

### Parallel / shared seed

- Default suite is `fullyParallel`. Created names/emails/phones → `src/unique.ts`.
- **Safe in parallel:** create service / employee / branch / book→panel (unique data).
- **Mutate shared company settings** (online booking flags, Horarios, interval):
  use `try/finally` restore; run via `npm run test:journeys` (`--workers=1`) so
  they do not overlap booking journeys that assume seed defaults.
- **Onboarding:** always distinct prepare emails (already per variant).
- **Friend/setup-style ordering is N/A** on web; prefer prepare over chaining
  journeys that depend on another spec’s side effects.

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
| `loggedInProfessionalPage` | Panel-only; API cookie auth (implies `seededProfessional`) |
| `createRecordedContext` | Multi-app / multi-tab (auto-closes all) |
| `localWrites` | Skip on `TARGET_ENV=production` |
| `seededProfessional` | Require seed credentials |
| `seededCompany` | Require `E2E_ALLOWED_COMPANY_SLUG` |

```ts
import { test, expect } from '../../fixtures/e2e';
```

**Reuse `src/` before inventing:** `booking.ts`, `professionalAuth.ts`,
`appointments.ts`, `browser.ts`, `calendar.ts`, `onboarding.ts`, `services.ts`,
`employees.ts`, `branches.ts`, `companyConfig.ts`, `overlays.ts`, `unique.ts`,
`djangoManage.ts`.

Suite timeout is **180s** (`playwright.config.ts`). Override only for slow
integrations (Calendar).

## Tips

- Exact Spanish CTAs: `getByRole('button', { name: 'Continuar', exact: true })`.
- Click with no navigation → overlay first (`src/overlays.ts`), not a retry.
- No `waitForTimeout` / `sleep`. No `.first()` / `.nth()` to heal strict mode.
- Optional modals/portals: dismiss if present; absence must not fail.
- New entities: `uniqueLabel` / `uniqueEmail` / `uniquePhone` / `uniqueStamp`.

## This app (locator cheat-sheet)

| What you see | Use |
|--------------|-----|
| Professional login | `#email`, `#password`, button `Ingresar` |
| Booking preview form | `#name`, `#phone`, `#email` |
| Reservas search | `#search` |
| Company name / config fields | `#companyName` and other `#id`s — Custom Inputs often lack labels |
| Onboarding Continuar | `getByRole('button', { name: 'Continuar', exact: true })` |
| Onboarding help | `dismissHelpModalIfPresent` / `dismissNonEssentialOverlays` |
| Local Next.js badge blocking tabs | `dismissNextjsPortalIfPresent` |
| Seeded booking variant | Text `30 min` (exact) on public services |
| Seeded employee branch | Combobox option `E2E Branch` |
| Seeded category | `E2E Category` |
| Config tabs | `getByRole('tab', { name: 'Datos básicos' })` etc. |
| Online booking interval | Heading `Habilitar reservas cada` → following combobox |
| Comboboxes without names | Today: `.nth(n)` in helpers — **prefer fixing product labels** via `playwright-testable-ui` before adding more index locators |
| Booking calendar day | Helper uses MUI `.MuiTypography-body2` — explore with CLI; do not copy blindly into a new spec |
| Public Información | Tab / text `Información`; dismiss portal before click |

## Layout and tags

- Specs: `tests/` with `@smoke` / `@auth` / `@journey`
- Onboarding variants: `tests/journeys/onboarding/`
- Externals: `tests/integrations/` + `@integration` / `@calendar` (opt-in scripts)
- Static images: `fixtures/images/` (not Playwright fixtures)

## Anti-patterns

- Duplicating helper steps inline in a new `.spec`
- New Django command for one journey (extend `e2e_prepare`)
- OAuth / Mercado Pago UI unless dedicated
- Playwright MCP (Hermes) for normal authoring — see `agents/` only for optional Hermes runs
- Inventing locators when the stack is down
- Temporary `_explore*.spec.ts` / auth-save scripts instead of CLI exploration
- Delaying CLI open after curl-ok to re-read skills or invent tooling
- Hardcoding passwords or seed emails in prompts/docs
- `Date.now()` alone for parallel-safe names (use `src/unique.ts`)

## Coverage

**Done:** smoke; professional auth; book → Reservas → delete; book → Google
Calendar; onboarding (happy / domicilio / multi-schedule / images); create
company service; create company employee (Manager + reopen detalle); create
company branch (virtual + asignable a empleado); company config Datos básicos
(persist + agenda pública Información); company config Reservas Online
(intervalo al guardar + restore); company config Horarios (Apertura/Cierre via
accessible names + restore); cancel appointment (Estado Cancelado); client after
booking; embed booking; multi-service booking; employee capacity (aforo)
journey; production read-only.

**Next (local writes):** calendar page, Medios de Pago / OAuth, discounts,
Recursos compartidos, richer employee notif edge cases.

**Known product debt (testable-ui):** remaining unlabeled fields outside shared
`Input` / `SelectInput` / `TimeInput`, icon-only row actions, booking calendar
day cells.
