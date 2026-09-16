# Seguridad 360 Colombia

Plataforma SaaS multi-tenant para gestión integral de Seguridad y Salud
en el Trabajo (SG-SST), brigadas de emergencia, gestión del riesgo,
inspecciones, capacitación, accidentalidad, contratistas, auditorías,
indicadores e IA preventiva.

> **Estado del proyecto: Fase 1 — Arquitectura completada.**
> Este repositorio contiene la arquitectura maestra y la estructura base
> del monorepo. La implementación de cada módulo avanza por fases (ver
> `docs/ARCHITECTURE.md` §9 Roadmap).

## Documentación

| Documento | Contenido |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Arquitectura general, stack, estructura de carpetas, roles, flujos, roadmap, MVP |
| [`docs/DATABASE.md`](docs/DATABASE.md) | Modelo de datos, entidades, convenciones, migraciones, backups |
| [`docs/API.md`](docs/API.md) | Convenciones de la API REST, recursos, WebSocket, integraciones futuras |
| [`docs/SECURITY.md`](docs/SECURITY.md) | Autenticación, RBAC, cifrado, auditoría, protección de datos, cumplimiento normativo |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Ambientes, Docker, CI/CD, variables de entorno, dominio, rollback |

## Estructura del monorepo

```
apps/
  web/            Aplicación web administrativa (Next.js)
  mobile-pwa/     PWA para trabajadores, brigadistas e inspectores
  api/            API backend (NestJS)
packages/
  shared-types/   Tipos/DTOs compartidos entre apps
  ui/             Componentes de interfaz compartidos (design system)
infra/
  terraform/      Infraestructura como código (AWS)
  docker/         Entorno de desarrollo local
docs/             Documentación de arquitectura, base de datos, API, seguridad, deploy
```

Cada carpeta bajo `apps/` y `packages/` incluye un `README.md` propio
describiendo su alcance y estado; se completan en las fases 3 a 8 del
roadmap.

## Principio de diseño

Cada módulo se integra con los demás: una inspección genera hallazgos,
un hallazgo genera una acción correctiva, su cierre alimenta un
indicador. La plataforma no es un conjunto de formularios aislados, sino
un ecosistema donde la información fluye entre módulos (ver
`docs/ARCHITECTURE.md` §8 Flujos principales).

## Cumplimiento normativo

La plataforma es una herramienta de gestión y apoyo documental. No
certifica cumplimiento legal por sí sola — ver `docs/SECURITY.md` §7.

## Próximos pasos

1. Validar el alcance del MVP (`docs/ARCHITECTURE.md` §10) con el
   equipo de producto.
2. Fase 2 — UX/UI: wireframes de dashboard, inspecciones, carné de
   brigadista, pasaporte de seguridad, Centro de Comando.
3. Fase 3 — Base de datos: schema Prisma, migraciones, seed de la
   empresa demo.
