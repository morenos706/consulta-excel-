locals {
  # Certificado propio validado si hay dominio + hosted zone; si no, el
  # certificado por defecto de CloudFront (dominio *.cloudfront.net).
  use_custom_domain = var.domain_name != "" && var.hosted_zone_id != ""
}

resource "aws_cloudfront_distribution" "main" {
  enabled         = true
  is_ipv6_enabled = true
  comment         = "${local.name} — API"
  web_acl_id      = aws_wafv2_web_acl.cloudfront.arn
  aliases         = local.use_custom_domain ? [var.domain_name] : []

  origin {
    domain_name = aws_lb.main.dns_name
    origin_id   = "alb-origin"

    custom_origin_config {
      http_port  = 80
      https_port = 443
      # Con dominio propio, CloudFront habla HTTPS real con el ALB
      # (aws_lb_listener.https en alb-tls.tf) — TLS extremo a extremo.
      # Sin dominio no existe forma de emitir un certificado ACM válido
      # para el DNS del ALB, así que el origen queda en HTTP dentro de
      # la red privada de AWS (nunca expuesto a internet, ver
      # security-groups.tf) — ver docs/SECURITY.md §4.
      origin_protocol_policy = local.use_custom_domain ? "https-only" : "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    target_origin_id       = "alb-origin"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods         = ["GET", "HEAD"]

    # API dinámica: sin cache, reenviando todo lo que la API necesita
    # (headers de auth, cookies, query strings) — políticas administradas
    # por AWS en vez de configuración manual propensa a errores.
    cache_policy_id          = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad" # Managed-CachingDisabled
    origin_request_policy_id = "b689b0a8-53d0-40ab-baf2-68738e2966ac" # Managed-AllViewerExceptHostHeader
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = local.use_custom_domain ? false : true
    acm_certificate_arn            = local.use_custom_domain ? aws_acm_certificate_validation.cloudfront[0].certificate_arn : null
    ssl_support_method             = local.use_custom_domain ? "sni-only" : null
    minimum_protocol_version       = "TLSv1.2_2021"
  }

  tags = { Name = "${local.name}-cloudfront" }
}
