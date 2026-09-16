# API — Seguridad 360 Colombia

> Estado: contrato y convenciones definidos en Fase 1. La implementación
> de los endpoints por módulo se entrega en Fase 4 (Backend).

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
  respuestas de listado incluyen `{ data, total, page, pageSize }`.
- Filtros: query params explícitos por recurso (`?siteId=&status=&from=&to=`),
  nunca un query builder libre expuesto al cliente.
- Errores: formato uniforme
  `{ statusCode, message, error, path, timestamp }`.
- Rate limiting: por IP y por usuario autenticado, más estricto en
  endpoints de autenticación y de exportación masiva.

## 2. Recursos principales (por módulo)

Cada módulo de `apps/api/src/modules/*` expone un recurso REST estándar:

```
GET    /api/v1/{recurso}            listar (paginado, filtrable)
GET    /api/v1/{recurso}/:id        detalle
POST   /api/v1/{recurso}            crear
PATCH  /api/v1/{recurso}/:id        actualizar
DELETE /api/v1/{recurso}/:id        eliminar (soft delete donde aplique)
```

Con variaciones específicas por dominio, por ejemplo:

- `POST /api/v1/inspections/:id/findings` — registrar hallazgo dentro de una inspección.
- `PATCH /api/v1/findings/:id/close` — cerrar hallazgo con evidencia.
- `POST /api/v1/emergency/broadcast` — activar alerta de emergencia (WebSocket + push).
- `GET /api/v1/brigadists/:id/competency-status` — semáforo calculado.
- `GET /api/v1/employees/:id/security-passport` — pasaporte digital de seguridad.
- `POST /api/v1/danger-reports` — reporte de condición insegura desde la PWA.
- `GET /api/v1/qr/:code` — resolución de QR (equipo, brigadista, credencial).

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
