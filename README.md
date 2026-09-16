# Seguridad 360 Colombia

Plataforma SaaS multi-tenant para gestión integral de Seguridad y Salud
en el Trabajo (SG-SST), brigadas de emergencia, gestión del riesgo,
inspecciones, capacitación, accidentalidad, contratistas, auditorías,
indicadores e IA preventiva.

> **Estado del proyecto:** Fase 1 (Arquitectura) y Fase 3 (Base de datos)
> completadas. Fase 4 (Backend) en progreso: autenticación JWT
> (intercambiable dev/Amazon Cognito), RBAC granular, aislamiento
> multi-tenant reforzado con Row-Level Security, auditoría automática, y
> el flujo insignia completo (inspección → hallazgo → acción correctiva
> → cierre → indicador) funcionando de punta a punta contra la base de
> datos real. Fase 5 (Frontend web) en progreso: login, dashboard,
> trabajadores, brigada e inspecciones/hallazgos funcionando contra la
> API real, con el flujo insignia completo operable desde la interfaz
> (ver pantallazos y detalle en `apps/web/README.md`).
> Fase 8 (infraestructura AWS) escrita en Terraform y revisada,
> **pendiente de aplicarse en una cuenta real** (requiere aprobación y
> credenciales de un humano — ver `docs/DEPLOYMENT.md`).
> Ver `apps/api/README.md` y `apps/web/README.md` para cómo probarlo.

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

## Base de datos (Fase 3)

```bash
docker compose -f infra/docker/docker-compose.yml up -d
cd apps/api
cp .env.example .env
npm install
npx prisma migrate dev
npx prisma db seed
```

Ver `docs/DATABASE.md` para el detalle del schema, la estrategia de
Row-Level Security multi-tenant y los datos de la empresa demo.

## Frontend web (Fase 5)

Con el backend corriendo (ver arriba y `apps/api/README.md`):

```bash
cd apps/web
cp .env.local.example .env.local
npm install
npm run dev
```

Abrir `http://localhost:3000` → redirige a `/login`. Ver
`apps/web/README.md` para los usuarios de prueba y qué pantallas ya
funcionan.

## Infraestructura AWS (Fase 8)

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars   # ajustar valores
terraform init
terraform plan -out=tfplan     # REVISAR el plan completo antes de aplicar
terraform apply tfplan         # ejecutarlo solo con credenciales propias, tras revisar
```

Ver `docs/DEPLOYMENT.md` para el runbook completo, el costo estimado, y
qué se validó de este código en esta sesión (formato + revisión manual)
frente a lo que falta validar (`terraform plan` contra una cuenta real —
el registro de Terraform estaba bloqueado por política de red en el
entorno donde se escribió).

## Próximos pasos

1. Continuar la Fase 5 — Frontend: pantallas de trabajadores, brigada,
   inspecciones y hallazgos (mismo patrón de `apps/web/app/dashboard`),
   habilitando esos ítems del menú lateral.
2. Continuar la Fase 4 — Backend: replicar el patrón ya establecido
   (`apps/api/src/modules/*`) en los módulos restantes del MVP
   (contratistas, EPP, equipos de emergencia, plan de emergencias,
   documentos, notificaciones, auditorías, COPASST).
3. Ejecutar `terraform plan`/`apply` de la Fase 8 desde un entorno con
   acceso real a AWS y al registro de Terraform, y desplegar la primera
   versión de la API.
4. Validar el alcance del MVP (`docs/ARCHITECTURE.md` §10) con el
   equipo de producto.
5. Fase 10 — CI/CD: pipeline de GitHub Actions que automatice el
   runbook manual de `docs/DEPLOYMENT.md` §3.2.
