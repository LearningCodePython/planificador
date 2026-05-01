# Planificador de Recursos y Presupuestos

Aplicación web para gestionar presupuestos, personal y capacidad operativa.

Estado actual: arquitectura desacoplada en **frontend + backend + SQLite** ejecutada con Docker Compose.

## Arquitectura

- `planificador-web`
  - React 18
  - Tailwind CSS
  - Recharts
  - Nginx para servir estáticos
  - Proxy de `/api` hacia backend

- `planificador-api`
  - Node.js + Express
  - SQLite (`backend/data/planificador.sqlite`)
  - API REST para presupuestos, personal y bolsa de aceptados

## Funcionalidades

## Vistas (UI)

La aplicación se organiza en pestañas:
- **Dashboard (Carga)**: visual de carga de trabajo y resúmenes.
- **Planificación**: bolsa de aceptados, mesa de planificación y lista de presupuestos planificados.
- **Ejecutados**: presupuestos archivados/terminados.
- **Gestión de Personal**: mantenimiento de personal y capacidad.
- **Usuarios** (solo `admin`): administración de usuarios/roles.

### Presupuestos
- Crear, editar y eliminar presupuestos.
- Campo `#Ticket` asociado (trazabilidad externa).
- Desglose por tipo de mano de obra.
- Estados, categoría y fechas de planificación.
- Asignación de personal.
- Duplicado mediante plantilla.
- Finalización: mover presupuestos completados a **Ejecutados** conservando horas/personal/fechas.

### Bolsa de Presupuestos Aceptados
- Alta rápida con:
  - Nombre
  - Cliente
  - Número de presupuesto
  - `#Ticket` (opcional)
  - Fecha de aceptación
- Subida de PDF del presupuesto (opcional).
- Edición de presupuestos dentro de la bolsa.
- Búsqueda por **número o cliente** dentro de la bolsa.
- Movimiento de la bolsa a la mesa de planificación.
- Devolución desde la mesa de planificación a la bolsa (conserva horas/desglose/personal/categoría y elimina fechas).

### Ejecutados
- Listado de presupuestos terminados (migrados desde la mesa de planificación).
- Conserva datos de planificación: horas, personal y fechas.

### Personal
- Alta, edición y baja de personal.
- Configuración de horas/día y días/semana.
- Visualización de asignaciones por persona.

### Análisis
- Carga de trabajo individual.
- Resumen por tipo de mano de obra.
- Ocupación mensual en gráfico.
- Estimación de fecha de fin según capacidad.
- Exportación de presupuestos a CSV.

## Modelo de datos (resumen)

### `budgets`
- `id`, `name`, `budgetNumber`, `acceptanceDate`, `ticketRef`
- `pdfFilename`, `pdfOriginalName` (metadatos del adjunto)
- `totalHours`, `laborBreakdown`
- `startDate`, `endDate`, `status`, `category`
- `assignedPersonnel`, `fromAcceptedBag`

### `executed_budgets`
- `id`, `sourceBudgetId`, `name`, `budgetNumber`, `acceptanceDate`, `ticketRef`
- `pdfFilename`, `pdfOriginalName` (metadatos del adjunto)
- `totalHours`, `laborBreakdown`
- `startDate`, `endDate`, `status`, `category`
- `assignedPersonnel`, `fromAcceptedBag`
- `executedAt`

### `personnel`
- `id`, `name`, `laborType`, `hoursPerDay`, `daysPerWeek`

### `accepted_budgets`
- `id`, `name`, `client`, `budgetNumber`, `acceptanceDate`, `status`, `ticketRef`
- `pdfFilename`, `pdfOriginalName` (metadatos del adjunto)
- `totalHours`, `laborBreakdown`, `category`, `assignedPersonnel`

## Puesta en marcha con Docker

Requisito: Docker + Docker Compose.

### Local (sin Traefik)

Se usa `docker-compose.override.yml` para exponer el puerto local. Ese fichero **no se versiona** (está en `.gitignore`).

1. Construir y levantar:
```bash
docker compose up --build -d
```

2. Ver estado:
```bash
docker compose ps
```

3. Logs del backend:
```bash
docker compose logs -f planificador-api
```

4. Acceso aplicación:
- Frontend: `http://localhost:8086`

### Producción (con Traefik)

El `docker-compose.yml` está pensado para ejecutarse detrás de Traefik en una red externa `traefik_default` y no publica puertos directamente.

## Adjuntos (PDF)

Los PDFs se almacenan en el backend en `/app/upload/pdfs` (normalmente mapeado a `/var/lib/contel-planificador/upload` por Compose).

Endpoints:
- `POST /api/accepted-budgets/:id/pdf` (multipart `file`)
- `GET /api/accepted-budgets/:id/pdf`
- `DELETE /api/accepted-budgets/:id/pdf`
- `POST /api/budgets/:id/pdf` (multipart `file`)
- `GET /api/budgets/:id/pdf`
- `DELETE /api/budgets/:id/pdf`
- `GET /api/executed-budgets/:id/pdf`

## Autenticación (backend)

La API está protegida con **sesión backend** (cookie HttpOnly `planificador_session`) y **roles/permisos**.

Endpoints:
- `GET /api/auth/me`
- `POST /api/auth/login`
- `POST /api/auth/signup`
- `POST /api/auth/logout`
- Admin: `GET /api/auth/users` (listar usuarios + roles)
- Admin: `POST /api/auth/users` (crear usuario + roles)
- Admin: `PUT /api/auth/users/:id` (activar/desactivar, roles, reset password)
- Admin: `GET /api/auth/roles` (lista de roles disponibles)

Roles seed por defecto:
- `admin`: acceso total.
- `editor`: CRUD de presupuestos/personal/bolsa y PDFs.
- `viewer`: solo lectura.

Bootstrap de admin (primer arranque, BD vacía):
- Si defines `BOOTSTRAP_ADMIN_EMAIL` y `BOOTSTRAP_ADMIN_PASSWORD`, se crea ese admin.
- Si no, se crea `admin@planificador.local` con contraseña aleatoria (se imprime en logs del backend).

Gestión desde UI:
- Si el usuario autenticado tiene rol `admin`, aparece la pestaña **Usuarios** para crear usuarios y asignar roles (y activar/desactivar/resetear contraseña).

## Estructura relevante

- `src/` frontend React
- `backend/src/server.js` API Express + SQLite
- `backend/data/` fichero SQLite persistente
- `docker-compose.yml` Compose de producción (Traefik)
- `docker-compose.override.yml` ajustes locales (puertos/depends_on)
- `nginx.conf` proxy `/api` y fallback SPA

## Roadmap corto

- Incorporar pruebas automáticas (API y frontend).
- Mejorar validaciones de negocio y trazabilidad de cambios.

## Licencia

MIT.
