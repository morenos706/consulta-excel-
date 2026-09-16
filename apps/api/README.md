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

**Estado**: pendiente de implementación (Fase 4 del roadmap).
