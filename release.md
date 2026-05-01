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
- Busqueda por numero de presupuesto
- Añadir edicion de presupuestos en bolsa de trabajo
- Devolver el presupuesto en de la mesa de edicion a la bolsa de presupuestos

## v0.5 - 2026-04-25

### Tipo de release
Mejoras de usabilidad y flujo entre bolsa y mesa de planificación.

### Cambios aplicados
- Bolsa de aceptados: edición de presupuestos existentes.
- Bolsa de aceptados: búsqueda por número de presupuesto.
- Mesa de planificación: devolución de presupuestos a la bolsa conservando horas/desglose/personal/categoría (se eliminan fechas).
- Backend: ampliación automática de `accepted_budgets` para persistir campos de planificación (migración con `ALTER TABLE` al arrancar).

### Pendientes
- La posibilidad de subir el PDF del presupuesto cuando se crea en la bolsa de presupuestos.
- Añadir el campo de `#Ticket` asociado (relacionado con la plataforma externa de gestión de tickets).

## v0.6 - 2026-04-25

### Tipo de release
Adjuntos y trazabilidad externa: PDF asociado + campo `#Ticket`.

### Cambios aplicados
- Bolsa de aceptados: nuevo campo `#Ticket` (persistente).
- Mesa de planificación: nuevo campo `#Ticket` (persistente).
- Bolsa de aceptados: subida de PDF al crear/editar (opcional).
- Backend: endpoints para subir/descargar/eliminar PDF:
  - `POST /api/accepted-budgets/:id/pdf`, `GET /api/accepted-budgets/:id/pdf`, `DELETE /api/accepted-budgets/:id/pdf`
  - `POST /api/budgets/:id/pdf`, `GET /api/budgets/:id/pdf`, `DELETE /api/budgets/:id/pdf`
- Persistencia: metadatos `pdfFilename/pdfOriginalName` en SQLite y ficheros en volumen `/app/upload/pdfs`.
- Movimientos bolsa ↔ mesa: se conserva `#Ticket` y la referencia al PDF (no se borra el fichero si sigue referenciado).
- Backend: autenticación real por sesión (cookie HttpOnly) + roles/permisos (admin/editor/viewer).

### Pendientes
- Definir validación/tamaño máximo y política de retención de adjuntos.
- Añadir suite de pruebas automáticas (API y frontend).
- Ver la posibilidad de API para conectar a automatización N8N.

## v0.7 - 2026-04-26

### Tipo de release
Mejora de administración: gestión de usuarios/roles desde la UI.

### Cambios aplicados
- Frontend: nueva pestaña **Usuarios** visible solo para rol `admin`.
- UI: listado de usuarios con sus roles, activación/desactivación y reseteo de contraseña.
- Backend (auth):
  - `GET /api/auth/roles`: devuelve roles disponibles.
  - `GET /api/auth/users`: ahora incluye `roles` por usuario.
  - `PUT /api/auth/users/:id`: actualizar `isActive`, roles y/o contraseña.
- Corrección de UX: se evita recarga continua que hacía “parpadear” botones en la pantalla de usuarios.

### Notas
- Configuración local: se pueden eliminar variables antiguas de Firebase del `.env` (no versionado; ya no se usan en runtime).

## v0.8 - 2026-04-29

### Tipo de release
Mejora funcional: cierre de presupuestos y archivo de terminados.

### Cambios aplicados
- Nuevo flujo para mover presupuestos **completados** desde la mesa de planificación a **Ejecutados** conservando horas/personal/fechas.
- Backend: nueva tabla `executed_budgets` y endpoints:
  - `POST /api/budgets/:id/execute`
  - `GET /api/executed-budgets`
  - `DELETE /api/executed-budgets/:id`
  - `GET /api/executed-budgets/:id/pdf`
- Frontend: nueva vista/pestaña **Ejecutados** separada del dashboard principal.

## v0.9 - 2026-05-01

### Tipo de release
Mejoras de UX + reorganización de vistas (dashboard enfocado en carga).

### Cambios aplicados
- Ejecutados: vista en formato tabla (columnas) en lugar de tarjetas.
- Bolsa de aceptados: nuevo campo `Cliente` y búsqueda por número o cliente.
- Dashboard: añade horas **disponibles mensuales** por tipo (a partir de “Gestión de Personal”) junto a las horas usadas.
- UI: todas las tarjetas del dashboard/planificación son colapsables (persisten estado en `localStorage`).
- UI: se separa **Planificación** (bolsa + mesa + lista planificados) del **Dashboard (Carga)**.
