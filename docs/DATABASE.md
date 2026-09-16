# Base de datos — Seguridad 360 Colombia

Motor: **PostgreSQL** (Amazon RDS, Multi-AZ). ORM: **Prisma**.
Aislamiento multi-tenant reforzado con **Row-Level Security (RLS)** sobre
`tenant_id` en todas las tablas de negocio, además del filtro aplicado por
la capa de aplicación (defensa en profundidad: la app nunca debería poder
"olvidar" el filtro y aun así estaría contenida por RLS).

## 1. Convenciones

- Toda tabla de negocio: `id (uuid)`, `tenant_id (uuid, FK, indexado)`,
  `created_at`, `updated_at`, `created_by`, `updated_by`, `deleted_at`
  (soft delete donde aplique retención legal de evidencias).
- Enumeraciones (`FindingStatus`, `RiskLevel`, etc.) como `enum` de
  Postgres, no strings libres.
- Toda tabla referenciada por evidencias fotográficas/documentales guarda
  la referencia como `s3_key`, nunca el archivo en la base de datos.
- Índices obligatorios: `tenant_id`, claves foráneas, y columnas usadas en
  filtros de dashboard (`status`, `due_date`, `site_id`).

## 2. Entidades principales (resumen)

| Entidad | Relaciones clave | Notas |
|---|---|---|
| `Tenant` | 1—N `User`, `Site`, `Employee`, ... | Raíz del aislamiento multi-tenant |
| `User` | N—1 `Role`, N—1 `Tenant` | Autenticación delegada a Cognito; esta tabla guarda perfil + rol |
| `Role` / `Permission` | N—N | Roles predefinidos + personalizados por tenant |
| `Site` (sede) | 1—N `Area`, `Employee`, `EmergencyEquipment` | Multisede |
| `Area` / `Process` | N—1 `Site` | Jerarquía organizacional |
| `Employee` (trabajador) | 1—N `PPEAssignment`, `TrainingRecord`; 0—1 `Brigadist` | Hoja de vida digital, minimización de datos médicos |
| `Contractor` | 1—N `ContractorDocument` | Portal de contratistas, estado APTO/PENDIENTE/NO_APTO |
| `Brigadist` | 1—N `Certificate`, `TrainingRecord`, `Competency` | Semáforo de competencia calculado, no almacenado como texto fijo |
| `Training` / `TrainingRecord` / `Certificate` | N—1 `Employee`/`Brigadist` | LMS básico: curso, evaluación, vencimiento |
| `InspectionTemplate` | 1—N `InspectionField` | Constructor de formularios dinámicos |
| `Inspection` | N—1 `InspectionTemplate`, `Site`; 1—N `Finding` | Fotos/ubicación/fecha |
| `Finding` (hallazgo) | 1—N `CorrectiveAction` | Entidad independiente, estado propio |
| `CorrectiveAction` | N—1 `Employee` (responsable) | Alimenta indicadores |
| `Hazard` / `RiskAssessment` (matriz de peligros, GTC 45 como referencia) | N—1 `Process` | Mapa de calor derivado |
| `Accident` / `Incident` | 1—1 `Investigation` | Investigación con causas inmediatas/básicas, 5 porqués |
| `PPE` / `PPEAssignment` | N—1 `Employee` | Historial + alertas de reposición |
| `EmergencyEquipment` | N—1 `Site`; 1—N `Maintenance` | QR único, mantenimiento preventivo/correctivo |
| `EmergencyPlan` / `EmergencyScenario` | 1—N `Drill` | Amenazas, vulnerabilidad, recursos |
| `Drill` (simulacro) | N—1 `EmergencyScenario` | Tiempos, participantes, evaluación |
| `Emergency` | N—1 `Site` | Estado (NORMAL/PREALERTA/ALERTA/EMERGENCIA), alimenta Centro de Comando |
| `WorkPermit` | N—1 `Employee`/`Contractor` | Verificación de requisitos antes de aprobar |
| `Audit` / `AuditFinding` | 1—N | No conformidades, plan de acción |
| `COPASSTMember` / `COPASSTMeeting` | N—N | Actas, compromisos |
| `Document` / `DocumentVersion` | 1—N | Versionamiento, vencimiento, firma |
| `DigitalSignature` | N—1 `Document`/`User` | Usuario, fecha, hora, IP, hash |
| `Notification` | N—1 `User` | Email/push/in-app |
| `Report` | — | Metadatos de reportes generados (PDF/Excel) |
| `AuditLog` | N—1 `User` | Acción, entidad afectada, valor anterior/nuevo, IP |
| `WorkflowState` / `WorkflowTransition` | Genérico, referenciado por `entity_type` + `entity_id` | Motor de estados reutilizable |

## 3. Diagrama entidad-relación (extendido)

Ver el diagrama resumido en `ARCHITECTURE.md` §5. El schema completo de
Prisma (`apps/api/prisma/schema.prisma`) se entrega en la Fase 3
(Base de datos) junto con las migraciones y el seed de la empresa demo
("Empresa Demo Colombia") descrito en la sección 62 del alcance
funcional.

## 4. Estrategia de migraciones

- Migraciones versionadas con Prisma Migrate, revisadas en PR.
- Ninguna migración destructiva (`DROP COLUMN`, `DROP TABLE`) se aplica en
  producción sin un paso previo de "deprecar y verificar" en un release
  anterior.
- Seeds separados por ambiente: `seed.dev.ts` (empresa demo completa) y
  `seed.prod.ts` (solo catálogos: roles base, tipos de inspección,
  permisos).

## 5. Backups y recuperación

- RDS: snapshots automáticos diarios + retención configurable,
  point-in-time recovery habilitado.
- S3: versionamiento de objetos habilitado en buckets de evidencias y
  documentos; políticas de ciclo de vida para mover a Glacier documentos
  antiguos según política de retención del tenant.
- Pruebas de restauración periódicas documentadas (no solo backups
  "que existen", sino backups "que se ha probado que restauran").
