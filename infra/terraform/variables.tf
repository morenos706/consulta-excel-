variable "project_name" {
  description = "Prefijo usado para nombrar todos los recursos."
  type        = string
  default     = "seguridad360"
}

variable "environment" {
  description = "Ambiente de despliegue."
  type        = string
  default     = "staging"

  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "environment debe ser \"staging\" o \"production\"."
  }
}

variable "aws_region" {
  description = "Región AWS donde se despliega la infraestructura principal."
  type        = string
  default     = "us-east-1"
}

# --- Red -------------------------------------------------------------

variable "vpc_cidr" {
  description = "Bloque CIDR de la VPC."
  type        = string
  default     = "10.20.0.0/16"
}

variable "availability_zones_count" {
  description = "Número de zonas de disponibilidad a usar (mínimo 2 por Multi-AZ)."
  type        = number
  default     = 2
}

variable "single_nat_gateway" {
  description = "true = un solo NAT Gateway compartido (más barato, un solo punto de fallo). false = un NAT Gateway por AZ (recomendado en producción)."
  type        = bool
  default     = true
}

# --- Base de datos -----------------------------------------------------

variable "db_name" {
  description = "Nombre de la base de datos PostgreSQL."
  type        = string
  default     = "seguridad360"
}

variable "db_username" {
  description = "Usuario administrador de RDS (las credenciales de la app se gestionan aparte, ver docs/SECURITY.md)."
  type        = string
  default     = "seguridad360_admin"
}

variable "db_instance_class" {
  description = "Clase de instancia de RDS."
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated_storage" {
  description = "Almacenamiento inicial de RDS en GB."
  type        = number
  default     = 20
}

variable "db_multi_az" {
  description = "Habilitar Multi-AZ en RDS (recomendado en producción, aumenta el costo)."
  type        = bool
  default     = false
}

variable "db_backup_retention_days" {
  description = "Días de retención de backups automáticos de RDS."
  type        = number
  default     = 7
}

# --- ECS / API ---------------------------------------------------------

variable "container_port" {
  description = "Puerto en el que escucha el contenedor de la API."
  type        = number
  default     = 3001
}

variable "api_image_tag" {
  description = "Tag de la imagen de la API en ECR a desplegar (el pipeline de CI/CD la actualiza en cada release, ver docs/DEPLOYMENT.md)."
  type        = string
  default     = "latest"
}

variable "ecs_task_cpu" {
  description = "CPU de la tarea Fargate (unidades de CPU de AWS: 256 = 0.25 vCPU)."
  type        = string
  default     = "512"
}

variable "ecs_task_memory" {
  description = "Memoria de la tarea Fargate en MB."
  type        = string
  default     = "1024"
}

variable "ecs_desired_count" {
  description = "Número inicial de tareas del servicio ECS."
  type        = number
  default     = 1
}

variable "ecs_min_count" {
  description = "Mínimo de tareas para autoscaling."
  type        = number
  default     = 1
}

variable "ecs_max_count" {
  description = "Máximo de tareas para autoscaling."
  type        = number
  default     = 4
}

# --- Dominio / TLS -------------------------------------------------------

variable "domain_name" {
  description = "Dominio propio (p. ej. app.seguridad360.co). Vacío = usar los dominios por defecto de CloudFront/ALB sin certificado propio."
  type        = string
  default     = ""
}

variable "hosted_zone_id" {
  description = "ID de la Hosted Zone de Route 53 ya existente para domain_name. Requerido solo si domain_name no está vacío."
  type        = string
  default     = ""
}

# --- Notificaciones / alertas operativas ---------------------------------

variable "ops_alert_email" {
  description = "Correo que recibe alertas operativas (CloudWatch Alarms) vía SNS. Vacío = no se crea suscripción."
  type        = string
  default     = ""
}

variable "ses_from_address" {
  description = "Dirección de correo verificada en SES para el envío de notificaciones transaccionales."
  type        = string
  default     = ""
}
