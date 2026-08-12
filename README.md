# TurnoLink E2E

Suite de tests end-to-end de TurnoLink con [Playwright](https://playwright.dev/).

Este repositorio es **independiente** del backend y de los frontends. No duplica lógica de negocio de Django ni hostea Playwright dentro de las apps Next.

## Qué es / qué no es

| Sí | No |
|----|----|
| Journeys UI + API entre apps | Unit tests (viven en cada proyecto) |
| Smoke y regresiones cross-frontend | Reimplementar reglas de disponibilidad/reservas |
| Artifacts de fallo (trace, video, screenshot) | Orquestar Docker/compose del stack (todavía) |

## Mapa de estructura

```text
turnolink-e2e/
├── tests/
│   ├── smoke/           # checks rápidos: “¿carga la app?”
│   ├── journeys/        # flujos multi-app (reserva → panel → cancel)
│   └── production/      # suite read-only de producción (aislada)
├── src/
│   ├── env.ts           # carga/valida variables de entorno
│   ├── apps.ts          # URLs tipadas: public / professional / api
│   └── safety.ts        # guards de TARGET_ENV y writes en prod
├── fixtures/            # fixtures Playwright custom (auth, multi-page)
├── scripts/             # CLI auxiliares (check-env; luego wrappers de seed)
├── artifacts/           # traces, videos, screenshots, HTML report (gitignored)
├── playwright.config.ts
├── .env.example
└── package.json
```

### ¿Dónde pongo X?

| Quiero… | Va en… |
|---------|--------|
| Un smoke de que algo carga | `tests/smoke/` |
| Un journey cliente + negocio | `tests/journeys/` |
| Un check solo de producción (read-only) | `tests/production/` |
| Helper de navegación / API / env | `src/` |
| Fixture de browser o contexto autenticado | `fixtures/` |
| Script que invoque Django (`e2e_seed`, etc.) | `scripts/` + `BACKEND_ROOT` + venv del backend |
| Credenciales / URLs locales | `.env` (copiado desde `.env.example`) |

## Cómo funciona Playwright aquí

1. **Node/npm** dentro de este repo instala `@playwright/test` y el browser Chromium.
2. Los tests abren el browser y navegan a las URLs de `.env` (`PUBLIC_WEB_URL`, etc.).
3. Playwright **no levanta** Django ni Next: en local el stack debe estar corriendo antes.
4. Ante un fallo se guardan trace, screenshot y video en `artifacts/`. Ver reporte: `npm run report`.

```text
turnolink-e2e (Node/Playwright)
        │
        ├─► browser ──► turnolink-web          (PUBLIC_WEB_URL)
        ├─► browser ──► turnolink-professional-web (PROFESSIONAL_WEB_URL)
        └─► HTTP    ──► turnolink-backend API  (API_BASE_URL)
```

Para journeys futuros con dos frontends, abrí un segundo `page`/`context` y usá `apps.professional()` (URL absoluta). El `baseURL` de Playwright apunta solo a la web pública.

## Backend y el venv existente

Playwright es Node. Los comandos de dominio (seed/reset) **viven en Django** y deben usar el environment ya creado en el backend:

```bash
# Ejemplo futuro (aún no implementado en milestone 1)
"$BACKEND_ROOT/venv/bin/python" "$BACKEND_ROOT/manage.py" e2e_seed
```

- `BACKEND_ROOT` por defecto: `../turnolink-backend`
- **No** crear un `venv` dentro de `turnolink-e2e`
- **No** instalar paquetes Python desde este repo sin aprobación explícita

## Ownership

| Repo | Responsabilidad |
|------|-----------------|
| `turnolink-e2e` | Specs, config Playwright, helpers env/apps/safety, artifacts, scripts npm |
| `turnolink-backend` | Seed/reset E2E, reglas de dominio, endpoints E2E gated (futuro), vía su `venv` |
| `turnolink-web` / `turnolink-professional-web` | UI estable, roles/labels/`data-testid` cuando haga falta |

## Ambientes

| Env | Writes | Qué corre |
|-----|--------|-----------|
| `local` | Sí | smoke + journeys |
| `staging` | Sí, tenant E2E dedicado | smoke + journeys |
| `production` | No por defecto | solo `tests/production` |

Writes en producción (futuro) requieren **todo** esto:

- `TARGET_ENV=production`
- `ALLOW_PRODUCTION_WRITES=true`
- `E2E_ALLOWED_COMPANY_SLUG` = tenant E2E permitido
- Verificación en `src/safety.ts` de que el recurso pertenece a ese tenant

## Setup rápido (local)

Precondiciones:

- `turnolink-web` en `http://localhost:3000` (convención E2E)
- (Más adelante) professional en `:3001`, API en `:8000`

```bash
cd turnolink-e2e
cp .env.example .env
npm install
npx playwright install chromium
npm run test:smoke
```

## Scripts npm

| Script | Qué hace |
|--------|----------|
| `npm run check-env` | Valida `.env` y URLs |
| `npm test` | Toda la suite (excepto aislamiento prod vía script dedicado) |
| `npm run test:smoke` | Solo tests `@smoke` |
| `npm run test:local` | `TARGET_ENV=local` |
| `npm run test:staging` | `TARGET_ENV=staging` |
| `npm run test:production` | Solo `tests/production` con `TARGET_ENV=production` |
| `npm run test:headed` | Browser visible |
| `npm run test:ui` | UI mode de Playwright |
| `npm run test:debug` | Debug mode |
| `npm run report` | Abre el HTML report de artifacts |
| `npm run codegen:public` | Codegen contra la web pública |
| `npm run codegen:professional` | Codegen contra el panel |

## Variables de entorno

Ver [`.env.example`](.env.example). Mínimo para smoke local:

- `TARGET_ENV=local`
- `PUBLIC_WEB_URL`
- `PROFESSIONAL_WEB_URL`

## Roadmap

1. ~~Scaffold Playwright + smoke público~~ (milestone actual)
2. Smoke del panel professional
3. Auth local + helper API
4. `e2e_seed` / `e2e_reset` en Django vía `BACKEND_ROOT` + `venv`
5. Primer journey cross-app (reserva → panel → cancel)
6. Staging + tenant E2E
7. Production read-only
8. Integraciones (Mercado Pago sandbox, Calendar, OAuth) una a una
9. CI
10. Exploratorio con agentes (Hermes / OpenRouter / Playwright MCP) — capa aparte

## Locators

Preferí locators robustos:

- `getByRole`, `getByLabel`, `getByText` (accesibles)
- `getByTestId` cuando la UI no sea estable por rol/label
- Evitar selectores CSS frágiles (`.MuiButton-root:nth-child(2)`, etc.)
