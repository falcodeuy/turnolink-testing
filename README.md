# TurnoLink E2E

End-to-end tests for TurnoLink with [Playwright](https://playwright.dev/).
Independent of the Django/Next repos: it drives them via URLs in `.env`.

Agent rules: **[AGENTS.md](AGENTS.md)**. Product skill: `.agents/skills/turnolink-e2e/`.

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
fixtures/e2e.ts          # Playwright fixtures (recorded page/context, skips)
fixtures/images/         # Static upload assets
src/                     # Helpers (booking, auth, onboarding, …)
scripts/                 # check-env, django-e2e, mcp-hermes
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
npm run test:smoke
npm run test:auth
npm run test:journeys
```

Videos default to on (`E2E_VIDEO=on`). Open report: `npm run report`.

## npm scripts

| Script | Description |
|--------|-------------|
| `npm test` | Local suite excluding `@integration` |
| `test:smoke` / `test:auth` / `test:journeys` | Filtered runs |
| `test:integrations` / `test:calendar` | Opt-in externals |
| `test:all` | Everything including integrations |
| `test:production` | Read-only production |
| `seed` / `reset` / `e2e:prepare` | Django fixtures via backend venv |
| `calendar:status` | Google Calendar connection check |
| `cli` / `cli:public` / `cli:professional` | Playwright CLI for agents |
| `mcp:hermes` | Playwright MCP for Hermes (see `agents/`) |
| `report` / `test:headed` / `test:ui` / `test:debug` | Artifacts & debug |

Env vars: [`.env.example`](.env.example).

### Seed vs prepare

- **seed** — shared tenant for booking / panel journeys (`E2E_PROFESSIONAL_*`).
- **e2e:prepare** — journey-specific state (onboarding). Specs usually call it via helpers.

## Playwright CLI (Cursor)

Stack must be up. Prefer CLI while authoring; specs remain the source of truth.

```bash
npm run cli:public
# or: npx playwright cli -s=public open http://localhost:3000 --headed
```

Do not use CLI against production. Snapshots are gitignored under `.playwright-cli/`.

## Exploratory AI (Hermes)

Deterministic specs stay in `tests/`. Hermes + Playwright MCP is optional and
documented under [`agents/`](agents/) (MCP snippet, skill, exploratory prompt).

```bash
# Set HERMES_ALLOWED_HOSTS to the MCP host LAN IP in .env, then:
npm run mcp:hermes
```

## Locators

Prefer `getByRole` / `getByLabel` / `getByText`, then `getByTestId`. Avoid brittle CSS.

## Roadmap (short)

Done: scaffold, auth, seed/reset/prepare, book→panel, Calendar, onboarding,
create service, create employee/branch, company config (datos básicos + reservas
online), production read-only, CLI, Hermes MCP.

Next: more local journeys (cancel, embed, clients, calendar page, horarios,
discounts); CI deferred; controlled production writes later.
