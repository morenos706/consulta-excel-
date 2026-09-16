# Deployment — Seguridad 360 Colombia

> Estado: Fase 1 (plan) y Fase 8 (infraestructura AWS vía Terraform)
> escritas y revisadas. **No se ha ejecutado ningún `terraform apply`
> real** — crear esta infraestructura en una cuenta de AWS tiene costo y
> es una acción difícil de revertir, así que requiere que un humano con
> sus propias credenciales de AWS la ejecute y confirme, no que un agente
> la dispare de forma autónoma.

## 1. Ambientes

| Ambiente | Propósito | Infraestructura |
|---|---|---|
| `dev` | Desarrollo local | Docker Compose / Postgres local (ver `infra/docker/docker-compose.yml`) |
| `staging` | Validación pre-producción | AWS, un NAT Gateway, RDS sin Multi-AZ |
| `production` | Producción | AWS, NAT por AZ, RDS Multi-AZ, dominio propio con TLS extremo a extremo |

## 2. Docker (desarrollo local y build de producción)

- `infra/docker/docker-compose.yml`: Postgres local para desarrollar sin
  depender de AWS (ver `docs/DATABASE.md`).
- `apps/api/Dockerfile`: build multi-stage de la API (compila TypeScript,
  genera el cliente de Prisma, y la imagen final corre como usuario no
  root sin devDependencies). Es la imagen que se publica en ECR y
  despliega en ECS Fargate.

  ```bash
  cd apps/api
  docker build -t seguridad360-api:local .
  docker run --rm -p 3001:3001 --env-file .env seguridad360-api:local
  ```

  **No se pudo compilar esta imagen en el entorno donde se escribió**
  (el sandbox de esta sesión no tiene permisos para correr el daemon de
  Docker). El Dockerfile sigue el patrón estándar de Node multi-stage y
  fue revisado manualmente, pero debe construirse y probarse en un
  entorno con Docker real (CI o la máquina del desarrollador) antes de
  confiar en él para producción.

## 3. Infraestructura AWS (Terraform) — Fase 8

Todo el código vive en `infra/terraform/`. Resumen de lo que crea (ver
`docs/ARCHITECTURE.md` §7 para el porqué de cada servicio):

VPC con subredes públicas/privadas · NAT Gateway(s) · ALB · ECS Fargate
(cluster + servicio + autoscaling por CPU) · ECR · RDS PostgreSQL
(Multi-AZ opcional) · Cognito (User Pool + client) · S3 (documentos y
evidencias, privados, cifrados, con política que rechaza tráfico sin
TLS) · CloudFront + WAF (reglas OWASP administradas + rate limiting) ·
Secrets Manager (credenciales de DB y JWT generadas por Terraform, nunca
en código) · SNS/SQS/EventBridge (alertas y notificaciones asíncronas) ·
SES · CloudTrail · alarmas básicas de CloudWatch.

### 3.1 Qué se validó y qué no en esta sesión

- `terraform fmt` — aplicado, sin diferencias pendientes.
- Revisión manual línea por línea de los ~20 archivos `.tf` (se
  encontraron y corrigieron 3 problemas reales: sintaxis de bloques
  `override_action`/`action` en `waf.tf`, un permiso de SES sobre-amplio
  en `iam.tf`, y una contradicción entre `docs/SECURITY.md` — que
  prometía TLS "sin excepciones" — y el origen HTTP simple entre
  CloudFront y el ALB, resuelta agregando un listener HTTPS real en el
  ALB cuando hay dominio propio, ver `infra/terraform/alb-tls.tf`).
- **`terraform init`/`validate`/`plan` NO se pudieron ejecutar**: la
  política de red de este entorno bloquea `registry.terraform.io`
  (verificado con el endpoint de estado del proxy — 403 de política, no
  un error transitorio). Antes de aplicar esto en una cuenta real, correr
  `terraform init && terraform validate && terraform plan` desde un
  entorno con acceso al registro de Terraform (tu máquina, o un runner de
  CI) y revisar el plan con calma.

### 3.2 Runbook de despliegue (a ejecutar por un humano, no en automático)

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars   # ajustar valores
terraform init
terraform plan -out=tfplan     # REVISAR el plan completo antes de aplicar
terraform apply tfplan
```

Después de aplicar:

```bash
# 1. Publicar la imagen de la API en el ECR creado
aws ecr get-login-password --region <region> | docker login --username AWS --password-stdin <ecr_repository_url>
docker build -t <ecr_repository_url>:$(git rev-parse --short HEAD) apps/api
docker push <ecr_repository_url>:$(git rev-parse --short HEAD)

