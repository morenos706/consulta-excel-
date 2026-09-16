# infra/terraform

Infraestructura como código para AWS: VPC, ECS Fargate (API + workers),
RDS PostgreSQL Multi-AZ, S3 (documentos/evidencias), CloudFront + WAF,
Route 53, Cognito, Secrets Manager, CloudWatch, CloudTrail, SES, SNS,
SQS/EventBridge.

Ver `docs/ARCHITECTURE.md` §7 (servicios AWS y justificación) y
`docs/DEPLOYMENT.md` (runbook de despliegue, costo estimado y qué se
validó de este código).

**Estado**: Fase 8 escrita — código completo, formateado
(`terraform fmt`) y revisado manualmente línea por línea. **No
ejecutado contra AWS todavía**: ni `terraform init/validate/plan` (la
política de red de la sesión donde se escribió bloquea
`registry.terraform.io`) ni `terraform apply` (crear esta
infraestructura tiene costo real y debe ejecutarlo un humano con sus
propias credenciales de AWS, revisando el plan antes de confirmarlo).

```bash
cp terraform.tfvars.example terraform.tfvars   # ajustar valores
terraform init
terraform plan -out=tfplan   # revisar antes de aplicar
terraform apply tfplan
```
