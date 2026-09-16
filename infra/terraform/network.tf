locals {
  name = "${var.project_name}-${var.environment}"
  azs  = slice(data.aws_availability_zones.available.names, 0, var.availability_zones_count)

  # /20 por subred: suficiente para el tamaño esperado de ECS/RDS en el
  # MVP y dentro del CIDR /16 de la VPC (ver var.vpc_cidr).
  public_subnet_cidrs  = [for i in range(var.availability_zones_count) : cidrsubnet(var.vpc_cidr, 4, i)]
  private_subnet_cidrs = [for i in range(var.availability_zones_count) : cidrsubnet(var.vpc_cidr, 4, i + 8)]
}

data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = "${local.name}-vpc" }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "${local.name}-igw" }
}

# --- Subredes públicas (ALB, NAT Gateway) -------------------------------

resource "aws_subnet" "public" {
  count                   = var.availability_zones_count
  vpc_id                  = aws_vpc.main.id
  cidr_block              = local.public_subnet_cidrs[count.index]
  availability_zone       = local.azs[count.index]
  map_public_ip_on_launch = true

  tags = { Name = "${local.name}-public-${local.azs[count.index]}" }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "${local.name}-public-rt" }
}

resource "aws_route" "public_internet_access" {
  route_table_id         = aws_route_table.public.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.main.id
}

resource "aws_route_table_association" "public" {
  count          = var.availability_zones_count
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# --- Subredes privadas (ECS tasks, RDS) ---------------------------------

resource "aws_subnet" "private" {
  count             = var.availability_zones_count
  vpc_id            = aws_vpc.main.id
  cidr_block        = local.private_subnet_cidrs[count.index]
  availability_zone = local.azs[count.index]

  tags = { Name = "${local.name}-private-${local.azs[count.index]}" }
}

# NAT Gateway: uno solo (barato, punto único de fallo) o uno por AZ
# (recomendado en producción) según var.single_nat_gateway.
resource "aws_eip" "nat" {
  count  = var.single_nat_gateway ? 1 : var.availability_zones_count
  domain = "vpc"
  tags   = { Name = "${local.name}-nat-eip-${count.index}" }
}

resource "aws_nat_gateway" "main" {
  count         = var.single_nat_gateway ? 1 : var.availability_zones_count
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id
  tags          = { Name = "${local.name}-nat-${count.index}" }

  depends_on = [aws_internet_gateway.main]
}

resource "aws_route_table" "private" {
  count  = var.availability_zones_count
  vpc_id = aws_vpc.main.id
  tags   = { Name = "${local.name}-private-rt-${count.index}" }
}

resource "aws_route" "private_nat_access" {
  count                  = var.availability_zones_count
  route_table_id         = aws_route_table.private[count.index].id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = var.single_nat_gateway ? aws_nat_gateway.main[0].id : aws_nat_gateway.main[count.index].id
}

resource "aws_route_table_association" "private" {
  count          = var.availability_zones_count
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}
