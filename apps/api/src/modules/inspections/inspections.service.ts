import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFindingDto } from './dto/create-finding.dto';
import { CreateInspectionDto } from './dto/create-inspection.dto';

@Injectable()
export class InspectionsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(tenantId: string, siteId?: string) {
    return this.prisma.forTenant(tenantId, (tx) =>
      tx.inspection.findMany({
        where: { tenantId, ...(siteId ? { siteId } : {}) },
        include: { template: true, site: true, findings: true },
        orderBy: { performedAt: 'desc' },
      }),
    );
  }

  /** Catálogo de plantillas activas, para el selector al crear una inspección. */
  listTemplates(tenantId: string) {
    return this.prisma.forTenant(tenantId, (tx) =>
      tx.inspectionTemplate.findMany({
        where: { tenantId, isActive: true },
        orderBy: { name: 'asc' },
      }),
    );
  }

  async findOne(tenantId: string, id: string) {
    const inspection = await this.prisma.forTenant(tenantId, (tx) =>
      tx.inspection.findFirst({
        where: { id, tenantId },
        include: { template: { include: { fields: true } }, site: true, findings: { include: { correctiveActions: true } } },
      }),
    );
    if (!inspection) {
      throw new NotFoundException(`Inspección ${id} no encontrada`);
    }
    return inspection;
  }

  create(tenantId: string, inspectorId: string, dto: CreateInspectionDto) {
    return this.prisma.forTenant(tenantId, (tx) =>
      tx.inspection.create({
        data: {
          tenantId,
          templateId: dto.templateId,
          siteId: dto.siteId,
          inspectorId,
          performedAt: new Date(dto.performedAt),
          latitude: dto.latitude,
          longitude: dto.longitude,
          answers: dto.answers as any,
          observations: dto.observations,
        },
      }),
    );
  }

  /**
   * Registra un hallazgo de la inspección y su acción correctiva en una
   * sola transacción — es el paso "INSPECCIÓN → HALLAZGO → ACCIÓN
   * CORRECTIVA" del flujo descrito en docs/ARCHITECTURE.md §8.
   */
  async addFinding(tenantId: string, inspectionId: string, dto: CreateFindingDto) {
    await this.findOne(tenantId, inspectionId);

    return this.prisma.forTenant(tenantId, (tx) =>
      tx.finding.create({
        data: {
          tenantId,
          inspectionId,
          description: dto.description,
          category: dto.category,
          hazard: dto.hazard,
          riskLevel: dto.riskLevel,
          photoS3Key: dto.photoS3Key,
          latitude: dto.latitude,
          longitude: dto.longitude,
          status: 'OPEN',
          correctiveActions: {
            create: {
              tenantId,
              origin: 'finding',
              description: dto.correctiveAction.description,
              priority: dto.correctiveAction.priority,
              responsibleEmployeeId: dto.correctiveAction.responsibleEmployeeId,
              responsibleUserId: dto.correctiveAction.responsibleUserId,
              dueDate: new Date(dto.correctiveAction.dueDate),
              status: 'OPEN',
            },
          },
        },
        include: { correctiveActions: true },
      }),
    );
  }
}
