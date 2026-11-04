# Screen validation

Not tip-to-tip journeys. Specs that stay on **one screen** (or one modal) and
assert validation, disabled controls, or field behavior.

Keep these under `tests/screen-validation/` so they stay clearly separate from
`tests/journeys/`.

## Rules

1. **Enter via midpoint** — logged-in panel, deep link, or helper that lands on
   the screen. Do not walk a full booking funnel just to assert a toast.
2. **Many iterations on the same screen** — one `describe` with shared
   `beforeEach` when useful.
3. **Tag** `@screen` (and `@validation` when asserting guards). Run with
   `npm run test:screen`.
4. **Do not mutate shared company settings** in a way that races journeys —
   prefer read-only asserts or restore in `finally` on the worker company.

Tip-to-tip flows live under `tests/journeys/`.
