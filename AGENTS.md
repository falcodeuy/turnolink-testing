# AGENTS.md — TurnoLink E2E (`turnolink-testing`)

Source of truth for agents in this repo. `CLAUDE.md` only points here.

## Comments

Do not add comments that only narrate what the code does.

- Prefer clear names and structure over commentary.
- No section banners, restating the next line, or leftover TODOs.
- Comment only when the *why* is non-obvious; keep it short.
- Do not leave commented-out code.

## Skills

Install from **company-agent-toolkit** marketplace (Cursor Customize / Claude
`/plugin marketplace add` / Codex marketplace):

| Kind | Plugin / skill |
|------|----------------|
| **General** | `web-testing` → `playwright-web-tester` (+ `playwright-e2e-fixtures` when changing Django seed/prepare; `playwright-testable-ui` if UI lacks roles/labels) |
| **Product** | `turnolink-e2e` → skill `turnolink-e2e` (cheat-sheet, auth cookie, Horarios, seed mutators) |

If those plugins are missing, stop and tell the user. Do not vendor generic
Playwright docs or a second product skill copy in this repo.

## Ownership

| Repo | Owns |
|------|------|
| `turnolink-testing` | Specs, helpers, fixtures, `.env.example`, explore/smoke scripts |
| `turnolink-web` / `turnolink-professional-web` | Accessible names, labels, sparse `data-testid` |
| `turnolink-backend` | Idempotent `e2e_seed` / `e2e_prepare` and stable fixture names |

## Fast path (create / extend a journey)

When the user asks for a concrete test and the ask is clear:

```text
1. Parallel: npm run env:smoke (or curl URLs) + list matching helpers under src/ + fixtures/e2e.ts
2. CLI once: npx --no-install playwright cli --help (reuse that binary)
3. If stack down → one short ask to start apps; STOP. Do not grep frontend source for locators.
4. If stack up → SAME TURN: npm run explore:professional|explore:public (or cli:*) → auth → find / generate-locator
5. Thin helper + spec → run the changed test. Done.
```

Step 4 is mandatory before writing helpers. Do **not** insert probe specs or
`scripts/save-*-auth.*` between curl-ok and CLI open.

**Hard limits**

- Do **not** re-read AGENTS / skills / README if already loaded this turn.
- Do **not** open frontend/backend source to invent locators while the UI is reachable.
- Do **not** start “fix tooling / rewrite docs” mid-flight unless the user asked for that.
- Do **not** create `tests/**/_explore*.spec.ts` or one-off auth scripts — use
  `npm run explore:*` / `cli:*`.
- Cap exploratory source reads: only after a failing live run, or for a product bug.
- Sandbox / browsers path: retry with full permissions and/or `PLAYWRIGHT_BROWSERS_PATH`.
- If CLI auth is policy-blocked: ask once / request approval — do not invent a probe test.

## Before exploring or writing journeys

1. **Stack up** — `npm run env:smoke`. Unreachable → ask once; do not invent locators from source.
2. **Sanity** — wrong app on a port → fix env/process first.
3. **CLI** — detect once; keep sessions open; never auto-install. Prefer live `find` /
   `generate-locator`; never paste full snapshot YAML. Optional: `npm run a11y:dump -- <url>`.
4. **Data** — `npm run seed` or `e2e:prepare -- <scenario>` / helpers. Never create a Python venv here.
5. **Reuse** — existing `src/` helpers and `fixtures/e2e.ts` before writing new ones.

## Tips

Product detail lives in the **turnolink-e2e** toolkit skill (and its `references/`).

- **Name the control, then locate it.** If a Custom Input or icon has no accessible name after 1–2 CLI attempts, fix the product (`playwright-testable-ui`). Do not paper over with `.nth()` / `.first()`.
- **Copy accessible names exactly** (`{ exact: true }` on Spanish CTAs like `Continuar`).
- **A click that does not change the screen** is usually an overlay (`nextjs-portal`, help modal). Call helpers in `src/overlays.ts`.
- **Do not add `waitForTimeout` / `sleep`.**
- **Created data must be unique under `fullyParallel`.** Use `src/unique.ts`.
- **Shared seed mutators** (Horarios, multi-service, interval): `try/finally` restore; `npm run test:journeys` uses `--workers=1`.
- **Panel-only journeys:** prefer fixture `loggedInProfessionalPage`.
- **Suite timeout is 180s** in `playwright.config.ts`.

## Quality bar

Explore with CLI first. Specs stay thin; logic lives in helpers. Tags: `@smoke` /
`@auth` / `@journey`. Integrations under `tests/integrations/` — opt-in. Local
writes only; production read-only. Skip OAuth / Mercado Pago unless dedicated.
Run the changed test before claiming done.

Human setup: [README.md](README.md).
