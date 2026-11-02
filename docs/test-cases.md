# Casos de prueba E2E (simple)

Mapa vivo de lo que cubre Playwright. Preferí la capa más barata que
demuestre el comportamiento (`@screen` antes que `@journey`).

## Capas

| Capa        | Carpeta                    | Tag            |
| ----------- | -------------------------- | -------------- |
| Smoke       | `tests/smoke/`             | `@smoke`       |
| Auth        | `tests/auth/`              | `@auth`        |
| Pantalla    | `tests/screen-validation/` | `@screen`      |
| Journey     | `tests/journeys/`          | `@journey`     |
| Integración | `tests/integrations/`      | `@integration` |
| Producción  | `tests/production/`        | —              |

## Casos cubiertos

### Reserva pública → panel

| Caso                   | Qué prueba                                    |
| ---------------------- | --------------------------------------------- |
| Book + ver en Reservas | Cliente reserva → aparece → se puede cancelar |
| Cancelar por estado    | Book → panel → Estado Cancelado               |
| Cliente aparece        | Tras book, Clientes lista nombre/email/tel    |
| Embed                  | Funnel `/embed` → Reservas                    |
| Multi-servicio         | Toggle múltiples → 2 variantes → panel        |
| Cuponera               | Package multi-sesión → confirmación           |
| Capacidad empleado     | Owner capacity-1: slot se llena               |

### Configuración (panel → efecto)

| Caso                     | Qué prueba                                                             |
| ------------------------ | ---------------------------------------------------------------------- |
| Datos básicos            | Descripción / web / Instagram → tab Información pública                |
| Color de marca           | Campo persiste en Datos básicos (`@screen`; reflejo público pendiente) |
| Horarios                 | Lunes apertura/cierre persiste (panel)                                 |
| Intervalo (panel)        | “Habilitar reservas cada” guarda y restaura                            |
| Intervalo → slots        | 1 hora → solo `:00`; 30 min → aparece `:30` en agenda pública          |
| Términos                 | Texto en Reservas Online → tab + página pública                        |
| Pendiente confirmación   | Modo pendiente → `paymentStatus=pending` (no “¡Reserva confirmada!”)   |
| Cancelación anticipación | Mutar a 72h → restaura default 24h                                     |
| Selección empleados      | Toggle on; con 1 pro en servicio → `/availability` (sin `/employees`)  |
| Multi-servicio           | Ya cubierto en journey multi-servicio                                  |

### Empresa (CRUD)

| Caso               | Qué prueba                                                    |
| ------------------ | ------------------------------------------------------------- |
| Servicio           | Crear → aparece en árbol                                      |
| Empleado           | Crear Manager → lista + detalle                               |
| Sucursal           | Virtual, edición, cancelación y reactivación                  |
| Recurso compartido | Alta/edición, vacío y error diferenciados                     |
| Sala               | Alta/edición, capacidad válida/inválida, vacío y error        |
| Diagnóstico        | Filtros, disponible/no disponible, loading, error y reintento |

### Onboarding

| Caso          | Qué prueba                                       |
| ------------- | ------------------------------------------------ |
| Happy path    | Perfil virtual → horario → skip services → panel |
| A domicilio   | Sin dirección → panel                            |
| Multi horario | Bloque semana + fin de semana                    |
| Imágenes      | Logo (crop) + banner                             |

### Studio

| Caso                         | Qué prueba                                             |
| ---------------------------- | ------------------------------------------------------ |
| Drop-in / membresía          | Alta pública → confirmación                            |
| Plan create                  | Crear plan de membresía en panel                       |
| Packs de créditos (producto) | Fuera de alcance; créditos solo como recovery interno  |
| Cuotas                       | Pagar / listar pendientes / filtro deuda               |
| Horarios fijos               | Abrir y guardar sin cambios                            |
| Roster + check-in            | Vacío, alta, waitlist, baja, errores, Presente/Ausente |
| Movimiento de clase          | Destinos, límite/override, horizonte y errores         |
| Schedule edit                | Capacidad / add-horarios / edit serie                  |
| Class type                   | Crear + editar precio drop-in                          |
| Cancel firmado               | Link `/e/` cancela clase                               |

