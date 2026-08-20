# Hermes runbook — TurnoLink browser only

Follow this in order. Do not improvise setup. Do not use the terminal.

**How to call each MCP tool:** read [`SKILL-playwright-mcp.md`](SKILL-playwright-mcp.md) first. Always: snapshot → use `ref` or `#id` as `target` → snapshot again.

## Tools you may use

ONLY Playwright MCP (see the skill for parameters):

- `browser_navigate` `{ url }`
- `browser_snapshot` `{}`
- `browser_click` `{ target, element? }`
- `browser_type` `{ target, text, element? }`
- `browser_fill_form` `{ fields: [{ target, value }] }` (optional)
- `browser_take_screenshot` `{ fullPage: true }`
- `browser_tabs` `{ action: "new"|"list"|"select", url?, index? }`
- `browser_press_key` `{ key }` (e.g. `F5`)
- `browser_wait_for` `{ text }` or `{ time }`

If a tool is missing, say which tools you have and stop.

## Forbidden (always)

- terminal / bash / curl / lsof / npm / git / docker
- files under `/opt/data`
- cloning repos
- starting servers
- production sites (`turnolink.app`, `admin.turnolink.app`)

If `browser_navigate` fails (connection refused): stop and reply exactly:

`Mac apps are down. Human: start :3000 :3001 :8000 and npm run mcp:hermes. Then ping me.`

## Part A — happy path (do this first)

1. `browser_navigate` → `http://127.0.0.1:3000/turnolink-e2e/services`
2. Snapshot. If the page is empty/error, screenshot and stop.
3. Click the service/variant named **30 min** (or the first visible service).
4. Snapshot.
5. If you see employee choice, click the first employee. If not, continue.
6. Snapshot the calendar. Click a day that looks available (not struck through).
7. Click the first time slot like `09:00` / `09:30` / `10:00`.
8. Click **Siguiente**.
9. Snapshot the form.
10. Fill:
    - `#name` → `E2E Hermes Uno`
    - `#phone` → `099111222`
    - `#email` → `hermes.e2e@example.com`
11. Click **Confirmar** (or **Pagar** if that is the only button).
12. Snapshot. You should see **¡Reserva confirmada!** or similar.
13. Screenshot. Write 2 lines: URL + what you see.

## Part B — try to break it (after A, or if A already booked)

Stay on `http://127.0.0.1:3000/turnolink-e2e/...`. One attack at a time. Snapshot after each.

1. Start booking again. On availability, pick a slot, then **refresh** the page. Report if the flow resets or errors.
2. Start booking. On preview, fill name `Hermes` (one word only) and phone `099111222`. Try Confirm. Report if it allows it.
3. Fill name `<script>alert(1)</script> Hermes Test` and phone `099111223`. Confirm if possible. Report what is stored/shown.
4. Open a **second tab**. In both tabs go to services → same day → same time → confirm both. Report if both succeed.
5. Click **Confirmar** twice fast. Report duplicate booking or error.

Stop after these 5. Do not wander.

## Part C — panel (only if A worked)

1. `browser_navigate` → `http://127.0.0.1:3001/login`
2. Snapshot.
3. Fill `#email` → `e2e-owner@turnolink.local`
4. Fill `#password` → `e2e-owner-pass-123`
5. Click **Ingresar**.
6. Go to `http://127.0.0.1:3001/portal/appointments`
7. Snapshot. Search `#search` for `Hermes` or `E2E`.
8. Report if the booking from A is visible.

## How to reply to the human

Short. For each step:

- DONE / FAIL
- URL
- what happened (1 sentence)

No essays. No “I will now clone the repo”.
