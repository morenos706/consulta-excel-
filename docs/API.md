# API — Seguridad 360 Colombia

> Estado: contrato definido en Fase 1. Fase 4 (Backend) en progreso —
> los módulos de la sección 2.1 ya están implementados y probados
> end-to-end contra la base de datos real; el resto sigue el mismo
> patrón (`apps/api/src/modules/<dominio>`).

## 1. Convenciones generales

- Base path versionado: `/api/v1/...`. Cambios incompatibles crean
  `/api/v2` en vez de romper clientes existentes.
- Formato: JSON, `Content-Type: application/json`.
- Autenticación: `Authorization: Bearer <JWT emitido por Cognito>`.
- Todo request autenticado resuelve `tenant_id` y `role` desde el token,
  nunca desde el body/query — evita que un cliente intente operar sobre
  otro tenant.
- Documentación: OpenAPI/Swagger autogenerado desde los decoradores de
  NestJS, publicado en `/api/v1/docs` (protegido en producción).
- Paginación: `?page=&pageSize=` con máximo configurable por endpoint;
  respuestas de listado incluyen `{ data, total, page, pageSize }`. **Aún
  no implementada** en los módulos actuales (listan sin paginar, viable a
  la escala de la empresa demo); se agrega cuando el volumen de datos de
  un tenant real lo requiera, sin cambiar la forma de la ruta.
- Filtros: query params explícitos por recurso (`?siteId=&status=&from=&to=`),
  nunca un query builder libre expuesto al cliente.
- Errores: formato uniforme
  `{ statusCode, message, error, path, timestamp }`.
- Rate limiting: por IP y por usuario autenticado, más estricto en
  endpoints de autenticación y de exportación masiva.

## 2. Recursos principales (por módulo)

Cada módulo de `apps/api/src/modules/*` expone un recurso REST estándar:

```
GET    /api/v1/{recurso}            listar (filtrable)
GET    /api/v1/{recurso}/:id        detalle
POST   /api/v1/{recurso}            crear
PATCH  /api/v1/{recurso}/:id        actualizar
DELETE /api/v1/{recurso}/:id        eliminar (soft delete donde aplique)
```

### 2.1 Endpoints implementados (Fase 4, en progreso)

Todos requieren `Authorization: Bearer <token>` y el permiso indicado
(`módulo:acción`, ver `docs/SECURITY.md` y `docs/ARCHITECTURE.md` §6):

| Endpoint | Permiso | Descripción |
|---|---|---|
| `POST /api/v1/auth/dev-login` | público (solo `AUTH_MODE=dev`) | Emite un JWT de desarrollo — Cognito lo reemplaza en producción |
| `GET/POST /api/v1/employees` | `employees:VIEW`/`CREATE` | CRUD de trabajadores |
| `PATCH/DELETE /api/v1/employees/:id` | `employees:EDIT`/`DELETE` | Actualizar / dar de baja (soft delete) |
| `GET /api/v1/employees/:id/security-passport` | `employees:VIEW` | Pasaporte digital de seguridad (§11) |
| `GET/POST /api/v1/brigadists` | `brigade:VIEW`/`CREATE` | Alta y listado de brigadistas |
| `GET /api/v1/brigadists/:id/competency-status` | `brigade:VIEW` | Semáforo de competencia calculado (§8) |
| `GET/POST /api/v1/inspections` | `inspections:VIEW`/`CREATE` | Inspecciones sobre una plantilla |
| `GET /api/v1/inspections/:id` | `inspections:VIEW` | Detalle con hallazgos y acciones |
| `POST /api/v1/inspections/:id/findings` | `findings:CREATE` | Registra el hallazgo **y** su acción correctiva en una sola transacción |
| `GET /api/v1/findings` | `findings:VIEW` | Listado, filtrable por `?status=` |
| `PATCH /api/v1/findings/:id/closure-evidence` | `findings:EDIT` | Sube evidencia de cierre → `PENDING_VERIFICATION` |
| `PATCH /api/v1/findings/:id/verify` | `findings:APPROVE` | Verifica y cierra hallazgo + acción correctiva |
| `GET /api/v1/corrective-actions` | `findings:VIEW` | Filtrable por `?status=` y `?overdue=true` |
| `GET /api/v1/indicators/dashboard` | `dashboard:VIEW` | Indicadores generales (§6) — se actualiza en vivo al cerrar hallazgos |

### 2.2 Endpoints planeados (mismo patrón, pendientes de Fase 4)

- `PATCH /api/v1/emergencies/:id` / evento WebSocket — activar/actualizar estado de emergencia.
- `GET /api/v1/brigadists/:id/id-card` — carné digital con QR.
- `POST /api/v1/danger-reports` — reporte de condición insegura desde la PWA.
- `GET /api/v1/qr/:code` — resolución de QR (equipo, brigadista, credencial).
- Contratistas, EPP, equipos de emergencia, plan de emergencias/simulacros,
  permisos de trabajo, COPASST, auditorías, documentos, notificaciones.

## 3. WebSocket (Centro de Comando)

Canal separado (`/ws/command-center`) para:

- Cambios de estado de sede (`NORMAL/PREALERTA/ALERTA/EMERGENCIA`).
- Botón de emergencia activado (ubicación, usuario, sede).
- Actualización en vivo de brigadistas disponibles.

Autenticado con el mismo JWT; el servidor valida `tenant_id` en la
conexión y solo emite eventos del tenant correspondiente.

## 4. Integraciones futuras (arquitectura preparada, no implementadas en MVP)

La capa de módulos está diseñada para exponer adaptadores en
`modules/integrations/*` sin tocar la lógica de negocio central:

- ARL (reporte de accidentes).
- Plataformas de capacitación externas (SCORM/xAPI).
- ERP / nómina (sincronización de trabajadores).
- Sistemas de control de acceso físico.
- Pasarelas de pago colombianas (Stripe/Wompi/Mercado Pago) para el
  modelo de suscripción SaaS.

## 5. Seguridad de la API

Ver `SECURITY.md` — validación de entrada con DTOs, autorización por
permiso (no solo por rol), rate limiting, CORS restringido por ambiente.
