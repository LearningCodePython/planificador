# Contexto del Proyecto

## Resumen
**Planificador de Recursos y Presupuestos** es una aplicación web para gestionar presupuestos, personal y planificación de capacidad.

A fecha **2026-04-25**, el proyecto funciona con arquitectura desacoplada:
- Frontend React
- Backend Express
- Base de datos SQLite
- Orquestación con Docker Compose

## Objetivo funcional vigente
- Registrar presupuestos en mesa de planificación.
- Gestionar una bolsa de presupuestos aceptados con entrada mínima.
- Mover presupuestos desde bolsa a planificación.
- Editar presupuestos directamente dentro de la bolsa.
- Buscar por número de presupuesto dentro de la bolsa.
- Devolver presupuestos desde la mesa a la bolsa conservando horas/desglose/personal/categoría (se eliminan fechas).
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
- `src/hooks/useLocalAuth.js`: autenticación local simplificada temporal.
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
- `totalHours`
- `laborBreakdown: [{ type, hours }]`
- `category`
- `assignedPersonnel: string[]`

## Estado y decisiones actuales
- Se eliminó Firebase del runtime (datos y dependencias) para priorizar estabilidad local.
- Persistencia unificada en SQLite para facilitar pruebas, backup y control de datos.
- La autenticación está en modo local simplificado (frontend) y pendiente de endurecimiento en backend.

## Notas de migración recientes
- La tabla `accepted_budgets` se amplía automáticamente al arrancar el backend (ALTER TABLE) para incluir campos de planificación (horas/desglose/personal/categoría).
- Al devolver un presupuesto desde la mesa de planificación a la bolsa se conservan esos campos y se eliminan las fechas (`startDate/endDate`) porque en la bolsa se gestiona sin calendario.

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
