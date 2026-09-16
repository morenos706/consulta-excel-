# Identidad de correo para notificaciones transaccionales (vencimientos,
# alertas, credenciales). Requiere verificación manual (o vía DNS si
# domain_name está configurado) antes de poder enviar correo real — SES
# empieza en modo sandbox por cuenta nueva de AWS.

resource "aws_ses_email_identity" "sender" {
  count = var.ses_from_address != "" ? 1 : 0
  email = var.ses_from_address
}

resource "aws_ses_domain_identity" "main" {
  count  = var.domain_name != "" ? 1 : 0
  domain = var.domain_name
}

resource "aws_route53_record" "ses_verification" {
  count   = var.domain_name != "" && var.hosted_zone_id != "" ? 1 : 0
  zone_id = var.hosted_zone_id
  name    = "_amazonses.${var.domain_name}"
  type    = "TXT"
  ttl     = 600
  records = [aws_ses_domain_identity.main[0].verification_token]
}
