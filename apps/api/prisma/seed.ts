// Seed de desarrollo — "Empresa Demo Colombia"
//
// Crea el catálogo global de permisos y una empresa demo completa (3 sedes,
// ~100 trabajadores, 10 brigadistas, equipos, inspecciones, hallazgos,
// capacitaciones, simulacros, accidentes/incidentes y matriz de riesgos)
// para poder probar el dashboard end-to-end (ver docs/ARCHITECTURE.md §10
// y la sección 62 del alcance funcional).
//
// Nota: el cálculo real del semáforo de competencia de brigada, del estado
// de certificados y de indicadores se implementa como lógica de backend en
// la Fase 4; aquí se asignan valores plausibles para poder visualizar el
// dashboard, no se reimplementa esa lógica.

import { PrismaClient, PermissionAction, SystemRoleKey, EmploymentType, RiskLevel } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

faker.seed(360); // datos reproducibles entre corridas

const MODULES = [
  'dashboard', 'employees', 'brigade', 'training', 'inspections', 'findings',
  'risk-matrix', 'accidents', 'ppe', 'emergency-equipment', 'emergencies',
  'drills', 'contractors', 'work-permits', 'copasst', 'audits', 'documents',
  'indicators', 'ai', 'command-center', 'settings',
];

const ROLE_PERMISSION_RULES: Record<SystemRoleKey, (module: string, action: PermissionAction) => boolean> = {
  SUPER_ADMIN: () => true,
  COMPANY_ADMIN: () => true,
  SST_RESPONSIBLE: () => true,
  MANAGER: (_m, a) => ['VIEW', 'EXPORT', 'APPROVE'].includes(a),
  SST_COORDINATOR: (m, a) => m !== 'settings' && ['VIEW', 'CREATE', 'EDIT', 'APPROVE'].includes(a),
  SUPERVISOR: (m, a) => ['inspections', 'findings', 'ppe', 'brigade', 'drills'].includes(m) && ['VIEW', 'CREATE', 'EDIT'].includes(a),
  INSPECTOR: (m, a) => ['inspections', 'findings'].includes(m) && ['VIEW', 'CREATE'].includes(a),
  BRIGADIST: (m, a) => ['brigade', 'drills', 'emergency-equipment'].includes(m) && ['VIEW', 'CREATE'].includes(a),
  WORKER: (m, a) => (m === 'documents' && a === 'VIEW') || (m === 'training' && a === 'VIEW') || (m === 'findings' && a === 'CREATE'),
  CONTRACTOR: (m, a) => ['work-permits', 'documents'].includes(m) && a === 'VIEW',
  AUDITOR: (_m, a) => ['VIEW', 'AUDIT', 'EXPORT'].includes(a),
  MEDICAL_PROFESSIONAL: (m, a) => ['employees', 'accidents'].includes(m) && a === 'VIEW',
  READONLY: (_m, a) => a === 'VIEW',
};

async function seedPermissionCatalog() {
  const actions = Object.values(PermissionAction);
  const data = MODULES.flatMap((module) => actions.map((action) => ({ module, action })));
  await prisma.permission.createMany({ data, skipDuplicates: true });
  return prisma.permission.findMany();
}

async function seedRoles(tenantId: string, permissions: Awaited<ReturnType<typeof seedPermissionCatalog>>) {
  const roles: Record<string, string> = {};
  for (const key of Object.values(SystemRoleKey)) {
    const role = await prisma.role.create({
      data: { tenantId, name: key.replace(/_/g, ' '), systemKey: key },
    });
    roles[key] = role.id;

    const matcher = ROLE_PERMISSION_RULES[key];
    const granted = permissions.filter((p) => matcher(p.module, p.action));
    if (granted.length) {
      await prisma.rolePermission.createMany({
        data: granted.map((p) => ({ roleId: role.id, permissionId: p.id })),
      });
    }
  }
  return roles;
}

