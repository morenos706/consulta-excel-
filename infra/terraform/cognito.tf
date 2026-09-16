# User Pool de Amazon Cognito — reemplaza AUTH_MODE=dev en producción
# (ver apps/api/src/auth/strategies/jwt.strategy.ts y docs/ARCHITECTURE.md §3).

resource "aws_cognito_user_pool" "main" {
  name = "${local.name}-users"

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length    = 12
    require_lowercase = true
    require_uppercase = true
    require_numbers   = true
    require_symbols   = true
  }

  # MFA obligatorio para roles administrativos — ver docs/SECURITY.md §2.
  # Se configura como "OPTIONAL" a nivel de pool porque Cognito no permite
  # exigir MFA solo a ciertos roles; el backend refuerza la exigencia real
  # por rol (SUPER_ADMIN, COMPANY_ADMIN, SST_RESPONSIBLE) al validar el
  # token, rechazando sesiones sin `amr: ["mfa"]` para esos roles.
  mfa_configuration = "OPTIONAL"

  software_token_mfa_configuration {
    enabled = true
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  admin_create_user_config {
    allow_admin_create_user_only = true # el alta de usuarios la hace la plataforma (onboarding de empresa), no auto-registro
  }

  schema {
    name                = "tenant_id"
    attribute_data_type = "String"
    mutable             = false
    required            = false
    string_attribute_constraints {
      min_length = 1
      max_length = 64
    }
  }

  tags = { Name = "${local.name}-user-pool" }
}

resource "aws_cognito_user_pool_client" "web" {
  name         = "${local.name}-web-client"
  user_pool_id = aws_cognito_user_pool.main.id

  generate_secret               = false # SPA/PWA: flujo público con PKCE, sin secreto de cliente
  explicit_auth_flows           = ["ALLOW_USER_SRP_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"]
  prevent_user_existence_errors = "ENABLED"
  access_token_validity         = 1
  id_token_validity             = 1
  refresh_token_validity        = 30

  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }
}

resource "aws_cognito_user_pool_domain" "main" {
  domain       = "${local.name}-auth"
  user_pool_id = aws_cognito_user_pool.main.id
}
