terraform {
  required_version = ">= 1.7.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.60"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # Backend local por defecto (adecuado para probar `terraform plan`
  # localmente). Para trabajo en equipo, migrar a un backend remoto S3 +
  # bloqueo con DynamoDB — ver docs/DEPLOYMENT.md §7. No se declara aquí
  # con un bucket fijo porque ese bucket debe existir *antes* de este
  # `terraform init` (problema de arranque conocido); se documenta como
  # un paso de bootstrap separado.
  # backend "s3" {}
}
