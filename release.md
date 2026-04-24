# Release Notes

## v0.1 - 2026-04-22

### Tipo de release
Baseline funcional documentada tras auditoría de README + código.

### Alcance observado en código
- Aplicación React para planificación de presupuestos y personal.
- Integración con Firebase Auth y Firestore.
- Gestión completa de presupuestos y personal (alta/edición/eliminación).
- Asignación de personal a presupuestos.
- Cálculos de capacidad mensual y ocupación por persona.
- Proyección de fecha de finalización por capacidad semanal.
- Exportación CSV de presupuestos.
- Tema claro/oscuro persistido en navegador.

### Conclusiones de la revisión
- El proyecto tiene una base funcional usable para pruebas iniciales.
- La estructura por hooks/contextos está bien encaminada para escalar mejoras.
- Hay incoherencias entre documentación y comportamiento real (especialmente autenticación).
- Faltan pruebas automatizadas ejecutables en el entorno actual.

### Carencias y riesgos detectados
- Sin validación automática (tests/lint) en esta revisión por falta de dependencias instaladas en el workspace.
- Sin historial formal de versiones previo a este release.
- Riesgo de degradación si no se normaliza documentación vs implementación.
- Posible sobrecoste de listeners Firestore por consumo duplicado de hooks entre vistas.

### Acciones sugeridas para v0.2
- Actualizar README para reflejar el comportamiento real actual.
- Definir criterio de autenticación objetivo (email/password o anónima) y unificar.
- Añadir base mínima de pruebas (al menos utilidades y hooks críticos).
- Revisar estrategia de carga de datos para evitar listeners redundantes.
- Documentar backlog priorizado según carencias detectadas en pruebas de usuario.

## v0.2 - 2026-04-22

### Tipo de release
Migración de arquitectura de datos: Firebase/Firestore a backend local con SQLite.

### Cambios aplicados
- Nuevo backend `Express + SQLite` en `backend/`.
- API REST local para `budgets`, `personnel` y `accepted_budgets`.
- Persistencia en archivo SQLite local (`backend/data/planificador.sqlite`).
- Frontend refactorizado para consumir `/api` con `fetch` (sin dependencias de Firestore).
- Adaptación del entorno Docker a dos servicios:
  - `planificador-web` (Nginx + frontend React build)
  - `planificador-api` (Node/Express + SQLite)
- Nginx configurado como reverse proxy para `/api`.

### Impacto funcional
- Se mantiene el flujo funcional de presupuestos/personas y bolsa de aceptados.
- Los datos pasan a quedar almacenados localmente en SQLite dentro del proyecto.
- Se elimina la dependencia operativa de Firebase para el almacenamiento diario.

### Riesgos/pendientes
- Autenticación local simplificada temporalmente (sin backend auth real).
- Faltan pruebas automáticas de integración frontend-backend.
- README y `context.md` pendientes de actualización completa por cambio de arquitectura.

## v0.3 - 2026-04-22

### Tipo de release
Consolidación de arquitectura local y actualización de documentación.

### Cambios aplicados
- Se valida la operación completa en contenedores con dos servicios (`planificador-web` y `planificador-api`).
- Se ajusta `backend/Dockerfile` para usar `node:20-alpine` y mejorar consistencia con el entorno.
- Se elimina configuración obsoleta de Compose (`version`) para evitar warnings.
- Se mantiene activa la nueva bolsa de presupuestos aceptados y su flujo hacia mesa de planificación.
- Se actualiza `README.md` para reflejar arquitectura real, flujo operativo y comandos de ejecución actuales.
- Se actualiza `context.md` con estado técnico consolidado y prioridades reales de la siguiente fase.

### Impacto funcional
- El proyecto queda documentado de forma coherente con su implementación actual.
- Se reduce fricción en despliegue local al unificar base de imagen y simplificar Compose.
- El equipo dispone de base estable para continuar mejoras sin dependencia operativa de Firebase.

### Pendientes
- Implementar autenticación backend real.
- Añadir pruebas automáticas de API y frontend.
- Definir reglas de validación avanzada de negocio para planificación.

## v0.4 - 2026-04-24

### Tipo de release
Limpieza de dependencias y separación de Compose por entorno (local vs producción).

### Cambios aplicados
- Eliminación de Firebase del proyecto (dependencia `firebase` y código asociado).
- Renombrado del hook de auth local a `useLocalAuth` (sin referencias a Firebase en runtime).
- `docker-compose.yml` orientado a producción con Traefik (red externa `traefik_default` + labels).
- Nuevo `docker-compose.override.yml` para entorno local (puertos `8086:80` y `depends_on`).
- Documentación actualizada (`README.md`, `context.md`).

### Pendientes
- Implementar autenticación backend real (sesión/roles/permisos).
- Añadir suite de pruebas automáticas (API y frontend).
