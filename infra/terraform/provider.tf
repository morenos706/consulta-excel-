provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "seguridad-360-colombia"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# CloudFront exige que los certificados ACM que usa estén en us-east-1,
# sin importar la región donde vive el resto de la infraestructura.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project     = "seguridad-360-colombia"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
