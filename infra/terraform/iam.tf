data "aws_iam_policy_document" "ecs_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

# --- Rol de ejecución: lo usa el agente de ECS para arrancar la tarea ---
# (pull de imagen desde ECR, escritura de logs, lectura de secretos para
# inyectarlos como variables de entorno).
resource "aws_iam_role" "ecs_execution" {
  name               = "${local.name}-ecs-execution-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume_role.json
}

resource "aws_iam_role_policy_attachment" "ecs_execution_managed" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

data "aws_iam_policy_document" "ecs_execution_secrets" {
  statement {
    sid     = "ReadAppSecrets"
    actions = ["secretsmanager:GetSecretValue"]
    resources = [
      aws_secretsmanager_secret.database_url.arn,
      aws_secretsmanager_secret.db_credentials.arn,
      aws_secretsmanager_secret.dev_jwt_secret.arn,
    ]
  }
}

resource "aws_iam_role_policy" "ecs_execution_secrets" {
  name   = "${local.name}-ecs-execution-secrets"
  role   = aws_iam_role.ecs_execution.id
  policy = data.aws_iam_policy_document.ecs_execution_secrets.json
}

# --- Rol de tarea: lo asume el CÓDIGO de la aplicación en tiempo de ---
# ejecución (SDK de AWS dentro de NestJS) — acceso mínimo y explícito a
# S3, SES y SNS/SQS, nunca permisos amplios tipo "*".
resource "aws_iam_role" "ecs_task" {
  name               = "${local.name}-ecs-task-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume_role.json
}

locals {
  # SES sí soporta scoping por ARN de identidad
  # (arn:aws:ses:<region>:<account>:identity/<dominio-o-correo>). Se
  # acota a las identidades configuradas; solo si aún no se configuró
  # ninguna (var.ses_from_address y var.domain_name vacíos) se permite
  # "*" para no bloquear el primer despliegue — en cuanto se define una
  # identidad, el permiso queda acotado a ella.
  ses_identity_arns = compact([
    var.ses_from_address != "" ? "arn:aws:ses:${var.aws_region}:${data.aws_caller_identity.current.account_id}:identity/${var.ses_from_address}" : "",
    var.domain_name != "" ? "arn:aws:ses:${var.aws_region}:${data.aws_caller_identity.current.account_id}:identity/${var.domain_name}" : "",
  ])
}

data "aws_iam_policy_document" "ecs_task_permissions" {
  statement {
    sid     = "DocumentsAndEvidenceBuckets"
    actions = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
    resources = [
      "${aws_s3_bucket.documents.arn}/*",
      "${aws_s3_bucket.evidence.arn}/*",
    ]
  }

  statement {
    sid       = "ListOwnBuckets"
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.documents.arn, aws_s3_bucket.evidence.arn]
  }

  statement {
    sid       = "SendTransactionalEmail"
    actions   = ["ses:SendEmail", "ses:SendRawEmail"]
    resources = length(local.ses_identity_arns) > 0 ? local.ses_identity_arns : ["*"]
  }

  statement {
    sid       = "PublishAndConsumeQueues"
    actions   = ["sns:Publish", "sqs:SendMessage", "sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes"]
    resources = [aws_sns_topic.alerts.arn, aws_sqs_queue.notifications.arn]
  }

  statement {
    sid       = "CognitoAdminForOnboarding"
    actions   = ["cognito-idp:AdminCreateUser", "cognito-idp:AdminSetUserPassword", "cognito-idp:AdminUpdateUserAttributes", "cognito-idp:AdminDisableUser"]
    resources = [aws_cognito_user_pool.main.arn]
  }
}

resource "aws_iam_role_policy" "ecs_task_permissions" {
  name   = "${local.name}-ecs-task-permissions"
  role   = aws_iam_role.ecs_task.id
  policy = data.aws_iam_policy_document.ecs_task_permissions.json
}
