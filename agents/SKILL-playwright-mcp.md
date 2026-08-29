# Skill: Playwright MCP (TurnoLink)

How to call Playwright MCP tools. Copy this into Hermes as a skill, or paste it with the exploratory runbook.

Browser runs on the **host that runs Playwright MCP** (same machine as the
TurnoLink stack). Do not use the Hermes terminal for browser work.

Golden rule: **snapshot → copy `ref` → click/type**. Never click without a fresh snapshot.

Snapshot lines look like:

```text
- heading "Reservas" [level=1] [ref=e13]
- textbox [ref=e40]
- button "Ingresar" [ref=e55]
```

`target` = that `ref` (`e13`) **or** a unique selector (`#email`, `#name`).

---

## Tools you will use

### 1. `browser_navigate`

Open a URL. Starts Chromium if needed.

| Param | Required | Example |
|-------|----------|---------|
| `url` | yes | `http://127.0.0.1:3000/turnolink-e2e/services` |

Call:

```json
{ "url": "http://127.0.0.1:3000/turnolink-e2e/services" }
```

Then immediately `browser_snapshot`.

If error contains `ERR_CONNECTION_REFUSED`: stop. Tell human to start the stack
(`:3000` / `:3001` / `:8000`) and `npm run mcp:hermes` on the MCP host.

---

### 2. `browser_snapshot`

Read the page as a text tree (better than screenshot for actions).

| Param | Required | Use |
|-------|----------|-----|
| _(none)_ | — | full page |
| `target` | no | snapshot only one element |
| `depth` | no | smaller tree if huge |

Call:

```json
{}
```

From the result, pick `ref=eXX` for the next click/type.

---

### 3. `browser_click`

Click one element.

| Param | Required | Example |
|-------|----------|---------|
| `target` | yes | `e55` or `#email` |
| `element` | no | short description `"Ingresar button"` |
| `doubleClick` | no | `true` only for double-click test |

Call:

```json
{ "target": "e55", "element": "Ingresar button" }
```

After click, snapshot again (page may change).

---

### 4. `browser_type`

Type into an input.

| Param | Required | Example |
|-------|----------|---------|
| `target` | yes | `e40` or `#name` |
| `text` | yes | `E2E Hermes Uno` |
| `element` | no | `"Name field"` |
| `submit` | no | `true` = press Enter after |
| `slowly` | no | `true` only if fill does nothing |

Prefer selector when you know the id:

```json
{ "target": "#name", "text": "E2E Hermes Uno", "element": "name input" }
```

```json
{ "target": "#phone", "text": "099111222", "element": "phone input" }
```

```json
{ "target": "#email", "text": "hermes.e2e@example.com", "element": "email input" }
```

TurnoLink preview/login ids: `#name` `#phone` `#email` `#password` `#search`.

---

### 5. `browser_fill_form`

Fill several fields in one call (optional shortcut).

| Param | Required |
|-------|----------|
| `fields` | yes — array of `{ target, value, element? }` |

```json
{
  "fields": [
    { "target": "#name", "value": "E2E Hermes Uno", "element": "name" },
    { "target": "#phone", "value": "099111222", "element": "phone" },
    { "target": "#email", "value": "hermes.e2e@example.com", "element": "email" }
  ]
}
```

If this tool is missing, use three `browser_type` calls instead.

---

### 6. `browser_take_screenshot`

Picture for the human. **Do not use screenshot refs to click.** Click only from snapshot.

```json
{ "fullPage": true }
```

---

### 7. `browser_navigate_back`

Browser back. No params.

```json
{}
```

---

### 8. `browser_press_key`

| Param | Required | Example |
|-------|----------|---------|
| `key` | yes | `Enter`, `Escape`, `Tab`, `F5` |

Refresh test:

```json
{ "key": "F5" }
```

---

### 9. `browser_wait_for`

Wait for text or seconds.

```json
{ "text": "¡Reserva confirmada!" }
```

```json
{ "time": 2 }
```

---

### 10. `browser_tabs`

| Param | Required | Values |
|-------|----------|--------|
| `action` | yes | `list` / `new` / `select` / `close` |
| `url` | for `new` | page to open |
| `index` | for `select`/`close` | tab number from `list` |

New tab for double-book test:

```json
{ "action": "new", "url": "http://127.0.0.1:3000/turnolink-e2e/services" }
```

List tabs:

```json
{ "action": "list" }
```

Switch:

```json
{ "action": "select", "index": 0 }
```

---

### 11. `browser_handle_dialog`

If an alert/confirm appears.

```json
{ "accept": true }
```

```json
{ "accept": false }
```

---

## Loop (every interaction)

1. `browser_snapshot`
2. Find `ref` or id
3. `browser_click` or `browser_type`
4. `browser_snapshot` again
5. Repeat

Wrong: click → click → click without snapshot.  
Wrong: click using a screenshot.  
Wrong: `curl` / terminal.

## TurnoLink cheatsheet

| Goal | Tool | target / url |
|------|------|----------------|
| Open booking | `browser_navigate` | `http://127.0.0.1:3000/turnolink-e2e/services` |
| Pick 30 min | `browser_click` | snapshot ref of text `30 min` |
| Next | `browser_click` | button **Siguiente** |
| Name / phone / email | `browser_type` | `#name` `#phone` `#email` |
| Confirm | `browser_click` | **Confirmar** or **Pagar** |
| Login panel | `browser_navigate` | `http://127.0.0.1:3001/login` |
| Login fields | `browser_type` | `#email` `#password` |
| Login button | `browser_click` | **Ingresar** |
| Appointments | `browser_navigate` | `http://127.0.0.1:3001/portal/appointments` |
| Search | `browser_type` | `#search` |

## Do not use (unless human asks)

- `browser_run_code_unsafe` — executes arbitrary code
- vision mouse tools (`browser_mouse_click_xy`) — you have no vision
- Hermes `terminal` tool
