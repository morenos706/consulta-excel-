# Seguridad — Seguridad 360 Colombia

## 1. Principios

- **Minimización de datos**: no se almacena información médica más allá
  de lo estrictamente necesario para SG-SST (ver §7 del prompt funcional).
  Campos como "restricciones laborales" tienen acceso restringido por rol
  (`MEDICAL_PROFESSIONAL`, `SST_RESPONSIBLE`), no visibles por defecto.
- **Aislamiento multi-tenant real**: cada fila de negocio lleva
  `tenant_id`; se aplica tanto en la capa de aplicación (guard global)
  como en base de datos (Row-Level Security de PostgreSQL). Ninguna
  empresa puede ver datos de otra ni por error de código ni por
  manipulación de parámetros.
- **Least privilege / RBAC granular**: permisos por acción
  (`view/create/edit/delete/approve/sign/download/audit/export`) por
  módulo, nunca "todo o nada".
- **Defensa en profundidad**: WAF + validación de entrada + ORM
  parametrizado (sin SQL crudo concatenado) + RLS + auditoría.

## 2. Autenticación y sesiones

- Amazon Cognito como IdP (User Pools), con MFA obligatorio para roles
  administrativos (`SUPER_ADMIN`, `COMPANY_ADMIN`, `SST_RESPONSIBLE`) y
  opcional/recomendado para el resto.
- Tokens JWT de corta duración + refresh tokens con rotación; revocación
  inmediata al desactivar un usuario.
- Hash de contraseñas gestionado por Cognito (no se implementa hashing
  propio).
- Rate limiting por IP y por usuario en endpoints de autenticación y en
  la API general (ver `API.md`).

## 3. Protección de la aplicación (OWASP Top 10)

| Riesgo | Mitigación |
|---|---|
| Inyección SQL | ORM parametrizado (Prisma), sin queries crudas con interpolación de strings |
| XSS | Sanitización de entradas, escape por defecto en el frontend (React), CSP vía CloudFront/WAF |
| CSRF | Tokens `SameSite=Strict`/`Lax` en cookies de sesión donde aplique, verificación de origen |
| CORS | Whitelist explícita de orígenes por ambiente, nunca `*` en producción |
| Deserialización insegura | Validación de DTOs con `class-validator` en cada endpoint |
| Gestión de secretos | AWS Secrets Manager; nunca credenciales en código ni en variables de entorno versionadas |
| Control de acceso roto | Guards de autorización centralizados, tests de autorización por rol |
| Configuración insegura | Revisión de headers de seguridad, HTTPS obligatorio, HSTS |

## 4. Cifrado

- **En tránsito**: TLS 1.2+ del navegador a CloudFront siempre, sin
  excepción (`docs/ARCHITECTURE.md` §7). De CloudFront al ALB: **TLS
  extremo a extremo cuando hay un dominio propio configurado**
  (`infra/terraform/alb-tls.tf` emite un certificado ACM para el ALB y
  CloudFront le habla por HTTPS). Sin dominio propio — por ejemplo, una
  primera prueba en `*.cloudfront.net` — no existe forma de emitir un
  certificado ACM válido para el DNS genérico del ALB, así que ese tramo
  queda en HTTP dentro de la red privada de AWS: el ALB nunca es
  alcanzable desde internet (solo acepta tráfico del prefix list
  gestionado de CloudFront, `infra/terraform/security-groups.tf`), pero
  el tramo no está cifrado. Esto es aceptable únicamente para
  ambientes de prueba sin dominio; **todo ambiente de producción debe
  configurar `domain_name` + `hosted_zone_id`** para cerrar esta
  excepción. RDS usa TLS en la conexión de Prisma; los buckets S3 de
  documentos y evidencias rechazan explícitamente cualquier solicitud
  sin TLS mediante política de bucket (`infra/terraform/s3.tf`,
  `aws:SecureTransport = false` → Deny).
- **En reposo**: cifrado nativo de RDS (KMS), cifrado de buckets S3 (SSE-KMS),
  cifrado de snapshots y volúmenes EBS.
- **Documentos sensibles**: URLs firmadas de S3 con expiración corta para
  descarga de evidencias/documentos, nunca URLs públicas permanentes.

## 5. Auditoría

Toda acción crítica se registra en `AuditLog`: usuario, fecha, hora, IP,
acción, entidad afectada, valor anterior, valor nuevo. Ejemplo de
registro legible para el usuario final:

> "Sebastián modificó inspección INS-00045 el 2026-09-16 10:32 desde
> 190.x.x.x."

El audit log es de solo lectura para todos los roles salvo `SUPER_ADMIN`
(consulta), y se replica a CloudWatch/CloudTrail para retención
independiente de la base de datos transaccional.

## 6. Protección de datos personales

Alineado con la Ley 1581 de 2012 y su normativa reglamentaria vigente
(sujeto a verificación de vigencia antes de fijar reglas de negocio —
ver §7):

- Consentimiento informado registrado al vincular un trabajador/contratista.
- Derecho de acceso, corrección y eliminación soportado vía flujo
  administrativo (no un botón de auto-borrado que rompa trazabilidad de
  evidencias legales).
- Política de retención configurable por tipo de dato (p. ej. evidencias
  de accidentes con retención prolongada por requisitos legales,
  distinto de datos operativos rutinarios).
- Contactos de emergencia e información médica con acceso restringido y
  auditado explícitamente (cada lectura queda en el `AuditLog`, no solo
  las escrituras).

## 7. Cumplimiento normativo — advertencia obligatoria

La plataforma **no determina por sí misma** si una norma colombiana está
vigente ni certifica cumplimiento legal. Antes de implementar cualquier
regla de negocio basada en una norma específica (Ley 1562 de 2012,
Decreto 1072 de 2015, Resolución 0312 de 2019, GTC 45, etc.), el equipo
debe **verificar vigencia y alcance actual** con una fuente jurídica
autorizada. El sistema modela esto como una **Matriz de Cumplimiento**
configurable (`Requisito → Norma → Artículo/Numeral → Evidencia →
Responsable → Estado → Plan de acción`), de forma que actualizar una
norma sea un cambio de configuración, no un cambio de código.

El estado que la plataforma muestra siempre se etiqueta como
**"Cumplimiento documentado según criterios configurados"**, nunca como
"cumple legalmente", dejando la interpretación normativa a un
profesional autorizado (SST, jurídico).

## 8. Backups, continuidad y recuperación ante desastres

- Backups automáticos diarios de RDS con retención configurable y
  pruebas periódicas de restauración documentadas.
- Versionamiento de objetos en S3 para evidencias y documentos.
- Plan de recuperación ante desastres: RPO/RTO objetivo se define en la
  Fase 8 (AWS) junto con la topología Multi-AZ concreta.

## 9. IA — límites y transparencia

Cualquier salida de IA (clasificación de fotos, asistente SST) se
presenta como **sugerencia**, nunca como hallazgo confirmado ni como
respuesta normativa definitiva:

- Análisis de fotos: se etiqueta como *"Posible condición insegura"*,
  requiere confirmación humana antes de convertirse en un `Finding`.
- Asistente SST: toda respuesta de naturaleza normativa debe indicar la
  fuente y la fecha de consulta, y remitir a verificación profesional
  cuando la pregunta tenga implicaciones legales.
