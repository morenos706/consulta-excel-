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

**Estado**: base de datos lista (Fase 3). Módulos de la API en NestJS
pendientes de implementación (Fase 4 del roadmap).
