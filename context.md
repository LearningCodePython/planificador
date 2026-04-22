# Contexto del Proyecto

## Resumen
**Planificador de Recursos y Presupuestos** es una aplicación web para gestionar presupuestos, personal y planificación de capacidad.

A fecha **2026-04-22**, el proyecto funciona en local con arquitectura desacoplada:
- Frontend React
- Backend Express
- Base de datos SQLite
- Orquestación con Docker Compose

## Objetivo funcional vigente
- Registrar presupuestos en mesa de planificación.
- Gestionar una bolsa de presupuestos aceptados con entrada mínima.
- Mover presupuestos desde bolsa a planificación.
- Gestionar personal (disponibilidad y rol).
- Analizar ocupación y carga de trabajo.
- Exportar datos de presupuestos a CSV.

## Arquitectura técnica vigente

### Frontend
- React 18 (`react-scripts`)
- Tailwind CSS
- Recharts
- Hooks de dominio:
  - `useBudgets` (vía API REST)
  - `usePersonnel` (vía API REST)

### Backend
- Node.js + Express
- SQLite con inicialización automática de tablas
- API REST local:
  - `/api/budgets`
  - `/api/personnel`
  - `/api/accepted-budgets`

### Contenedores
- `planificador-web`
  - Nginx + build frontend
  - Reverse proxy de `/api` al backend
- `planificador-api`
  - API Express + SQLite

## Estructura principal
- `src/App.jsx`: composición de vistas/proveedores.
- `src/BudgetDashboard.jsx`: bolsa de aceptados, planificación y analítica.
- `src/PersonnelManager.jsx`: gestión de personal.
- `src/hooks/useBudgets.js`: integración completa con API de presupuestos y bolsa.
- `src/hooks/usePersonnel.js`: integración con API de personal.
- `src/hooks/useFirebase.js`: autenticación local simplificada temporal.
- `backend/src/server.js`: backend Express y acceso SQLite.
- `backend/data/planificador.sqlite`: persistencia local.
- `docker-compose.yml`: servicios `planificador-web` y `planificador-api`.
- `nginx.conf`: configuración SPA + proxy API.

## Modelo de datos operativo

### Presupuesto (`budgets`)
- `id`
- `name`
- `budgetNumber`
- `acceptanceDate`
- `totalHours`
- `laborBreakdown: [{ type, hours }]`
- `startDate`
- `endDate`
- `status`
- `category`
- `assignedPersonnel: string[]`
- `fromAcceptedBag`

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
- `status`

## Estado y decisiones actuales
- Se abandonó Firebase como almacenamiento operativo para priorizar estabilidad local.
- Persistencia unificada en SQLite para facilitar pruebas, backup y control de datos.
- La autenticación está en modo temporal simplificado y pendiente de endurecimiento.

## Carencias técnicas activas
- Falta autenticación backend real (sesiones/roles/permisos).
- Falta suite de pruebas automáticas de API y frontend.
- Faltan validaciones de negocio avanzadas (reglas por estado, consistencia temporal, etc.).

## Regla de versionado
`release.md` debe mantenerse como historial acumulativo. Al documentar una nueva versión, se debe añadir una nueva sección sin eliminar ni sobreescribir notas de versiones anteriores.

## Punto de inicio para próximas mejoras
1. Diseñar e implementar autenticación/autorización backend.
2. Añadir pruebas automáticas mínimas de regresión.
3. Definir roadmap de mejoras funcionales tras las primeras pruebas de usuario.
