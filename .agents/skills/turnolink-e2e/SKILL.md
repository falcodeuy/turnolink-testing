---
name: turnolink-e2e
description: >-
  TurnoLink conventions for Playwright journeys. Use with playwright-cli when
  exploring the local stack and converting that into specs under tests/.
---

# TurnoLink E2E overlay

Run CLI from this repo: `npx playwright cli …` (see sibling `playwright-cli` skill).

- Public: `http://localhost:3000` — professional: `http://localhost:3001`
- Seed: `npm run seed`. Writes: local only.
- Reuse `src/booking.ts`, `src/professionalAuth.ts`, `src/appointments.ts`, `src/browser.ts`.
- Login fields: `#email` `#password`. Booking preview: `#name` `#phone` `#email`. Reservas search: `#search`.
- Do not paste snapshot YAML into the conversation; use `npx playwright cli find`.
- Specs go in `tests/` with `@journey`. CLI is exploration only.
