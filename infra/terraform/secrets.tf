# Credenciales generadas por Terraform (nunca en código ni en tfvars) y
# almacenadas en Secrets Manager — ver docs/SECURITY.md §4.

resource "random_password" "db" {
  length  = 32
  special = false # evita caracteres que compliquen la cadena de conexión
}

resource "aws_secretsmanager_secret" "db_credentials" {
  name = "${local.name}/db-credentials"
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = var.db_username
    password = random_password.db.result
    engine   = "postgres"
    host     = aws_db_instance.main.address
    port     = 5432
    dbname   = var.db_name
  })
}

# Cadena de conexión completa lista para DATABASE_URL de Prisma.
resource "aws_secretsmanager_secret" "database_url" {
  name = "${local.name}/database-url"
}

resource "aws_secretsmanager_secret_version" "database_url" {
  secret_id     = aws_secretsmanager_secret.database_url.id
  secret_string = "postgresql://${var.db_username}:${random_password.db.result}@${aws_db_instance.main.address}:5432/${var.db_name}?schema=public"
}

resource "random_password" "dev_jwt_secret" {
  length  = 48
  special = false
}

# Secreto de JWT para AUTH_MODE=dev. En AUTH_MODE=cognito (producción)
# no se usa — la verificación se hace contra el JWKS público del User
# Pool (ver apps/api/src/auth/strategies/jwt.strategy.ts).
resource "aws_secretsmanager_secret" "dev_jwt_secret" {
  name = "${local.name}/dev-jwt-secret"
}

resource "aws_secretsmanager_secret_version" "dev_jwt_secret" {
  secret_id     = aws_secretsmanager_secret.dev_jwt_secret.id
  secret_string = random_password.dev_jwt_secret.result
}
