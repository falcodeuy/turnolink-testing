# TurnoLink E2E

End-to-end test suite for TurnoLink, powered by [Playwright](https://playwright.dev/).

This repository is **independent** from the Django backend and the Next.js frontends. It does not reimplement business rules and does not host Playwright inside those apps.

## Scope

| In scope | Out of scope |
|----------|--------------|
| UI + API journeys across apps | Unit / integration tests (live in each product repo) |
| Smoke checks and cross-frontend regressions | Duplicating availability / booking domain logic |
| Failure artifacts (trace, video, screenshot) | Orchestrating Docker Compose for the full stack (not yet) |

## Mental model

Think of the suite as layers. Prefer the cheapest layer that still proves the behavior you care about.

| Layer | Directory / module | Purpose |
|-------|--------------------|---------|
| Smoke | `tests/smoke/` | Is the app reachable and rendering a basic page? |
| Auth | `tests/auth/` + `npm run seed` | Can we authenticate? Seed creates the dedicated E2E owner/company. |
| Journeys | `tests/journeys/` | Does a full business flow work across apps? (book → panel → delete) |
| Production | `tests/production/` | Read-only checks against live production (no writes) |

Supporting code:

| Module | Role |
|--------|------|
| `src/apps.ts` | Typed URLs for public web, professional web, and API |
| `src/env.ts` | Load and validate environment variables |
| `src/safety.ts` | Environment / production-write guards |
| `src/api/` | Thin HTTP client against Django (transport only; no domain logic) |
| `src/professionalAuth.ts` | Professional session helpers: UI login or API login + `user` cookie |
| `src/booking.ts` | Public booking funnel helpers |
| `src/appointments.ts` | Professional Reservas helpers (find / delete) |
| `fixtures/` | Shared Playwright fixtures (auth contexts, multi-page setups) when needed |
| `scripts/` | CLI helpers (`check-env`, Django `e2e_seed` / `e2e_reset` wrappers) |
| `artifacts/` | Traces, videos, screenshots, HTML report (gitignored) |

**How Playwright fits:** Node runs `@playwright/test`, which drives Chromium against the URLs in `.env`. Cookies and storage live on the browser **context**; a `page` is one tab inside that context. Django and Next must already be running locally — this repo does not start them yet.

```text
turnolink-testing (Node / Playwright)
        │
        ├─► browser ──► turnolink-web                 (PUBLIC_WEB_URL)
        ├─► browser ──► turnolink-professional-web    (PROFESSIONAL_WEB_URL)
        └─► HTTP    ──► turnolink-backend API         (API_BASE_URL)
```

For multi-frontend journeys, open a second `page` / `context` and navigate with `apps.professional()` (absolute URL). Playwright `baseURL` points only at the public web.

## Repository layout

```text
turnolink-testing/
├── tests/
│   ├── smoke/                 # app reachability
│   ├── auth/                  # professional UI + API login
│   ├── journeys/              # cross-app business flows
│   └── production/            # production read-only suite
├── src/
│   ├── env.ts
│   ├── apps.ts
│   ├── safety.ts
│   ├── professionalAuth.ts
│   ├── booking.ts
│   ├── appointments.ts
│   └── api/
├── fixtures/
├── scripts/
├── artifacts/
├── playwright.config.ts
├── .env.example
└── package.json
```

### Where to put new work

| I want to… | Put it in… |
|------------|------------|
| Add a “does it load?” check | `tests/smoke/` |
| Cover professional login / session | `tests/auth/` + `src/professionalAuth.ts` |
| Cover a client + business journey | `tests/journeys/` + `src/booking.ts` / `src/appointments.ts` |
| Add a production-only read-only check | `tests/production/` |
| Add navigation / env / safety helpers | `src/` |
| Call Django over HTTP | `src/api/` |
| Add a reusable browser fixture | `fixtures/` |
| Invoke Django seed/reset commands | `npm run seed` / `npm run reset` (uses `BACKEND_ROOT` + backend `venv`) |
| Configure local URLs / credentials | `.env` (from `.env.example`) |

## Backend and the existing venv

Playwright is Node. Domain commands (seed / reset) belong in Django and must use the **existing** backend virtualenv:

```bash
# From turnolink-testing (preferred)
npm run seed
npm run reset

# Equivalent, from turnolink-backend
./venv/bin/python manage.py e2e_seed
./venv/bin/python manage.py e2e_reset
./venv/bin/python manage.py e2e_seed --json
```

What `e2e_seed` creates (idempotent):

- Company `turnolink-e2e` (active, public slug, auto-confirm bookings)
- Owner user `e2e-owner@turnolink.local` / `e2e-owner-pass-123` (`onboarding_ready=True`)
- Branch, category, service, 30‑min variant
- Company hours Mon–Sat 09:00–18:00

What `e2e_reset` does:

- Deletes schedules and clients for that company
- Keeps the company skeleton (re-run `seed` anytime)

Guards: blocked when `DJANGO_ENV=production` unless `E2E_TOOLS_ENABLED=true`.

- Default `BACKEND_ROOT`: `../turnolink-backend`
- Do **not** create a Python `venv` inside `turnolink-testing`
- Do **not** install Python packages from this repo without explicit approval

## Ownership

| Repository | Responsibility |
|------------|----------------|
| `turnolink-testing` | Specs, Playwright config, env/apps/safety helpers, artifacts, npm scripts |
| `turnolink-backend` | E2E seed/reset, domain rules, gated E2E endpoints (future), via its `venv` |
| `turnolink-web` / `turnolink-professional-web` | Stable UI, accessible roles/labels, `data-testid` when needed |

## Environments

| Env | Writes | What runs |
|-----|--------|-----------|
| `local` | Yes | smoke + auth + journeys |
| `staging` | Reserved (no staging env yet) | — |
| `production` | **No** (read-only suite) | `tests/production` only |

### Production (read-only)

Hits live production URLs. **Never books, logs in, seeds, or deletes.**

```bash
cp .env.production.example .env.production
# defaults: turnolink.app / admin.turnolink.app / api.turnolink.app
npm run test:production
```

Safety rails:

- `TARGET_ENV=production` forces Playwright `testMatch` to `tests/production/**` only
- `ALLOW_PRODUCTION_WRITES` must stay `false` for this suite
- Localhost URLs are rejected
- `npm run seed` / `reset`, booking, and professional login helpers refuse production
- Future controlled writes will still need `ALLOW_PRODUCTION_WRITES=true` + `E2E_ALLOWED_COMPANY_SLUG` + tenant checks in `src/safety.ts`

## Local setup

Port convention:

- `turnolink-web` → `http://localhost:3000`
- `turnolink-professional-web` → `http://localhost:3001`
- Django API → `http://localhost:8000` (required for `@auth`)

```bash
# Terminal 1 — public web
cd turnolink-web && npm run dev

# Terminal 2 — professional panel (port 3001 to avoid clashing with :3000)
cd turnolink-professional-web && npm run dev -- -p 3001

# Terminal 3 — Django API (required for @auth)
cd turnolink-backend
# start the server using the existing venv, as you normally do

# Terminal 4 — tests
cd turnolink-testing
cp .env.example .env   # first time only
npm install
npx playwright install chromium
npm run seed           # creates E2E company + owner (Django venv)
npm run test:smoke
npm run test:auth      # uses seeded e2e-owner credentials by default
npm run test:journeys  # book on public web → see/delete in panel
```

### Watching what the browser did (including passed tests)

By default `E2E_VIDEO=on`, so Playwright keeps a **video for every test**, pass or fail.

After a run:

```bash
npm run report
# opens artifacts/playwright-report — click a test → video attachment

# Or open a video file directly:
# artifacts/test-results/<test-name>/video.webm
# Journeys that open custom browser contexts also write:
# artifacts/test-results/*.webm
```

**Note:** `use.video` in Playwright config only applies to the default test context. Cross-app journeys use `newRecordedContext()` (`src/browser.ts`) so public + professional tabs are recorded too. Close those contexts at the end of the test so videos are flushed to disk.

Other useful artifacts:

| Artifact | When kept | How to open |
|----------|-----------|-------------|
| Video (`.webm`) | Always (`E2E_VIDEO=on`) | HTML report or file path above |
| Trace | On failure | `npx playwright show-trace artifacts/test-results/.../trace.zip` |
| Screenshot | On failure | Inside the same test-results folder |

To save disk space: set `E2E_VIDEO=retain-on-failure` or `off` in `.env`.

## npm scripts

| Script | Description |
|--------|-------------|
| `npm run check-env` | Validate `.env` and required URLs |
| `npm test` | Full suite (use `test:production` for prod isolation) |
| `npm run test:smoke` | `@smoke` only |
| `npm run test:auth` | `@auth` only (needs credentials + API) |
| `npm run test:journeys` | `@journey` only (needs seed + both frontends + API) |
| `npm run seed` | `manage.py e2e_seed` via backend `venv` |
| `npm run reset` | `manage.py e2e_reset` via backend `venv` |
| `npm run test:local` | `TARGET_ENV=local` |
| `npm run test:production` | Read-only production suite (`tests/production`) |
| `npm run test:headed` | Visible browser |
| `npm run test:ui` | Playwright UI mode |
| `npm run test:debug` | Debug mode |
| `npm run report` | Open HTML report under `artifacts/` |
| `npm run codegen:public` | Codegen against the public web |
| `npm run codegen:professional` | Codegen against the professional panel |

## Environment variables

See [`.env.example`](.env.example).

Minimum for local smoke:

- `TARGET_ENV=local`
- `PUBLIC_WEB_URL`
- `PROFESSIONAL_WEB_URL`

Additional for `@auth`:

- `API_BASE_URL` (Django running)
- `E2E_PROFESSIONAL_EMAIL` (default matches `e2e_seed`)
- `E2E_PROFESSIONAL_PASSWORD` (default matches `e2e_seed`)

Prefer `npm run seed` so credentials and the public company exist. `@auth` tests are skipped when those credentials are missing.

### Session helpers

- `loginProfessionalViaUi(page)` — fills the login form (use when testing login itself).
- `loginProfessionalViaApi(page)` — `POST /login/` then injects the `user` cookie (fast setup for later journeys).
- `bookAppointmentOnPublicWeb(page, …)` — public funnel through confirm.
- `expectAppointmentInProfessionalPanel(page, clientName)` / `deleteAppointmentFromProfessionalPanel(page, clientName)`.

## Roadmap

1. ~~Playwright scaffold + public smoke~~
2. ~~Professional panel smoke~~
3. ~~Local auth + API helper~~
4. ~~Django `e2e_seed` / `e2e_reset` via `BACKEND_ROOT` + `venv`~~
5. ~~First cross-app journey (book → panel → delete)~~
6. Staging + dedicated E2E tenant — **skipped for now** (no staging environment)
7. ~~Production read-only suite~~ (current milestone)
8. External integrations (Mercado Pago sandbox, Calendar, OAuth), one at a time
9. CI
10. Exploratory agents (Hermes / OpenRouter / Playwright MCP) as a separate layer
11. Future: controlled production writes against a dedicated `TurnoLink E2E Production` tenant

## Locators

Prefer resilient locators:

- `getByRole`, `getByLabel`, `getByText` (accessible)
- `getByTestId` when role/label is not stable or not associated correctly
- Avoid brittle CSS (e.g. `.MuiButton-root:nth-child(2)`)
