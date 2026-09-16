locals {
  # Los nombres de bucket S3 son globales en todo AWS: se agrega el
  # account id para evitar colisiones entre clientes de Terraform.
  bucket_suffix = data.aws_caller_identity.current.account_id
}

resource "aws_s3_bucket" "documents" {
  bucket = "${local.name}-documents-${local.bucket_suffix}"
}

resource "aws_s3_bucket" "evidence" {
  bucket = "${local.name}-evidence-${local.bucket_suffix}"
}

# Documentos y evidencias comparten la misma postura de seguridad:
# privados, versionados, cifrados, sin acceso público — ver
# docs/SECURITY.md §4. Los objetos solo se sirven mediante URLs firmadas
# de corta duración generadas por la API.
resource "aws_s3_bucket_versioning" "documents" {
  bucket = aws_s3_bucket.documents.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_versioning" "evidence" {
  bucket = aws_s3_bucket.evidence.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "aws:kms" }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "evidence" {
  bucket = aws_s3_bucket.evidence.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "aws:kms" }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "documents" {
  bucket                  = aws_s3_bucket.documents.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "evidence" {
  bucket                  = aws_s3_bucket.evidence.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Ciclo de vida: mover evidencias antiguas a almacenamiento frío en vez de
# borrarlas — la retención definitiva depende de la política legal de
# cada tenant (ver docs/SECURITY.md §6), configurable después por prefijo.
resource "aws_s3_bucket_lifecycle_configuration" "evidence" {
  bucket = aws_s3_bucket.evidence.id
  rule {
    id     = "archive-old-evidence"
    status = "Enabled"
    filter {}
    transition {
      days          = 365
      storage_class = "GLACIER"
    }
  }
}

# Rechaza cualquier solicitud que no use TLS — ver docs/SECURITY.md §4.
data "aws_iam_policy_document" "deny_insecure_transport" {
  statement {
    sid       = "DenyInsecureTransport"
    effect    = "Deny"
    actions   = ["s3:*"]
    resources = [aws_s3_bucket.documents.arn, "${aws_s3_bucket.documents.arn}/*"]
    principals {
      type        = "*"
      identifiers = ["*"]
    }
    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }
}

resource "aws_s3_bucket_policy" "documents" {
  bucket = aws_s3_bucket.documents.id
  policy = data.aws_iam_policy_document.deny_insecure_transport.json
}

data "aws_iam_policy_document" "deny_insecure_transport_evidence" {
  statement {
    sid       = "DenyInsecureTransport"
    effect    = "Deny"
    actions   = ["s3:*"]
    resources = [aws_s3_bucket.evidence.arn, "${aws_s3_bucket.evidence.arn}/*"]
    principals {
      type        = "*"
      identifiers = ["*"]
    }
    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }
}

resource "aws_s3_bucket_policy" "evidence" {
  bucket = aws_s3_bucket.evidence.id
  policy = data.aws_iam_policy_document.deny_insecure_transport_evidence.json
}
