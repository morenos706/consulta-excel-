# apps/api — Backend

NestJS (Node.js + TypeScript), monolito modular. API REST versionada
(`/api/v1`) documentada con OpenAPI/Swagger, más un gateway WebSocket
para el Centro de Comando.

Estructura prevista en `src/modules/*` — un módulo por dominio de
negocio (auth, tenants, users, employees, contractors, brigade,
training, inspections, findings, risk-matrix, accidents, investigations,
ppe, emergency-equipment, maintenance, emergency-plan, drills,
command-center, work-permits, copasst, audits, action-plans, documents,
signatures, notifications, indicators, reports, ai, qr, audit-log).

Ver `docs/ARCHITECTURE.md` §4 (estructura del proyecto) y `docs/API.md`
(convenciones de la API).

## Base de datos (Fase 3 — completada)

El schema Prisma completo vive en `prisma/schema.prisma` (48 modelos) con
dos migraciones aplicadas en `prisma/migrations/`:

1. `init` — crea todas las tablas.
2. `enable_row_level_security` — aplica Row-Level Security por `tenantId`
   en las tablas de negocio (ver `docs/DATABASE.md` §4).

`prisma/seed.ts` siembra el catálogo de permisos, los 13 roles base con
sus permisos, y la empresa demo completa ("Empresa Demo Colombia": 3
sedes, 100 trabajadores, 10 brigadistas, equipos, inspecciones,
hallazgos, capacitaciones, simulacros, accidentes/incidentes y matriz de
riesgos).

```bash
cp .env.example .env   # ajustar DATABASE_URL
npm install
npx prisma migrate dev
npx prisma db seed
```

## Backend (Fase 4 — en progreso)

Arrancado con NestJS. Ya implementado y probado end-to-end contra la
base de datos real (migraciones + seed de la Empresa Demo Colombia):

- **Autenticación**: estrategia JWT intercambiable por configuración
  (`AUTH_MODE=dev` firma/verifica localmente para desarrollo;
  `AUTH_MODE=cognito` verifica contra el JWKS de un User Pool de Amazon
  Cognito — cambiar de uno a otro no requiere tocar código, ver
  `src/auth/strategies/jwt.strategy.ts`).
- **RBAC granular**: `PermissionsGuard` + `@RequirePermission(module, action)`
  verifican permisos concretos (no nombres de rol) contra el catálogo
  sembrado en la Fase 3.
- **Aislamiento multi-tenant en cada consulta**: `PrismaService.forTenant(tenantId, fn)`
  fija `app.current_tenant_id` dentro de la misma transacción antes de
  cada operación, activando la Row-Level Security de la Fase 3 como
  segunda barrera (ver `src/prisma/prisma.service.ts`).
- **Auditoría automática**: `AuditLogInterceptor` registra toda mutación
  de un controlador marcado con `@AuditEntity(...)` en `AuditLog`.
- **El flujo insignia de la plataforma, funcionando de punta a punta**:
  `POST /api/v1/inspections/:id/findings` crea el hallazgo **y** su
  acción correctiva en una sola transacción; `PATCH .../closure-evidence`
  y `PATCH .../verify` cierran el ciclo; `GET /api/v1/indicators/dashboard`
  refleja el cambio de inmediato porque lee de las mismas tablas
  transaccionales (sin sincronización aparte).
- Módulos con CRUD real: `employees` (incluye pasaporte digital de
  seguridad), `brigade` (incluye semáforo de competencia calculado),
  `inspections`, `findings`, `corrective-actions`, `indicators`.
- Pruebas unitarias de la máquina de estados de hallazgos y del guard de
  permisos (`npm test`).

```bash
cp .env.example .env   # ajustar DATABASE_URL
npm install
npx prisma migrate dev
npx prisma db seed
npm run build && npm run start:prod   # o npm run start:dev
npm test
```

Login de desarrollo (solo con `AUTH_MODE=dev`, deshabilitado en
`AUTH_MODE=cognito`):

```bash
curl -X POST http://localhost:3001/api/v1/auth/dev-login \
  -H 'Content-Type: application/json' \
  -d '{"email":"sst@empresademo.co","devSecret":"demo123"}'
```

**Pendiente de la Fase 4**: el resto de los módulos listados en
`docs/ARCHITECTURE.md` §4 (contratistas, matriz de peligros, accidentes,
EPP, equipos de emergencia, plan de emergencias/simulacros, permisos de
trabajo, COPASST, auditorías, documentos, notificaciones, IA), que
siguen el mismo patrón ya establecido aquí.
