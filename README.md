# TurnoLink E2E

End-to-end tests for TurnoLink with [Playwright](https://playwright.dev/).
Independent of the Django/Next repos: it drives them via URLs in `.env`.

Agent rules: **[AGENTS.md](AGENTS.md)**. Install company plugins from
**company-agent-toolkit**: `web-testing` + `turnolink-e2e`.

## Layers

| Layer | Path | Purpose |
|-------|------|---------|
| Smoke | `tests/smoke/` | App reachable |
| Auth | `tests/auth/` | Professional login (needs `npm run seed`) |
| Journeys | `tests/journeys/` | Cross-app business flows |
| Integrations | `tests/integrations/` | Externals (Calendar, …) — opt-in |
| Production | `tests/production/` | Read-only against live production |

```text
turnolink-testing
  ├─ browser → turnolink-web              (PUBLIC_WEB_URL)
  ├─ browser → turnolink-professional-web (PROFESSIONAL_WEB_URL)
  └─ HTTP    → turnolink-backend API      (API_BASE_URL)
```

`baseURL` is the public web. Multi-app journeys open extra contexts via
`fixtures/e2e.ts` (`createRecordedContext`).

## Layout

```text
tests/{smoke,auth,journeys,integrations,production}/
fixtures/e2e.ts          # Playwright fixtures
fixtures/images/         # Static upload assets
src/                     # Helpers (booking, auth, overlays, unique, …)
scripts/                 # check-env, env-smoke, explore-cli, a11y-dump, django-e2e
artifacts/               # gitignored reports/videos
```

| I want to… | Put it in… |
|------------|------------|
| Reachability check | `tests/smoke/` |
| Login / session | `tests/auth/` + `src/professionalAuth.ts` |
| Business journey | `tests/journeys/` + `src/*` helpers + `fixtures/e2e` |
| Google Calendar etc. | `tests/integrations/` + `src/calendar.ts` |
| Production read-only | `tests/production/` |
| Django seed/prepare | `npm run seed` / `reset` / `e2e:prepare -- <scenario>` |

## Backend data

Domain fixtures live in **turnolink-backend** (`e2e_seed`, `e2e_reset`, `e2e_prepare`).
Use the backend **existing venv** — never create one here.

```bash
npm run seed
npm run reset
npm run e2e:prepare -- onboarding
```

| Scenario | Purpose |
|----------|---------|
| `onboarding` | User at step 0 + company/branch (skips email verify). Distinct `--email` per parallel spec. |

Guards: blocked when `DJANGO_ENV=production` unless `E2E_TOOLS_ENABLED=true`.
Fixture patterns: plugin skill **`playwright-e2e-fixtures`** (web-testing).

## Environments

| Env | Writes | Suite |
|-----|--------|-------|
| `local` | Yes | smoke + auth + journeys (integrations opt-in) |
| `production` | **No** | `tests/production` only (`npm run test:production`) |

Production refuses localhost URLs, seed/reset, and mutating helpers.

## Local setup

Ports: public `:3000`, professional `:3001`, API `:8000`.

```bash
# Stack already running in their repos, then:
cd turnolink-testing
cp .env.example .env
npm install
npx playwright install chromium
npm run seed
npm run env:smoke
npm run test:smoke
npm run test:auth
npm run test:journeys
```

Videos default to on (`E2E_VIDEO=on`). Open report: `npm run report`.

## npm scripts

| Script | Description |
|--------|-------------|
| `npm test` | Local suite excluding `@integration` |
| `test:smoke` / `test:auth` / `test:journeys` | Filtered runs (`journeys` uses `--workers=1`) |
| `test:integrations` / `test:calendar` | Opt-in externals |
| `test:all` | Everything including integrations |
| `test:production` | Read-only production |
| `seed` / `reset` / `e2e:prepare` | Django fixtures via backend venv |
| `calendar:status` | Google Calendar connection check |
| `check-env` / `env:smoke` | Config validation / URL reachability |
| `cli` / `cli:public` / `cli:professional` | Playwright CLI open |
| `explore:public` / `explore:professional` | CLI open + auth snippet for panel |
| `a11y:dump` | Compact role\|name dump for a URL (`--auth-pro` optional) |
| `report` / `test:headed` / `test:ui` / `test:debug` | Artifacts & debug |

Env vars: [`.env.example`](.env.example).

### Seed vs prepare

- **seed** — shared tenant for booking / panel journeys (`E2E_PROFESSIONAL_*`).
- **e2e:prepare** — journey-specific state (onboarding). Specs usually call it via helpers.

## Playwright CLI (Cursor)

Stack must be up. Prefer CLI while authoring; specs remain the source of truth.

```bash
npm run explore:professional
# or: npm run cli:public
```

Do not use CLI against production. Snapshots are gitignored under `.playwright-cli/`.

## Locators

Prefer `getByRole` / `getByLabel` / `getByText`, then `getByTestId`. Avoid brittle CSS.
Product tips: toolkit skill **turnolink-e2e**. Unique data: `src/unique.ts`.
Overlays: `src/overlays.ts`.

## Roadmap (short)

Done: scaffold, auth, seed/reset/prepare, book→panel, Calendar, onboarding,
create service, create employee/branch, company config (datos básicos + reservas
online + horarios), cancel / client / embed / multi-service / employee capacity
journeys, production read-only, CLI.

Next: calendar page, discounts, Medios de Pago / OAuth; CI deferred; controlled
production writes later.
