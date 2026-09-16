resource "aws_ecr_repository" "api" {
  name                 = "${local.name}-api"
  image_tag_mutability = "IMMUTABLE" # cada build tiene su propio tag (sha o versión) — ver docs/DEPLOYMENT.md

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_lifecycle_policy" "api" {
  repository = aws_ecr_repository.api.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Conservar solo las ultimas 20 imagenes"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 20
      }
      action = { type = "expire" }
    }]
  })
}
