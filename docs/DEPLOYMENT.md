# Deployment — Seguridad 360 Colombia

> Estado: plan definido en Fase 1. La infraestructura desplegable
> (Terraform, Dockerfiles, pipelines) se entrega en Fase 8/10.

## 1. Ambientes

| Ambiente | Propósito | Infraestructura |
|---|---|---|
| `dev` | Desarrollo local | Docker Compose (Postgres, Redis, LocalStack opcional para S3/SQS) |
| `staging` | Validación pre-producción | AWS, réplica reducida de producción |
| `production` | Producción | AWS, Multi-AZ |

## 2. Docker (desarrollo local)

`infra/docker/docker-compose.yml` levanta:

- `postgres` (PostgreSQL 15+)
- `redis` (cache/rate limiting local)
- `api` (NestJS, hot reload)
- `web` (Next.js, hot reload)

## 3. CI/CD (GitHub Actions)

Pipeline por PR (`.github/workflows/ci.yml`):

1. Lint + type-check (`eslint`, `tsc --noEmit`).
2. Unit tests (`api`, `web`, `packages/*`).
3. Build de cada app.
4. (main) Build de imagen Docker → push a Amazon ECR.
5. (main) Deploy a ECS Fargate (staging automático, producción con
   aprobación manual).

Ningún deploy a producción es automático sin aprobación explícita.

## 4. Variables de entorno

Gestionadas vía AWS Secrets Manager en `staging`/`production`, y `.env`
(no versionado) en desarrollo local. Variables mínimas por servicio:

**`apps/api`**
```
DATABASE_URL=
REDIS_URL=
COGNITO_USER_POOL_ID=
COGNITO_CLIENT_ID=
AWS_REGION=
S3_BUCKET_DOCUMENTS=
S3_BUCKET_EVIDENCE=
SES_FROM_ADDRESS=
JWT_ISSUER=
```

**`apps/web` / `apps/mobile-pwa`**
```
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_COGNITO_CLIENT_ID=
NEXT_PUBLIC_COGNITO_REGION=
```

Nunca se versiona un archivo `.env` con valores reales; se versiona
`.env.example` con las claves sin valores.

## 5. Dominio y HTTPS

- Dominio gestionado en Route 53.
- Certificados TLS vía AWS Certificate Manager, terminación en
  CloudFront/ALB.
- HSTS habilitado, redirección forzada HTTP → HTTPS.

## 6. Rollback

- Imágenes Docker versionadas por tag de commit en ECR; rollback = apuntar
  el servicio ECS al tag anterior.
- Migraciones de base de datos siempre expansivas primero (agregar antes
  de quitar), para que un rollback de aplicación no deje el schema
  incompatible con la versión anterior del código.
