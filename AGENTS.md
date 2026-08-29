# AGENTS.md — TurnoLink E2E (`turnolink-testing`)

Source of truth for agents in this repo. `CLAUDE.md` only points here.

## Skills

| Kind | Use |
|------|-----|
| **General** | Cursor plugin **web-testing** → `playwright-web-tester` (and `playwright-testable-ui` if UI lacks roles/labels) |
| **Product (this repo)** | [`.agents/skills/turnolink-e2e/SKILL.md`](.agents/skills/turnolink-e2e/SKILL.md) |
| **Backend fixtures** | In `turnolink-backend`: `.agents/skills/turnolink-e2e-fixtures/SKILL.md` |

If **web-testing** is missing, stop and tell the user. Do not vendor generic Playwright docs here.

## Fast path (create / extend a journey)

When the user asks for a concrete test and the ask is clear:

```text
1. Parallel: curl URLs from .env + list matching helpers under src/ + fixtures/e2e.ts
2. CLI once: npx --no-install playwright cli --help (reuse that binary)
3. If stack down → one short ask to start apps; STOP. Do not grep frontend source for locators.
4. If stack up → CLI open → find / generate-locator → thin helper + spec
5. Run the changed test. Done.
```

**Hard limits**

- Do **not** re-read AGENTS / skills / README if already loaded this turn.
- Do **not** open frontend/backend source to invent locators while the UI is reachable.
- Do **not** start “fix tooling / rewrite docs” mid-flight unless the user asked for that.
- Cap exploratory source reads: only after a failing live run, or for a product bug.
- Sandbox / browsers path: retry with full permissions and/or `PLAYWRIGHT_BROWSERS_PATH` — do not treat as “CLI missing.”

## Before exploring or writing journeys

1. **Stack up** — trust `.env` (`PUBLIC_WEB_URL`, `PROFESSIONAL_WEB_URL`, `API_BASE_URL`). Unreachable → ask once; do not invent locators from source.
2. **Sanity** — wrong app on a port → fix env/process first.
3. **CLI** — detect once; keep sessions open; never auto-install. Prefer live `find` / `generate-locator`; never paste full snapshot YAML.
4. **Data** — `npm run seed` or `e2e:prepare -- <scenario>` / helpers. Never create a Python venv here.
5. **Reuse** — existing `src/` helpers and `fixtures/e2e.ts` before writing new ones.

## Quality bar

Explore with CLI first. Specs stay thin; logic lives in helpers. Tags: `@smoke` / `@auth` / `@journey`. Integrations under `tests/integrations/` — opt-in. Local writes only; production read-only. Skip OAuth / Mercado Pago unless dedicated. Run the changed test before claiming done.

Human setup: [README.md](README.md).
