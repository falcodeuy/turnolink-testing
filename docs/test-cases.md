# TurnoLink E2E case catalog

Living map of what the Playwright suite covers and what is deferred.
Prefer the **cheapest layer** that still proves the behavior
(see [AGENTS.md](../AGENTS.md) and `tests/screen-validation/`).

## Layers

| Layer | Path | Tag | When to use |
|-------|------|-----|-------------|
| Smoke | `tests/smoke/` | `@smoke` | App reachable |
| Auth | `tests/auth/` | `@auth` | Login / session |
| Screen validation | `tests/screen-validation/` | `@screen` | Same-screen guards / field checks via midpoint |
| Journeys | `tests/journeys/` | `@journey` | Tip-to-tip wiring across apps |
| Integrations | `tests/integrations/` | `@integration` | Opt-in externals |
| Production | `tests/production/` | — | Read-only live checks |

## Covered (high level)

| Area | Specs / notes |
|------|----------------|
| Smoke | Public + professional loads; portal shell |
| Auth | Professional email login; Google opt-in |
| Booking | Public book → Reservas → cancel; embed; multi-service; client appears |
| Company | Create service / employee / branch; config basics / Horarios / online booking |
| Onboarding | Happy path, home service, multi-schedule, images |
| Studio | Drop-in, membership, plans, packs, dues, roster, check-in, schedule edit, signed cancel |
| Package | Cuponera multi-session book |
| Capacity | Employee capacity-1 blocks slot |

## Deferred (product / isolation backlog)

| Gap | Why deferred | Prefer next |
|-----|--------------|-------------|
| Tip-to-tip form validation matrices | Too expensive as journeys | `@screen` midpoints |
| Medios de Pago / Mercado Pago UI | External + flaky | Dedicated `@integration` |
| Discount codes rich edges | Low risk vs cost | API pytest + one journey |
| Recursos / spaces assignment | Product still evolving | Screen + API |
| Calendar page deep coverage | Partial Google integration exists | Expand `@calendar` |
| Shared-tenant mutators at high workers | Needs platform-per-worker seed | Fase 2 isolation |
| Waitlist promote UX | Capacity-full edge | Screen after factory seat fill |

## Parallelism policy

| Class | Workers | Notes |
|-------|---------|-------|
| Additive unique clients / catalog creates | Safe with platform-per-worker | `unique*` helpers |
| Company setting mutators (Horarios, multi, interval) | Prefer own worker company; else serialize | See toolkit `seed-mutators.md` |
| `e2e_prepare studio` | Per-worker slug only | Wipe is company-scoped |
| Onboarding | Distinct `--email` | Already parallel-safe identities |

Update this file when adding or retiring a journey or screen-validation suite.
