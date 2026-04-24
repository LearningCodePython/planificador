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

### Presupuestos
- Crear, editar y eliminar presupuestos.
- Desglose por tipo de mano de obra.
- Estados, categoría y fechas de planificación.
- Asignación de personal.
- Duplicado mediante plantilla.

### Bolsa de Presupuestos Aceptados
- Alta rápida con:
  - Nombre
  - Número de presupuesto
  - Fecha de aceptación
- Movimiento de la bolsa a la mesa de planificación.

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
- `id`, `name`, `budgetNumber`, `acceptanceDate`
- `totalHours`, `laborBreakdown`
- `startDate`, `endDate`, `status`, `category`
- `assignedPersonnel`, `fromAcceptedBag`

### `personnel`
- `id`, `name`, `laborType`, `hoursPerDay`, `daysPerWeek`

### `accepted_budgets`
- `id`, `name`, `budgetNumber`, `acceptanceDate`, `status`

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

## Estructura relevante

- `src/` frontend React
- `backend/src/server.js` API Express + SQLite
- `backend/data/` fichero SQLite persistente
- `docker-compose.yml` Compose de producción (Traefik)
- `docker-compose.override.yml` ajustes locales (puertos/depends_on)
- `nginx.conf` proxy `/api` y fallback SPA

## Roadmap corto

- Añadir autenticación real en backend (sesión/usuarios).
- Incorporar pruebas automáticas (API y frontend).
- Mejorar validaciones de negocio y trazabilidad de cambios.

## Licencia

MIT.