function cedula(index: number) {
  return String(1_000_000_000 + index);
}

async function main() {
  console.log('Sembrando catálogo de permisos...');
  const permissions = await seedPermissionCatalog();

  console.log('Creando tenant "Empresa Demo Colombia"...');
  const tenant = await prisma.tenant.create({
    data: { name: 'Empresa Demo Colombia', taxId: '900123456-7', plan: 'EMPRESARIAL' },
  });

  const roles = await seedRoles(tenant.id, permissions);

  console.log('Creando sedes, áreas y procesos...');
  const siteDefs = [
    { name: 'Sede Principal - Bogotá', city: 'Bogotá', isMain: true, areas: ['Producción', 'Administración', 'Mantenimiento'] },
    { name: 'Sede 2 - Medellín', city: 'Medellín', isMain: false, areas: ['Logística', 'Calidad'] },
    { name: 'Planta - Cali', city: 'Cali', isMain: false, areas: ['Producción', 'Bodega'] },
  ];

  const sites = [];
  const areasBySite: Record<string, { id: string; name: string; processId: string }[]> = {};

  for (const def of siteDefs) {
    const site = await prisma.site.create({
      data: { tenantId: tenant.id, name: def.name, city: def.city, isMain: def.isMain, address: faker.location.streetAddress() },
    });
    sites.push(site);
    areasBySite[site.id] = [];
    for (const areaName of def.areas) {
      const area = await prisma.area.create({ data: { tenantId: tenant.id, siteId: site.id, name: areaName } });
      const process = await prisma.process.create({
        data: { tenantId: tenant.id, areaId: area.id, name: `Proceso de ${areaName.toLowerCase()}` },
      });
      areasBySite[site.id].push({ id: area.id, name: area.name, processId: process.id });
    }
  }

  console.log('Creando 100 trabajadores...');
  const positions = ['Operario', 'Técnico de mantenimiento', 'Auxiliar administrativo', 'Supervisor de planta', 'Analista de calidad', 'Conductor', 'Almacenista'];
  const employees = [];
  for (let i = 0; i < 100; i++) {
    const site = faker.helpers.arrayElement(sites);
    const area = faker.helpers.arrayElement(areasBySite[site.id]);
    const employee = await prisma.employee.create({
      data: {
        tenantId: tenant.id,
        siteId: site.id,
        areaId: area.id,
        documentNumber: cedula(i),
        fullName: faker.person.fullName(),
        birthDate: faker.date.birthdate({ min: 18, max: 60, mode: 'age' }),
        position: faker.helpers.arrayElement(positions),
        employmentType: faker.helpers.arrayElement(Object.values(EmploymentType)) as EmploymentType,
        hireDate: faker.date.past({ years: 8 }),
        phone: faker.phone.number({ style: 'national' }),
        emergencyContactName: faker.person.fullName(),
        emergencyContactPhone: faker.phone.number({ style: 'national' }),
        eps: faker.helpers.arrayElement(['Sura EPS', 'Sanitas', 'Nueva EPS', 'Compensar']),
        arl: faker.helpers.arrayElement(['Sura ARL', 'Positiva', 'Colmena']),
      },
    });
    employees.push({ ...employee, siteId: site.id, processId: area.processId });
  }

  console.log('Creando usuarios del sistema...');
  async function createUser(email: string, fullName: string, roleKey: SystemRoleKey, employeeId?: string) {
    return prisma.user.create({
      data: {
        tenantId: tenant.id,
        cognitoSub: faker.string.uuid(),
        email,
        fullName,
        roleId: roles[roleKey],
        employeeId,
        mfaEnabled: roleKey !== 'WORKER',
      },
    });
  }

  const adminUser = await createUser('admin@empresademo.co', 'Ana María Rodríguez', 'COMPANY_ADMIN');
  const sstUser = await createUser('sst@empresademo.co', 'Carlos Hernández', 'SST_RESPONSIBLE');
  const supervisorEmployee = employees[0];
  const inspectorEmployee = employees[1];
  await createUser('supervisor@empresademo.co', supervisorEmployee.fullName, 'SUPERVISOR', supervisorEmployee.id);
  const inspectorUser = await createUser('inspector@empresademo.co', inspectorEmployee.fullName, 'INSPECTOR', inspectorEmployee.id);

  console.log('Creando catálogo de competencias y 10 brigadistas...');
  const competencyNames = ['Primeros auxilios', 'Contra incendios', 'Evacuación', 'Rescate', 'Comunicaciones', 'Manejo de DEA', 'Materiales peligrosos'];
  const competencies = await Promise.all(competencyNames.map((name) => prisma.competency.create({ data: { name } })));

  const brigadistEmployees = employees.slice(2, 12);
  const brigadists = [];
  for (const emp of brigadistEmployees) {
    const level = faker.helpers.arrayElement(['COMPLIES', 'COMPLIES', 'NEEDS_UPDATE', 'NON_COMPLIANT'] as const);
    const brigadist = await prisma.brigadist.create({
      data: { tenantId: tenant.id, employeeId: emp.id, group: faker.helpers.arrayElement(['Grupo A', 'Grupo B']), competencyLevel: level },
    });
    for (const competency of faker.helpers.arrayElements(competencies, { min: 3, max: 6 })) {
      await prisma.brigadistCompetency.create({
        data: { brigadistId: brigadist.id, competencyId: competency.id, level: faker.helpers.arrayElement(['COMPLIES', 'NEEDS_UPDATE', 'NON_COMPLIANT']) },
      });
    }
    brigadists.push(brigadist);
  }
  await createUser('brigadista1@empresademo.co', brigadistEmployees[0].fullName, 'BRIGADIST', brigadistEmployees[0].id);

  console.log('Creando 10 cursos y registros de capacitación...');
  const courseDefs: { name: string; type: keyof typeof faker.helpers extends never ? never : string; hours: number; validity: number | null }[] = [
    { name: 'Inducción SG-SST', type: 'INDUCTION', hours: 8, validity: null },
    { name: 'Reinducción anual', type: 'REINDUCTION', hours: 4, validity: 12 },
    { name: 'Fundamentos SST', type: 'SST', hours: 16, validity: 24 },
    { name: 'Formación de brigada', type: 'BRIGADE', hours: 40, validity: 12 },
    { name: 'Primeros auxilios básicos', type: 'FIRST_AID', hours: 20, validity: 12 },
    { name: 'Plan de evacuación', type: 'EVACUATION', hours: 8, validity: 12 },
    { name: 'Control de incendios', type: 'FIREFIGHTING', hours: 16, validity: 12 },
    { name: 'Uso correcto de EPP', type: 'PPE', hours: 4, validity: 12 },
    { name: 'Riesgo eléctrico', type: 'ELECTRICAL_RISK', hours: 8, validity: 24 },
    { name: 'Trabajo seguro en alturas', type: 'HEIGHTS', hours: 40, validity: 12 },
  ];
  const courses = [];
  for (const c of courseDefs) {
    courses.push(await prisma.course.create({
      data: { tenantId: tenant.id, name: c.name, type: c.type as any, durationHours: c.hours, validityMonths: c.validity },
    }));
  }

  for (let i = 0; i < 25; i++) {
    const course = faker.helpers.arrayElement(courses);
    const targetBrigadist = faker.datatype.boolean();
    const record = await prisma.trainingRecord.create({
      data: {
        tenantId: tenant.id,
        courseId: course.id,
        employeeId: targetBrigadist ? undefined : faker.helpers.arrayElement(employees).id,
        brigadistId: targetBrigadist ? faker.helpers.arrayElement(brigadists).id : undefined,
        instructor: faker.person.fullName(),
        date: faker.date.past({ years: 1 }),
        hours: course.durationHours,
        result: 'APPROVED',
      },
    });
    if (course.validityMonths && faker.datatype.boolean()) {
      const offsetDays = faker.number.int({ min: -60, max: 300 });
      const expiresAt = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
      const status = expiresAt < new Date() ? 'EXPIRED' : offsetDays <= 30 ? 'EXPIRING_SOON' : 'VALID';
      await prisma.certificate.create({
        data: {
          tenantId: tenant.id,
          trainingRecordId: record.id,
          brigadistId: record.brigadistId ?? undefined,
          expiresAt,
          status,
        },
      });
    }
  }

  console.log('Creando 10 equipos de emergencia y mantenimientos...');
  const equipmentDefs = [
    ['EXT', 'EXTINGUISHER'], ['EXT', 'EXTINGUISHER'], ['EXT', 'EXTINGUISHER'],
    ['DEA', 'AED'], ['BOT', 'FIRST_AID_KIT'], ['BOT', 'FIRST_AID_KIT'],
    ['CAM', 'STRETCHER'], ['RAD', 'RADIO'], ['ALM', 'ALARM'], ['GAB', 'CABINET'],
  ] as const;
  const equipmentList = [];
  for (let i = 0; i < equipmentDefs.length; i++) {
    const [prefix, type] = equipmentDefs[i];
    const site = faker.helpers.arrayElement(sites);
    const nextInspection = faker.date.soon({ days: 90 });
    const equipment = await prisma.emergencyEquipment.create({
      data: {
        tenantId: tenant.id,
        siteId: site.id,
        code: `${prefix}-${String(i + 1).padStart(5, '0')}`,
        type,
        acquiredAt: faker.date.past({ years: 3 }),
        lastInspectionAt: faker.date.recent({ days: 60 }),
        nextInspectionAt: nextInspection,
      },
    });
    equipmentList.push(equipment);
    if (faker.datatype.boolean()) {
      await prisma.maintenance.create({
        data: {
          tenantId: tenant.id,
          equipmentId: equipment.id,
          type: faker.helpers.arrayElement(['PREVENTIVE', 'CORRECTIVE']),
          scheduledFor: nextInspection,
          status: 'SCHEDULED',
        },
      });
    }
  }

  console.log('Creando plantillas de inspección, 20 inspecciones y 15 hallazgos...');
  const templateDefs = [
    { name: 'Locativa', category: 'locativa' },
    { name: 'EPP', category: 'epp' },
    { name: 'Extintores', category: 'equipos' },
    { name: 'Trabajo en alturas', category: 'alturas' },
    { name: 'Orden y aseo', category: 'orden_aseo' },
  ];
  const templates = [];
  for (const t of templateDefs) {
    const template = await prisma.inspectionTemplate.create({ data: { tenantId: tenant.id, name: t.name, category: t.category } });
    await prisma.inspectionField.createMany({
      data: [
        { templateId: template.id, label: '¿Cumple la condición evaluada?', type: 'BOOLEAN', order: 1, isRequired: true },
        { templateId: template.id, label: 'Observaciones', type: 'TEXT', order: 2, isRequired: false },
        { templateId: template.id, label: 'Evidencia fotográfica', type: 'PHOTO', order: 3, isRequired: false },
      ],
    });
    templates.push(template);
  }

  const inspections = [];
  for (let i = 0; i < 20; i++) {
    const inspection = await prisma.inspection.create({
      data: {
        tenantId: tenant.id,
        templateId: faker.helpers.arrayElement(templates).id,
        siteId: faker.helpers.arrayElement(sites).id,
        inspectorId: inspectorUser.id,
        performedAt: faker.date.recent({ days: 90 }),
        answers: { cumple: faker.datatype.boolean(), observaciones: faker.lorem.sentence() },
        observations: faker.lorem.sentence(),
      },
    });
    inspections.push(inspection);
  }

  const findingCategories = ['Orden y aseo', 'EPP', 'Señalización', 'Riesgo eléctrico', 'Herramientas'];
  const findingStatuses = ['OPEN', 'IN_PROGRESS', 'OVERDUE', 'PENDING_VERIFICATION', 'CLOSED'] as const;
  for (let i = 0; i < 15; i++) {
    const status = findingStatuses[i % findingStatuses.length];
    const finding = await prisma.finding.create({
      data: {
        tenantId: tenant.id,
        inspectionId: faker.helpers.arrayElement(inspections).id,
        description: faker.lorem.sentence(),
        category: faker.helpers.arrayElement(findingCategories),
        riskLevel: faker.helpers.arrayElement(Object.values(RiskLevel)) as RiskLevel,
        status,
      },
    });
    await prisma.correctiveAction.create({
      data: {
        tenantId: tenant.id,
        findingId: finding.id,
        origin: 'finding',
        description: `Cerrar hallazgo: ${finding.description}`,
        priority: faker.helpers.arrayElement(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
        responsibleEmployeeId: faker.helpers.arrayElement(employees).id,
        dueDate: faker.date.soon({ days: 30 }),
        status: status === 'CLOSED' ? 'CLOSED' : status,
      },
    });
  }

  console.log('Creando matriz de peligros...');
  const hazardDescriptions = [
    'Caída al mismo nivel por piso húmedo', 'Exposición a ruido en área de producción',
    'Contacto con energía eléctrica en tablero', 'Sobreesfuerzo por manejo manual de cargas',
    'Caída de altura en trabajos de mantenimiento', 'Exposición a material particulado',
    'Golpeado por vehículo en zona de cargue', 'Incendio por almacenamiento de inflamables',
  ];
  for (const description of hazardDescriptions) {
    const area = faker.helpers.arrayElement(Object.values(areasBySite).flat());
    const probability = faker.number.int({ min: 1, max: 10 });
    const severity = faker.number.int({ min: 1, max: 10 });
    const score = probability * severity;
    const riskLevel: RiskLevel = score >= 60 ? 'CRITICAL' : score >= 30 ? 'HIGH' : score >= 10 ? 'MEDIUM' : 'LOW';
    const hazard = await prisma.hazard.create({
      data: {
        tenantId: tenant.id,
        processId: area.processId,
        activity: faker.lorem.words(3),
        task: faker.lorem.words(4),
        description,
        source: faker.lorem.words(3),
        consequence: faker.lorem.words(5),
      },
    });
    await prisma.riskAssessment.create({
      data: {
        tenantId: tenant.id,
        hazardId: hazard.id,
        existingControls: faker.lorem.sentence(),
        probability,
        severity,
        riskLevel,
        acceptable: riskLevel === 'LOW',
      },
    });
  }

  console.log('Creando accidentes e incidentes de ejemplo...');
  const accident1 = await prisma.accident.create({
    data: {
      tenantId: tenant.id,
      employeeId: faker.helpers.arrayElement(employees).id,
      occurredAt: faker.date.past({ years: 1 }),
      location: 'Área de producción',
      activity: 'Manejo de herramienta manual',
      description: 'Corte superficial en mano izquierda al manipular herramienta sin guantes.',
      injury: 'Herida superficial',
      bodyPart: 'Mano izquierda',
      initialCare: 'Primeros auxilios en sitio, remisión a EPS',
    },
  });
  await prisma.investigation.create({
    data: {
      accidentId: accident1.id,
      immediateCauses: 'No uso de guantes de protección',
      basicCauses: 'Falta de supervisión en el punto de trabajo',
      unsafeActs: 'Omisión del uso de EPP',
      unsafeConditions: 'Herramienta con filo expuesto',
    },
  });
  await prisma.accident.create({
    data: {
      tenantId: tenant.id,
      employeeId: faker.helpers.arrayElement(employees).id,
      occurredAt: faker.date.past({ years: 1 }),
      location: 'Bodega',
      activity: 'Almacenamiento de materiales',
      description: 'Golpe en pie por caída de objeto desde estantería.',
      injury: 'Contusión',
      bodyPart: 'Pie derecho',
    },
  });
  const incident1 = await prisma.incident.create({
    data: {
      tenantId: tenant.id,
      occurredAt: faker.date.recent({ days: 60 }),
      location: 'Zona de cargue',
      description: 'Casi accidente: vehículo de carga estuvo a punto de golpear a un trabajador que cruzaba sin señalización.',
    },
  });
  await prisma.investigation.create({
    data: {
      incidentId: incident1.id,
      immediateCauses: 'Cruce peatonal sin señalización visible',
      basicCauses: 'Falta de demarcación de rutas peatonales',
    },
  });

  console.log('Creando plan de emergencias, escenarios y 3 simulacros...');
  const scenarioNames = ['Evacuación', 'Incendio', 'Sismo'];
  const drillsCreated = [];
  for (const site of sites) {
    const plan = await prisma.emergencyPlan.create({
      data: {
        tenantId: tenant.id,
        siteId: site.id,
        threats: 'Sismo, incendio, derrame de sustancias químicas',
        vulnerability: 'Media',
        resources: 'Brigada de emergencia, extintores, botiquines, punto de encuentro',
        organization: 'Coordinador de emergencias, brigada, apoyo externo (bomberos, Cruz Roja)',
      },
    });
    for (const name of scenarioNames) {
      const scenario = await prisma.emergencyScenario.create({ data: { emergencyPlanId: plan.id, name } });
      if (drillsCreated.length < 3) {
        const drill = await prisma.drill.create({
          data: {
            tenantId: tenant.id,
            scenarioId: scenario.id,
            objective: `Evaluar respuesta ante ${name.toLowerCase()}`,
            performedAt: faker.date.past({ years: 1 }),
            participantsCount: faker.number.int({ min: 30, max: 100 }),
            brigadistsCount: faker.number.int({ min: 3, max: 10 }),
            responseTimeSeconds: faker.number.int({ min: 60, max: 300 }),
            evacuationTimeSeconds: faker.number.int({ min: 120, max: 600 }),
            evacuatedCount: faker.number.int({ min: 30, max: 100 }),
            strengths: 'Buen tiempo de respuesta de la brigada',
            weaknesses: 'Puntos de encuentro poco señalizados',
          },
        });
        drillsCreated.push(drill);
      }
    }
  }

  console.log('Creando catálogo de EPP y asignaciones...');
  const ppeDefs = ['Casco de seguridad', 'Gafas de protección', 'Guantes de nitrilo', 'Botas de seguridad', 'Chaleco reflectivo'];
  const ppeItems = await Promise.all(ppeDefs.map((name) => prisma.pPEItem.create({ data: { tenantId: tenant.id, name } })));
  for (const emp of faker.helpers.arrayElements(employees, 40)) {
    await prisma.pPEAssignment.create({
      data: {
        tenantId: tenant.id,
        employeeId: emp.id,
        ppeItemId: faker.helpers.arrayElement(ppeItems).id,
        deliveredAt: faker.date.past({ years: 1 }),
        replacementDue: faker.date.soon({ days: 180 }),
      },
    });
  }

  console.log('Creando contratistas, documentos, COPASST, auditoría y permisos de trabajo...');
  for (const [name, status] of [['Ferretería Industrial SAS', 'APPROVED'], ['Transportes Andinos SAS', 'PENDING']] as const) {
    const contractor = await prisma.contractor.create({
      data: { tenantId: tenant.id, companyName: name, taxId: faker.string.numeric(9), contactName: faker.person.fullName(), approvalStatus: status },
    });
    await prisma.contractorDocument.createMany({
      data: [
        { contractorId: contractor.id, type: 'arl', s3Key: `contractors/${contractor.id}/arl.pdf`, expiresAt: faker.date.soon({ days: 90 }) },
        { contractorId: contractor.id, type: 'induccion', s3Key: `contractors/${contractor.id}/induccion.pdf` },
      ],
    });
    if (status === 'APPROVED') {
      await prisma.workPermit.create({
        data: {
          tenantId: tenant.id,
          type: 'HEIGHTS',
          contractorId: contractor.id,
          requirementsChecklist: { induccion: true, arl_vigente: true, certificado_alturas: true },
          status: 'APPROVED',
          validFrom: faker.date.recent({ days: 5 }),
          validTo: faker.date.soon({ days: 30 }),
        },
      });
    }
  }
  await prisma.workPermit.create({
    data: {
      tenantId: tenant.id,
      type: 'HOT_WORK',
      employeeId: faker.helpers.arrayElement(employees).id,
      requirementsChecklist: { extintor_disponible: true, permiso_supervisor: false },
      status: 'PENDING_APPROVAL',
    },
  });

  for (const [name, role] of [[adminUser.fullName, 'Representante del empleador'], [sstUser.fullName, 'Representante del empleador'], [employees[3].fullName, 'Representante de los trabajadores'], [employees[4].fullName, 'Representante de los trabajadores']] as const) {
    await prisma.copasstMember.create({ data: { tenantId: tenant.id, employeeId: employees.find((e) => e.fullName === name)?.id ?? employees[3].id, role, startDate: faker.date.past({ years: 1 }) } });
  }
  await prisma.copasstMeeting.create({
    data: {
      tenantId: tenant.id,
      heldAt: faker.date.recent({ days: 30 }),
      agenda: 'Seguimiento a inspecciones y hallazgos del trimestre',
      commitments: [{ description: 'Reforzar señalización en bodega', responsible: employees[4].fullName, dueDate: faker.date.soon({ days: 30 }) }],
    },
  });

  const audit = await prisma.audit.create({
    data: { tenantId: tenant.id, name: 'Auditoría interna SG-SST 2026', scope: 'Todos los procesos', status: 'IN_PROGRESS', scheduledFor: faker.date.soon({ days: 15 }) },
  });
  await prisma.auditFinding.create({
    data: { auditId: audit.id, description: 'No se evidencia actualización de la matriz de peligros en el último año', isNonConformity: true, dueDate: faker.date.soon({ days: 45 }) },
  });

  console.log('Creando documentos, notificaciones y registros de auditoría del sistema...');
  const doc = await prisma.document.create({
    data: { tenantId: tenant.id, title: 'Plan de emergencias - Sede Principal', category: 'EMERGENCY_PLAN', createdById: sstUser.id, expiresAt: faker.date.soon({ days: 365 }) },
  });
  await prisma.documentVersion.create({ data: { documentId: doc.id, version: 1, s3Key: `documents/${doc.id}/v1.pdf`, uploadedById: sstUser.id } });

  await prisma.notification.createMany({
    data: [
      { tenantId: tenant.id, userId: sstUser.id, channel: 'EMAIL', title: 'Certificación por vencer', body: 'Un certificado de brigada vence en 7 días.' },
      { tenantId: tenant.id, userId: sstUser.id, channel: 'IN_APP', title: 'Acción correctiva vencida', body: 'Hay una acción correctiva vencida sin cerrar.' },
      { tenantId: tenant.id, userId: adminUser.id, channel: 'PUSH', title: 'Simulacro pendiente', body: 'El simulacro de evacuación trimestral está pendiente de programar.' },
    ],
  });

  await prisma.auditLog.createMany({
    data: [
      { tenantId: tenant.id, userId: sstUser.id, action: 'CREATE', entityType: 'Inspection', entityId: inspections[0].id },
      { tenantId: tenant.id, userId: adminUser.id, action: 'CREATE', entityType: 'Tenant', entityId: tenant.id },
    ],
  });

  console.log('Seed completado: Empresa Demo Colombia.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