### Pantalla (`@screen`)

- **Studio:** deep links de Clases/Horarios/Planes/Membresías, validación de
  clase y drop-in, combinación clase/profesional, horizonte de movimiento,
  cantidad exacta de horarios fijos, roster completo, movimientos y pager
  táctil semanal.
- **Calendario:** mes inicial en desktop, día inicial en mobile, cambio entre
  Mes/Semana/Día, swipe horizontal, modos Studio/turnos, edición por teclado,
  bloqueo local editable y bloqueo de Google read-only.
- **Empresa:** las seis superficies, guards de empleado y servicio sin guardar,
  sucursal física/virtual, programación semanal y días especiales, recursos
  compartidos, salas con validación estricta y diagnóstico completo.
- **Público:** productos soportados sin packs de créditos, búsqueda y vacío,
  selección multi-sucursal y multi-profesional, información/términos, embed,
  redirects protegidos, estados vacíos/errores, waitlist, disponibilidad
  drop-in, paquete multi-sesión, membresía y previews específicos.
- **Responsive y accesibilidad:** overflow horizontal, márgenes, contención de
  diálogos, footer fijo sin solapar contenido, tabs/días/cards seleccionados,
  teclado y swipe en desktop y Pixel 5.
- **Salud React:** Studio, Calendario y Empresa sin hydration mismatch,
  selectores Redux inestables, inputs inválidos ni errores de nesting.
- **Configuración y auth:** login, Datos básicos, color de marca, Reservas
  Online y lifecycle de leases.

### Auth / smoke / producción

| Caso        | Qué prueba                                 |
| ----------- | ------------------------------------------ |
| Login email | Professional login                         |
| Google      | Opt-in `@google`                           |
| Smoke       | Public + professional cargan; portal shell |
| Producción  | Read-only loads                            |

## Aún no (o parcial)

| Gap                                            | Nota                              |
| ---------------------------------------------- | --------------------------------- |
| Horarios → ventana de slots públicos           | Cubierto con intervalos 60/30 min |
| Color de marca en botones públicos             | Theme/cache; panel `@screen` sí   |
| Cancelación cliente vs `max_cancellation_time` | Preferir journey corto o API      |
| Medios de pago / MP                            | `@integration`                    |
| Recordatorios / WhatsApp                       | Entrega externa                   |
| Calendar Google write/sync real                | Integración externa; read-only sí |
| Waitlist promote                               | Después de factory cupo lleno     |

## Mobile (Pixel 5)

Mismos specs que desktop vía proyecto Playwright `Mobile Chrome`.
Los fixtures heredan viewport/`isMobile` en `createRecordedContext`.

| Script                         | Qué corre                        |
| ------------------------------ | -------------------------------- |
| `npm run test:screen:mobile`   | `tests/screen-validation`        |
| `npm run test:journeys:mobile` | `tests/journeys`                 |
| `npm run test:config:mobile`   | company-config + screen/config   |
| `npm run test:mobile`          | suite local menos `@integration` |

Scripts desktop (`test:screen`, `test:journeys`, …) quedan en `--project=chromium`.

Helpers touch-aware: drawer `menu`, strip de días L–D en Estudio, dismiss de ayuda flotante.

## Parallelismo

| Clase                                              | Workers                    |
| -------------------------------------------------- | -------------------------- |
| Clientes / creates únicos                          | OK con platform-per-worker |
| Mutators de config (Horarios, intervalo, términos) | Cada worker su company     |
| `e2e_prepare studio`                               | Slug por worker            |
| Onboarding                                         | Email distinto             |

Actualizá este archivo al agregar o retirar un caso.
