-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('BASICO', 'PROFESIONAL', 'EMPRESARIAL', 'CORPORATIVO');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "SystemRoleKey" AS ENUM ('SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'SST_RESPONSIBLE', 'SST_COORDINATOR', 'SUPERVISOR', 'INSPECTOR', 'BRIGADIST', 'WORKER', 'CONTRACTOR', 'AUDITOR', 'MEDICAL_PROFESSIONAL', 'READONLY');

-- CreateEnum
CREATE TYPE "PermissionAction" AS ENUM ('VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE', 'SIGN', 'DOWNLOAD', 'AUDIT', 'EXPORT');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('DIRECT', 'TEMPORARY', 'APPRENTICE', 'OUTSOURCED');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ON_LEAVE');

-- CreateEnum
CREATE TYPE "ContractorApprovalStatus" AS ENUM ('APPROVED', 'PENDING', 'REJECTED');

-- CreateEnum
CREATE TYPE "BrigadistStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "CompetencyLevel" AS ENUM ('COMPLIES', 'NEEDS_UPDATE', 'NON_COMPLIANT');

-- CreateEnum
CREATE TYPE "CourseType" AS ENUM ('INDUCTION', 'REINDUCTION', 'SST', 'BRIGADE', 'FIRST_AID', 'EVACUATION', 'FIREFIGHTING', 'PPE', 'ELECTRICAL_RISK', 'HEIGHTS', 'CONFINED_SPACES', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "TrainingResult" AS ENUM ('APPROVED', 'FAILED', 'PENDING');

-- CreateEnum
CREATE TYPE "CertificateStatus" AS ENUM ('VALID', 'EXPIRING_SOON', 'EXPIRED');

-- CreateEnum
CREATE TYPE "InspectionFieldType" AS ENUM ('TEXT', 'NUMBER', 'BOOLEAN', 'SELECT', 'PHOTO', 'SIGNATURE', 'DATE');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "FindingStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'OVERDUE', 'PENDING_VERIFICATION', 'CLOSED');

-- CreateEnum
CREATE TYPE "ActionPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "ActionStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'OVERDUE', 'PENDING_VERIFICATION', 'CLOSED');

-- CreateEnum
CREATE TYPE "EmergencyEquipmentType" AS ENUM ('EXTINGUISHER', 'AED', 'FIRST_AID_KIT', 'STRETCHER', 'RADIO', 'ALARM', 'CABINET', 'RESCUE_EQUIPMENT', 'FIRE_EQUIPMENT');

-- CreateEnum
CREATE TYPE "MaintenanceType" AS ENUM ('PREVENTIVE', 'CORRECTIVE');

-- CreateEnum
CREATE TYPE "EmergencyStatus" AS ENUM ('NORMAL', 'PRE_ALERT', 'ALERT', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "WorkPermitType" AS ENUM ('HOT_WORK', 'HEIGHTS', 'CONFINED_SPACE', 'ELECTRICAL_RISK', 'EXCAVATION', 'LIFTING', 'OTHER');

-- CreateEnum
CREATE TYPE "WorkPermitStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "AuditStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'CLOSED');

-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('SST', 'EMERGENCY_PLAN', 'BRIGADE', 'TRAINING', 'INSPECTION', 'ACCIDENT', 'CONTRACTOR', 'AUDIT', 'PROCEDURE', 'PROTOCOL');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'PUSH', 'IN_APP');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'READ');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "taxId" TEXT,
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'BASICO',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "cognitoSub" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "roleId" TEXT NOT NULL,
    "employeeId" TEXT,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "systemKey" "SystemRoleKey",
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "action" "PermissionAction" NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sites" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "areas" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "areaId" TEXT,
    "documentNumber" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3),
    "position" TEXT NOT NULL,
    "employmentType" "EmploymentType" NOT NULL,
    "hireDate" TIMESTAMP(3) NOT NULL,
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "phone" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "eps" TEXT,
    "arl" TEXT,
    "afp" TEXT,
    "workRestrictions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contractors" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "taxId" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactPhone" TEXT,
    "approvalStatus" "ContractorApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contractors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contractor_documents" (
    "id" TEXT NOT NULL,
    "contractorId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contractor_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brigadists" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "group" TEXT,
    "status" "BrigadistStatus" NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "photoS3Key" TEXT,
    "competencyLevel" "CompetencyLevel" NOT NULL DEFAULT 'NON_COMPLIANT',

    CONSTRAINT "brigadists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competencies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "competencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brigadist_competencies" (
    "id" TEXT NOT NULL,
    "brigadistId" TEXT NOT NULL,
    "competencyId" TEXT NOT NULL,
    "level" "CompetencyLevel" NOT NULL DEFAULT 'NON_COMPLIANT',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brigadist_competencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CourseType" NOT NULL,
    "durationHours" DOUBLE PRECISION NOT NULL,
    "validityMonths" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_records" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "employeeId" TEXT,
    "brigadistId" TEXT,
    "instructor" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL,
    "attended" BOOLEAN NOT NULL DEFAULT true,
    "result" "TrainingResult" NOT NULL DEFAULT 'PENDING',
    "evidenceS3Key" TEXT,

    CONSTRAINT "training_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificates" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "trainingRecordId" TEXT NOT NULL,
    "brigadistId" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "status" "CertificateStatus" NOT NULL DEFAULT 'VALID',
    "certificateS3Key" TEXT,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_templates" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspection_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_fields" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "InspectionFieldType" NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "options" JSONB,

    CONSTRAINT "inspection_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspections" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "inspectorId" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "answers" JSONB NOT NULL,
    "observations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "findings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "inspectionId" TEXT,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "hazard" TEXT,
    "riskLevel" "RiskLevel" NOT NULL,
    "photoS3Key" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "status" "FindingStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corrective_actions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "findingId" TEXT,
    "origin" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" "ActionPriority" NOT NULL DEFAULT 'MEDIUM',
    "responsibleUserId" TEXT,
    "responsibleEmployeeId" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "ActionStatus" NOT NULL DEFAULT 'OPEN',
    "closureEvidenceS3Key" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "corrective_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hazards" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "processId" TEXT,
    "activity" TEXT NOT NULL,
    "task" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "source" TEXT,
    "consequence" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hazards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_assessments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "hazardId" TEXT NOT NULL,
    "existingControls" TEXT,
    "probability" INTEGER NOT NULL,
    "severity" INTEGER NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL,
    "acceptable" BOOLEAN NOT NULL DEFAULT false,
    "intervention" TEXT,
    "responsibleUserId" TEXT,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "risk_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accidents" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "activity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "injury" TEXT,
    "bodyPart" TEXT,
    "witnesses" TEXT,
    "evidenceS3Key" TEXT,
    "initialCare" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidents" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidenceS3Key" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investigations" (
    "id" TEXT NOT NULL,
    "accidentId" TEXT,
    "incidentId" TEXT,
    "immediateCauses" TEXT,
    "basicCauses" TEXT,
    "unsafeActs" TEXT,
    "unsafeConditions" TEXT,
    "personalFactors" TEXT,
    "jobFactors" TEXT,
    "fiveWhysAnalysis" JSONB,
    "causalTree" JSONB,
    "reportS3Key" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "investigations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ppe_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ppe_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ppe_assignments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "ppeItemId" TEXT NOT NULL,
    "size" TEXT,
    "deliveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "replacementDue" TIMESTAMP(3),
    "signatureS3Key" TEXT,

    CONSTRAINT "ppe_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_equipment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "EmergencyEquipmentType" NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "acquiredAt" TIMESTAMP(3),
    "lastInspectionAt" TIMESTAMP(3),
    "nextInspectionAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'OPERATIONAL',

    CONSTRAINT "emergency_equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenances" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "type" "MaintenanceType" NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "performedAt" TIMESTAMP(3),
    "provider" TEXT,
    "cost" DECIMAL(12,2),
    "evidenceS3Key" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',

    CONSTRAINT "maintenances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_plans" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "threats" TEXT,
    "vulnerability" TEXT,
    "resources" TEXT,
    "organization" TEXT,
    "procedures" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emergency_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_scenarios" (
    "id" TEXT NOT NULL,
    "emergencyPlanId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "emergency_scenarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drills" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "objective" TEXT,
    "performedAt" TIMESTAMP(3) NOT NULL,
    "participantsCount" INTEGER,
    "brigadistsCount" INTEGER,
    "observersCount" INTEGER,
    "responseTimeSeconds" INTEGER,
    "evacuationTimeSeconds" INTEGER,
    "evacuatedCount" INTEGER,
    "resourcesUsed" TEXT,
    "weaknesses" TEXT,
    "strengths" TEXT,
    "evidenceS3Key" TEXT,

    CONSTRAINT "drills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergencies" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "status" "EmergencyStatus" NOT NULL DEFAULT 'NORMAL',
    "triggeredById" TEXT,
    "description" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "emergencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_permits" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "WorkPermitType" NOT NULL,
    "employeeId" TEXT,
    "contractorId" TEXT,
    "requirementsChecklist" JSONB,
    "status" "WorkPermitStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_permits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "copasst_members" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),

    CONSTRAINT "copasst_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "copasst_meetings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "heldAt" TIMESTAMP(3) NOT NULL,
    "agenda" TEXT,
    "minutesS3Key" TEXT,
    "commitments" JSONB,

    CONSTRAINT "copasst_meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audits" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scope" TEXT,
    "checklist" JSONB,
    "status" "AuditStatus" NOT NULL DEFAULT 'PLANNED',
    "scheduledFor" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_findings" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isNonConformity" BOOLEAN NOT NULL DEFAULT true,
    "evidenceS3Key" TEXT,
    "responsibleUserId" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" "ActionStatus" NOT NULL DEFAULT 'OPEN',

    CONSTRAINT "audit_findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "DocumentCategory" NOT NULL,
    "createdById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_versions" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "s3Key" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedById" TEXT NOT NULL,

    CONSTRAINT "document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "digital_signatures" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "userId" TEXT,
    "employeeId" TEXT,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT NOT NULL,
    "hash" TEXT,

    CONSTRAINT "digital_signatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "previousValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_states" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "enteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_transitions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "performedById" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "comment" TEXT,

    CONSTRAINT "workflow_transitions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_taxId_key" ON "tenants"("taxId");

-- CreateIndex
CREATE UNIQUE INDEX "users_cognitoSub_key" ON "users"("cognitoSub");

-- CreateIndex
CREATE UNIQUE INDEX "users_employeeId_key" ON "users"("employeeId");

-- CreateIndex
CREATE INDEX "users_tenantId_idx" ON "users"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenantId_email_key" ON "users"("tenantId", "email");

-- CreateIndex
CREATE INDEX "roles_tenantId_idx" ON "roles"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "roles_tenantId_name_key" ON "roles"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_module_action_key" ON "permissions"("module", "action");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_roleId_permissionId_key" ON "role_permissions"("roleId", "permissionId");

-- CreateIndex
CREATE INDEX "sites_tenantId_idx" ON "sites"("tenantId");

-- CreateIndex
CREATE INDEX "areas_tenantId_idx" ON "areas"("tenantId");

-- CreateIndex
CREATE INDEX "areas_siteId_idx" ON "areas"("siteId");

-- CreateIndex
CREATE INDEX "processes_tenantId_idx" ON "processes"("tenantId");

-- CreateIndex
CREATE INDEX "processes_areaId_idx" ON "processes"("areaId");

-- CreateIndex
CREATE INDEX "employees_tenantId_idx" ON "employees"("tenantId");

-- CreateIndex
CREATE INDEX "employees_siteId_idx" ON "employees"("siteId");

-- CreateIndex
CREATE UNIQUE INDEX "employees_tenantId_documentNumber_key" ON "employees"("tenantId", "documentNumber");

-- CreateIndex
CREATE INDEX "contractors_tenantId_idx" ON "contractors"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "contractors_tenantId_taxId_key" ON "contractors"("tenantId", "taxId");

-- CreateIndex
CREATE INDEX "contractor_documents_contractorId_idx" ON "contractor_documents"("contractorId");

-- CreateIndex
CREATE UNIQUE INDEX "brigadists_employeeId_key" ON "brigadists"("employeeId");

-- CreateIndex
CREATE INDEX "brigadists_tenantId_idx" ON "brigadists"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "competencies_name_key" ON "competencies"("name");

-- CreateIndex
CREATE UNIQUE INDEX "brigadist_competencies_brigadistId_competencyId_key" ON "brigadist_competencies"("brigadistId", "competencyId");

-- CreateIndex
CREATE INDEX "courses_tenantId_idx" ON "courses"("tenantId");

-- CreateIndex
CREATE INDEX "training_records_tenantId_idx" ON "training_records"("tenantId");

-- CreateIndex
CREATE INDEX "training_records_employeeId_idx" ON "training_records"("employeeId");

-- CreateIndex
CREATE INDEX "training_records_brigadistId_idx" ON "training_records"("brigadistId");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_trainingRecordId_key" ON "certificates"("trainingRecordId");

-- CreateIndex
CREATE INDEX "certificates_tenantId_idx" ON "certificates"("tenantId");

-- CreateIndex
CREATE INDEX "certificates_brigadistId_idx" ON "certificates"("brigadistId");

-- CreateIndex
CREATE INDEX "inspection_templates_tenantId_idx" ON "inspection_templates"("tenantId");

-- CreateIndex
CREATE INDEX "inspection_fields_templateId_idx" ON "inspection_fields"("templateId");

-- CreateIndex
CREATE INDEX "inspections_tenantId_idx" ON "inspections"("tenantId");

-- CreateIndex
CREATE INDEX "inspections_siteId_idx" ON "inspections"("siteId");

-- CreateIndex
CREATE INDEX "findings_tenantId_idx" ON "findings"("tenantId");

-- CreateIndex
CREATE INDEX "findings_status_idx" ON "findings"("status");

-- CreateIndex
CREATE INDEX "corrective_actions_tenantId_idx" ON "corrective_actions"("tenantId");

-- CreateIndex
CREATE INDEX "corrective_actions_status_idx" ON "corrective_actions"("status");

-- CreateIndex
CREATE INDEX "hazards_tenantId_idx" ON "hazards"("tenantId");

-- CreateIndex
CREATE INDEX "risk_assessments_tenantId_idx" ON "risk_assessments"("tenantId");

-- CreateIndex
CREATE INDEX "accidents_tenantId_idx" ON "accidents"("tenantId");

-- CreateIndex
CREATE INDEX "incidents_tenantId_idx" ON "incidents"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "investigations_accidentId_key" ON "investigations"("accidentId");

-- CreateIndex
CREATE UNIQUE INDEX "investigations_incidentId_key" ON "investigations"("incidentId");

-- CreateIndex
CREATE INDEX "ppe_items_tenantId_idx" ON "ppe_items"("tenantId");

-- CreateIndex
CREATE INDEX "ppe_assignments_tenantId_idx" ON "ppe_assignments"("tenantId");

-- CreateIndex
CREATE INDEX "ppe_assignments_employeeId_idx" ON "ppe_assignments"("employeeId");

-- CreateIndex
CREATE INDEX "emergency_equipment_tenantId_idx" ON "emergency_equipment"("tenantId");

-- CreateIndex
CREATE INDEX "emergency_equipment_siteId_idx" ON "emergency_equipment"("siteId");

-- CreateIndex
CREATE UNIQUE INDEX "emergency_equipment_tenantId_code_key" ON "emergency_equipment"("tenantId", "code");

-- CreateIndex
CREATE INDEX "maintenances_tenantId_idx" ON "maintenances"("tenantId");

-- CreateIndex
CREATE INDEX "maintenances_equipmentId_idx" ON "maintenances"("equipmentId");

-- CreateIndex
CREATE INDEX "emergency_plans_tenantId_idx" ON "emergency_plans"("tenantId");

-- CreateIndex
CREATE INDEX "drills_tenantId_idx" ON "drills"("tenantId");

-- CreateIndex
CREATE INDEX "emergencies_tenantId_idx" ON "emergencies"("tenantId");

-- CreateIndex
CREATE INDEX "emergencies_siteId_idx" ON "emergencies"("siteId");

-- CreateIndex
CREATE INDEX "work_permits_tenantId_idx" ON "work_permits"("tenantId");

-- CreateIndex
CREATE INDEX "copasst_members_tenantId_idx" ON "copasst_members"("tenantId");

-- CreateIndex
CREATE INDEX "copasst_meetings_tenantId_idx" ON "copasst_meetings"("tenantId");

-- CreateIndex
CREATE INDEX "audits_tenantId_idx" ON "audits"("tenantId");

-- CreateIndex
CREATE INDEX "audit_findings_auditId_idx" ON "audit_findings"("auditId");

-- CreateIndex
CREATE INDEX "documents_tenantId_idx" ON "documents"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "document_versions_documentId_version_key" ON "document_versions"("documentId", "version");

-- CreateIndex
CREATE INDEX "digital_signatures_tenantId_idx" ON "digital_signatures"("tenantId");

-- CreateIndex
CREATE INDEX "digital_signatures_documentId_idx" ON "digital_signatures"("documentId");

-- CreateIndex
CREATE INDEX "notifications_tenantId_idx" ON "notifications"("tenantId");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "reports_tenantId_idx" ON "reports"("tenantId");

-- CreateIndex
CREATE INDEX "audit_logs_tenantId_idx" ON "audit_logs"("tenantId");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "workflow_states_tenantId_idx" ON "workflow_states"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_states_entityType_entityId_key" ON "workflow_states"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "workflow_transitions_tenantId_idx" ON "workflow_transitions"("tenantId");

-- CreateIndex
CREATE INDEX "workflow_transitions_entityType_entityId_idx" ON "workflow_transitions"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sites" ADD CONSTRAINT "sites_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "areas" ADD CONSTRAINT "areas_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processes" ADD CONSTRAINT "processes_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractors" ADD CONSTRAINT "contractors_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractor_documents" ADD CONSTRAINT "contractor_documents_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "contractors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brigadists" ADD CONSTRAINT "brigadists_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brigadists" ADD CONSTRAINT "brigadists_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brigadist_competencies" ADD CONSTRAINT "brigadist_competencies_brigadistId_fkey" FOREIGN KEY ("brigadistId") REFERENCES "brigadists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brigadist_competencies" ADD CONSTRAINT "brigadist_competencies_competencyId_fkey" FOREIGN KEY ("competencyId") REFERENCES "competencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_records" ADD CONSTRAINT "training_records_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_records" ADD CONSTRAINT "training_records_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_records" ADD CONSTRAINT "training_records_brigadistId_fkey" FOREIGN KEY ("brigadistId") REFERENCES "brigadists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_trainingRecordId_fkey" FOREIGN KEY ("trainingRecordId") REFERENCES "training_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_brigadistId_fkey" FOREIGN KEY ("brigadistId") REFERENCES "brigadists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_templates" ADD CONSTRAINT "inspection_templates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_fields" ADD CONSTRAINT "inspection_fields_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "inspection_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "inspection_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "findings" ADD CONSTRAINT "findings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "findings" ADD CONSTRAINT "findings_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "inspections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrective_actions" ADD CONSTRAINT "corrective_actions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrective_actions" ADD CONSTRAINT "corrective_actions_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "findings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrective_actions" ADD CONSTRAINT "corrective_actions_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrective_actions" ADD CONSTRAINT "corrective_actions_responsibleEmployeeId_fkey" FOREIGN KEY ("responsibleEmployeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hazards" ADD CONSTRAINT "hazards_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hazards" ADD CONSTRAINT "hazards_processId_fkey" FOREIGN KEY ("processId") REFERENCES "processes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_assessments" ADD CONSTRAINT "risk_assessments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_assessments" ADD CONSTRAINT "risk_assessments_hazardId_fkey" FOREIGN KEY ("hazardId") REFERENCES "hazards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accidents" ADD CONSTRAINT "accidents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accidents" ADD CONSTRAINT "accidents_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investigations" ADD CONSTRAINT "investigations_accidentId_fkey" FOREIGN KEY ("accidentId") REFERENCES "accidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investigations" ADD CONSTRAINT "investigations_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ppe_items" ADD CONSTRAINT "ppe_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ppe_assignments" ADD CONSTRAINT "ppe_assignments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ppe_assignments" ADD CONSTRAINT "ppe_assignments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ppe_assignments" ADD CONSTRAINT "ppe_assignments_ppeItemId_fkey" FOREIGN KEY ("ppeItemId") REFERENCES "ppe_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_equipment" ADD CONSTRAINT "emergency_equipment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_equipment" ADD CONSTRAINT "emergency_equipment_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenances" ADD CONSTRAINT "maintenances_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenances" ADD CONSTRAINT "maintenances_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "emergency_equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_plans" ADD CONSTRAINT "emergency_plans_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_plans" ADD CONSTRAINT "emergency_plans_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_scenarios" ADD CONSTRAINT "emergency_scenarios_emergencyPlanId_fkey" FOREIGN KEY ("emergencyPlanId") REFERENCES "emergency_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drills" ADD CONSTRAINT "drills_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drills" ADD CONSTRAINT "drills_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "emergency_scenarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergencies" ADD CONSTRAINT "emergencies_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergencies" ADD CONSTRAINT "emergencies_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permits" ADD CONSTRAINT "work_permits_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permits" ADD CONSTRAINT "work_permits_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permits" ADD CONSTRAINT "work_permits_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "contractors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "copasst_members" ADD CONSTRAINT "copasst_members_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "copasst_meetings" ADD CONSTRAINT "copasst_meetings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audits" ADD CONSTRAINT "audits_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_findings" ADD CONSTRAINT "audit_findings_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "audits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digital_signatures" ADD CONSTRAINT "digital_signatures_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digital_signatures" ADD CONSTRAINT "digital_signatures_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digital_signatures" ADD CONSTRAINT "digital_signatures_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_states" ADD CONSTRAINT "workflow_states_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_transitions" ADD CONSTRAINT "workflow_transitions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_transitions" ADD CONSTRAINT "workflow_transitions_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
