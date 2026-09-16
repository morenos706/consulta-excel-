output "api_url" {
  description = "URL pública de la API (dominio propio si se configuró, si no el de CloudFront)."
  value       = local.use_custom_domain ? "https://${var.domain_name}" : "https://${aws_cloudfront_distribution.main.domain_name}"
}

output "ecr_repository_url" {
  description = "Repositorio ECR donde el pipeline de CI/CD publica la imagen de la API."
  value       = aws_ecr_repository.api.repository_url
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  value = aws_ecs_service.api.name
}

output "rds_endpoint" {
  description = "Endpoint de RDS (solo alcanzable desde dentro de la VPC)."
  value       = aws_db_instance.main.address
  sensitive   = true
}

output "cognito_user_pool_id" {
  value = aws_cognito_user_pool.main.id
}

output "cognito_client_id" {
  value = aws_cognito_user_pool_client.web.id
}

output "s3_documents_bucket" {
  value = aws_s3_bucket.documents.bucket
}

output "s3_evidence_bucket" {
  value = aws_s3_bucket.evidence.bucket
}

output "database_url_secret_arn" {
  description = "ARN del secreto con la cadena de conexión completa (DATABASE_URL) — usarlo para correr migraciones desde CI/CD, nunca imprimir su valor en logs."
  value       = aws_secretsmanager_secret.database_url.arn
}
