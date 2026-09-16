import { Injectable, NotFoundException } from '@nestjs/common';
import { CompetencyLevel } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBrigadistDto } from './dto/create-brigadist.dto';

@Injectable()
export class BrigadeService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(tenantId: string) {
    return this.prisma.forTenant(tenantId, (tx) =>
      tx.brigadist.findMany({
        where: { tenantId },
        include: { employee: true },
        orderBy: { joinedAt: 'asc' },
      }),
    );
  }

  create(tenantId: string, dto: CreateBrigadistDto) {
    return this.prisma.forTenant(tenantId, (tx) =>
      tx.brigadist.create({ data: { tenantId, employeeId: dto.employeeId, group: dto.group } }),
    );
  }

  /**
   * Semáforo de competencia del brigadista (sección 8 del alcance
   * funcional): 🟢 Cumple / 🟡 Requiere actualización / 🔴 No cumple,
   * recalculado a partir de sus competencias y certificados vigentes en
   * vez de confiar únicamente en el campo cacheado `competencyLevel`.
   */
  async competencyStatus(tenantId: string, id: string) {
    const brigadist = await this.prisma.forTenant(tenantId, (tx) =>
      tx.brigadist.findFirst({
        where: { id, tenantId },
        include: {
          competencies: { include: { competency: true } },
          certificates: true,
          trainingRecords: { include: { course: true } },
        },
      }),
    );
    if (!brigadist) {
      throw new NotFoundException(`Brigadista ${id} no encontrado`);
    }

    const total = brigadist.competencies.length;
    const compliant = brigadist.competencies.filter((c) => c.level === 'COMPLIES').length;
    const expiredCertificates = brigadist.certificates.filter((c) => c.status === 'EXPIRED').length;

    const trainingCompletionPercent = total === 0 ? 0 : Math.round((compliant / total) * 100);

    let overallLevel: CompetencyLevel = 'COMPLIES';
    if (expiredCertificates > 0 || trainingCompletionPercent < 50) {
      overallLevel = 'NON_COMPLIANT';
    } else if (trainingCompletionPercent < 100) {
      overallLevel = 'NEEDS_UPDATE';
    }

    return {
      brigadistId: brigadist.id,
      overallLevel,
      trainingCompletionPercent,
      expiredCertificates,
      competencies: brigadist.competencies.map((c) => ({ name: c.competency.name, level: c.level })),
    };
  }
}
