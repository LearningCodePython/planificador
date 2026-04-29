# Contexto del Proyecto

## Resumen
**Planificador de Recursos y Presupuestos** es una aplicación web para gestionar presupuestos, personal y planificación de capacidad.

A fecha **2026-04-26**, el proyecto funciona con arquitectura desacoplada:
- Frontend React
- Backend Express
- Base de datos SQLite
- Orquestación con Docker Compose

## Objetivo funcional vigente
- Registrar presupuestos en mesa de planificación.
- Gestionar una bolsa de presupuestos aceptados con entrada mínima.
- Asociar `#Ticket` a presupuestos (trazabilidad con plataforma externa).
- Subir y consultar PDF asociado a presupuestos (opcional).
- Mover presupuestos desde bolsa a planificación.
- Editar presupuestos directamente dentro de la bolsa.
- Buscar por número de presupuesto dentro de la bolsa.
- Devolver presupuestos desde la mesa a la bolsa conservando horas/desglose/personal/categoría (se eliminan fechas).
- Mover presupuestos completados de la mesa a **Ejecutados** conservando horas/personal/fechas.
- Gestionar personal (disponibilidad y rol).
- Analizar ocupación y carga de trabajo.
- Exportar datos de presupuestos a CSV.

## Arquitectura técnica vigente

### Frontend
- React 18 (`react-scripts`)
- Tailwind CSS
- Recharts
- Autenticación: sesión backend (cookie HttpOnly) consumida desde `useBackendAuth`.
- Gestión admin (UI): pestaña **Usuarios** visible solo para rol `admin` (alta/roles/activación/reset password).
- Hooks de dominio:
  - `useBudgets` (vía API REST)
  - `usePersonnel` (vía API REST)

### Backend
- Node.js + Express
- SQLite con inicialización automática de tablas
- Autenticación/autorización:
  - Sesión backend (cookie HttpOnly `planificador_session`)
  - Roles/permisos (`admin/editor/viewer`)
  - Endpoints `/api/auth/*` (`me/login/signup/logout` + admin `users/roles`)
- API REST local:
  - `/api/budgets`
  - `/api/executed-budgets`
  - `/api/personnel`
  - `/api/accepted-budgets`
  - Adjuntos PDF:
    - `POST/GET/DELETE /api/accepted-budgets/:id/pdf`
    - `POST/GET/DELETE /api/budgets/:id/pdf`
    - `GET /api/executed-budgets/:id/pdf`

Endpoints admin relevantes (auth):
- `GET /api/auth/roles`
- `GET /api/auth/users`
- `POST /api/auth/users`
- `PUT /api/auth/users/:id`

### Contenedores
- `planificador-web`
  - Nginx + build frontend
  - Reverse proxy de `/api` al backend
- `planificador-api`
  - API Express + SQLite
  - Persistencia en `./backend/data`

### Compose (local vs producción)
- `docker-compose.yml` (producción): preparado para Traefik (red externa `traefik_default` + labels).
- `docker-compose.override.yml` (local, no versionado): expone `8086:80` y define `depends_on` para simplificar el arranque local sin Traefik.

## Estructura principal
- `src/App.jsx`: composición de vistas/proveedores.
- `src/BudgetDashboard.jsx`: bolsa de aceptados, planificación y analítica.
- `src/PersonnelManager.jsx`: gestión de personal.
- `src/hooks/useBudgets.js`: integración completa con API de presupuestos y bolsa.
- `src/hooks/usePersonnel.js`: integración con API de personal.
- `src/hooks/useBackendAuth.js`: autenticación real (sesión backend).
- `backend/src/server.js`: arranque del backend.
- `backend/src/createApp.js`: rutas API + middleware de auth.
- `backend/data/planificador.sqlite`: persistencia local.
- `docker-compose.yml`: servicios `planificador-web` y `planificador-api`.
- `nginx.conf`: configuración SPA + proxy API.

## Modelo de datos operativo

### Presupuesto (`budgets`)
- `id`
- `name`
- `budgetNumber`
- `acceptanceDate`
- `ticketRef`
- `pdfFilename`
- `pdfOriginalName`
- `totalHours`
- `laborBreakdown: [{ type, hours }]`
- `startDate`
- `endDate`
- `status`
- `category`
- `assignedPersonnel: string[]`
- `fromAcceptedBag`

### Ejecutados (`executed_budgets`)
- `id`
- `sourceBudgetId` (referencia al presupuesto original en mesa)
- `name`
- `budgetNumber`
- `acceptanceDate`
- `ticketRef`
- `pdfFilename`
- `pdfOriginalName`
- `totalHours`
- `laborBreakdown: [{ type, hours }]`
- `startDate`
- `endDate`
- `status`
- `category`
- `assignedPersonnel: string[]`
- `fromAcceptedBag`
- `executedAt`

### Personal (`personnel`)
- `id`
- `name`
- `laborType`
- `hoursPerDay`
- `daysPerWeek`

### Bolsa de aceptados (`accepted_budgets`)
- `id`
- `name`
- `budgetNumber`
- `acceptanceDate`
- `ticketRef`
- `pdfFilename`
- `pdfOriginalName`
- `status`
- `totalHours`
- `laborBreakdown: [{ type, hours }]`
- `category`
- `assignedPersonnel: string[]`

## Estado y decisiones actuales
- Se eliminó Firebase del runtime (datos y dependencias) para priorizar estabilidad local.
- Persistencia unificada en SQLite para facilitar pruebas, backup y control de datos.
- La API está protegida por autenticación backend real (sesión) y autorización por roles/permisos.
- Adjuntos PDF: almacenados en volumen del backend (ruta contenedor: `/app/upload/pdfs`).

## Notas de migración recientes
- La tabla `accepted_budgets` se amplía automáticamente al arrancar el backend (ALTER TABLE) para incluir campos de planificación (horas/desglose/personal/categoría).
- Al devolver un presupuesto desde la mesa de planificación a la bolsa se conservan esos campos y se eliminan las fechas (`startDate/endDate`) porque en la bolsa se gestiona sin calendario.
- Al pasar un presupuesto a **Ejecutados**, se conserva la planificación (fechas, horas, desglose y personal) y se elimina de la mesa.

## Carencias técnicas activas
- Falta suite de pruebas automáticas completa (API e integración frontend-backend).
- Faltan validaciones de negocio avanzadas (reglas por estado, consistencia temporal, etc.).

## Regla de versionado
`release.md` debe mantenerse como historial acumulativo. Al documentar una nueva versión, se debe añadir una nueva sección sin eliminar ni sobreescribir notas de versiones anteriores.

## Punto de inicio para próximas mejoras
1. Añadir pruebas de regresión (API + frontend).
2. Endurecer validaciones (negocio + adjuntos).
3. Definir roadmap tras pruebas de usuario.
