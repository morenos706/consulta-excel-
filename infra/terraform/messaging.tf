# --- Alertas operativas (CloudWatch Alarms -> equipo de operaciones) ---

resource "aws_sns_topic" "alerts" {
  name = "${local.name}-alerts"
}

resource "aws_sns_topic_subscription" "ops_email" {
  count     = var.ops_alert_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.ops_alert_email
}

# --- Notificaciones de negocio (vencimientos, acciones vencidas, etc.) ---
# Consumida por un worker asíncrono (Fase 4 backend) para no bloquear la
# respuesta HTTP al generar notificaciones masivas — ver
# docs/ARCHITECTURE.md §2 (arquitectura general).

resource "aws_sqs_queue" "notifications_dlq" {
  name = "${local.name}-notifications-dlq"
}

resource "aws_sqs_queue" "notifications" {
  name                       = "${local.name}-notifications"
  visibility_timeout_seconds = 60
  message_retention_seconds  = 1209600 # 14 días

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.notifications_dlq.arn
    maxReceiveCount     = 5
  })
}

# --- Bus de eventos de dominio (inspección cerrada, certificado vencido, --
# accidente registrado, etc.) para desacoplar side-effects (reportes, IA)
# del flujo transaccional principal.
resource "aws_cloudwatch_event_bus" "domain_events" {
  name = "${local.name}-domain-events"
}
