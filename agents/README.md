# Hermes + Playwright MCP (optional, not for Cursor authoring)

> **Cursor agents:** ignore this folder for creating or debugging Playwright
> specs. Use Playwright CLI (`npm run cli:professional` / `cli:public`) and
> follow **[AGENTS.md](../AGENTS.md)** + `.agents/skills/turnolink-e2e/`.

Deterministic Playwright specs stay in `tests/`. Hermes is a separate exploratory
layer: OpenRouter thinks, Playwright MCP drives a browser on the **host that runs
the TurnoLink stack** (where you also run `npm run mcp:hermes`).

## Quick start

1. Stack up on that host (`:3000` / `:3001` / `:8000`); `npm run seed` if needed.
2. In `turnolink-testing/.env`, set `HERMES_ALLOWED_HOSTS` to the host’s LAN
   address (see `.env.example`). Examples to discover it:
   - Linux: `hostname -I | awk '{print $1}'`
   - macOS: `ipconfig getifaddr en0`
   - Windows: `ipconfig` (IPv4 of the active adapter)
3. Start MCP (leave the terminal open):

```bash
cd turnolink-testing && npm run mcp:hermes
```

4. From the machine/container where Hermes runs, check reachability:

```bash
curl -sI http://HOST_LAN_IP:8931/mcp
```

`403` → Host header not allowlisted. Unreachable → firewall / Docker networking
(allow TCP **8931** on the MCP host).

5. Merge [`hermes.config.mcp.snippet.yaml`](hermes.config.mcp.snippet.yaml) into
   Hermes `config.yaml` (use the MCP host LAN IP, never `localhost` from inside
   a container — that would point at the container itself).
6. Restart Hermes (or `/reload-mcp`).
7. Give Hermes [`SKILL-playwright-mcp.md`](SKILL-playwright-mcp.md) and
   [`exploratory-prompt.md`](exploratory-prompt.md).

Do **not** expose port 8931 beyond your LAN. Do not use Hermes MCP for normal
Cursor test authoring (use Playwright CLI instead). Never put passwords in
committed prompts — use values from the host’s `.env` / ask the human.