# 2. Correr las migraciones contra la base real (usar el secreto
#    database_url_secret_arn de la salida de Terraform, nunca imprimir su
#    valor en un log compartido)
DATABASE_URL="$(aws secretsmanager get-secret-value --secret-id <database_url_secret_arn> --query SecretString --output text)" \
  npx prisma migrate deploy --schema apps/api/prisma/schema.prisma

# 3. Actualizar la tarea de ECS con el nuevo tag de imagen
#    (terraform apply -var="api_image_tag=<tag>" o vía pipeline de CI/CD, Fase 10)
```

Este flujo manual es intencionalmente el que automatiza el pipeline de
CI/CD de la Fase 10 — se documenta explícito aquí porque esa fase aún no
se ha construido.

### 3.3 Costo

Con los valores por defecto de `terraform.tfvars.example` (staging, un
NAT Gateway, `db.t4g.micro` sin Multi-AZ, 1 tarea Fargate), el costo
mensual aproximado ronda los USD 60-90 (NAT Gateway y RDS son los
mayores componentes fijos; ECS Fargate y CloudFront escalan con tráfico
real). Producción con Multi-AZ y NAT por AZ al menos duplica esa base.
Revisar la Calculadora de AWS con los valores reales antes de aplicar.

## 4. CI/CD (GitHub Actions) — Fase 10, pendiente

Plan (no implementado todavía): lint + type-check + tests en cada PR;
en `main`, build de la imagen Docker, push a ECR, `prisma migrate
deploy`, y actualización del servicio ECS — con aprobación manual antes
de tocar producción.

## 5. Variables de entorno

Gestionadas vía AWS Secrets Manager en `staging`/`production` (ver
`infra/terraform/secrets.tf`), y `.env` (no versionado) en desarrollo
local (`apps/api/.env.example`).

**`apps/api`** (variables reales usadas por el código, ver
`apps/api/src/main.ts` y `apps/api/src/auth/strategies/jwt.strategy.ts`):
```
DATABASE_URL=
AUTH_MODE=dev|cognito
DEV_JWT_SECRET=            # solo si AUTH_MODE=dev
DEV_LOGIN_SECRET=          # solo si AUTH_MODE=dev
COGNITO_USER_POOL_ID=      # solo si AUTH_MODE=cognito
COGNITO_CLIENT_ID=         # solo si AUTH_MODE=cognito
AWS_REGION=
S3_BUCKET_DOCUMENTS=
S3_BUCKET_EVIDENCE=
SES_FROM_ADDRESS=
CORS_ORIGINS=              # lista separada por comas, nunca "*" en producción
PORT=
```

Nunca se versiona un archivo `.env` con valores reales; se versiona
`.env.example` con las claves sin valores.

## 6. Dominio y HTTPS

- Dominio gestionado en Route 53 (opcional: sin `domain_name` configurado,
  la plataforma queda accesible por el dominio `*.cloudfront.net`).
- Certificados TLS vía AWS Certificate Manager: uno en `us-east-1` para
  CloudFront, y uno regional para el ALB cuando hay dominio propio (ver
  `infra/terraform/alb-tls.tf` y `docs/SECURITY.md` §4).
- HSTS y redirección forzada HTTP → HTTPS a nivel de CloudFront.

## 7. Backend remoto de Terraform (para trabajo en equipo)

`infra/terraform/versions.tf` usa backend local por defecto. Para que un
equipo comparta el mismo estado sin pisárselo:

1. Crear una vez, fuera de este mismo `terraform apply` (problema de
   arranque conocido): un bucket S3 con versionamiento + una tabla
   DynamoDB para bloqueo.
2. Descomentar `backend "s3" {}` en `versions.tf` y correr
   `terraform init -backend-config="bucket=..." -backend-config="key=..." -backend-config="region=..." -backend-config="dynamodb_table=..."`.
3. Confirmar la migración del estado cuando Terraform lo pregunte.

## 8. Rollback

- Imágenes Docker versionadas por tag de commit en ECR; rollback = apuntar
  el servicio ECS al tag anterior (`terraform apply -var="api_image_tag=<tag-anterior>"`).
- Migraciones de base de datos siempre expansivas primero (agregar antes
  de quitar), para que un rollback de aplicación no deje el schema
  incompatible con la versión anterior del código.
