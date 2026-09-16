# TLS entre CloudFront y el ALB (no solo entre el navegador y CloudFront).
#
# Sin dominio propio no es posible emitir un certificado ACM válido para
# el DNS name del ALB (ACM exige validar propiedad de un dominio), así
# que en ese caso el origen queda en HTTP dentro de la red privada de
# AWS (nunca en internet público: el ALB solo acepta tráfico desde el
# prefix list de CloudFront, ver security-groups.tf). En cuanto hay un
# dominio propio configurado, se exige TLS extremo a extremo —
# ver docs/SECURITY.md §4 y docs/DEPLOYMENT.md §5.

resource "aws_acm_certificate" "alb" {
  count             = local.use_custom_domain ? 1 : 0
  domain_name       = var.domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "alb_cert_validation" {
  for_each = local.use_custom_domain ? {
    for dvo in aws_acm_certificate.alb[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      type   = dvo.resource_record_type
      record = dvo.resource_record_value
    }
  } : {}

  zone_id         = var.hosted_zone_id
  name            = each.value.name
  type            = each.value.type
  records         = [each.value.record]
  ttl             = 300
  allow_overwrite = true
}

resource "aws_acm_certificate_validation" "alb" {
  count                   = local.use_custom_domain ? 1 : 0
  certificate_arn         = aws_acm_certificate.alb[0].arn
  validation_record_fqdns = [for r in aws_route53_record.alb_cert_validation : r.fqdn]
}

resource "aws_lb_listener" "https" {
  count             = local.use_custom_domain ? 1 : 0
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate_validation.alb[0].certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }
}
