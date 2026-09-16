import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FindingStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CloseFindingDto } from './dto/close-finding.dto';

@Injectable()
export class FindingsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(tenantId: string, status?: FindingStatus) {
    return this.prisma.forTenant(tenantId, (tx) =>
      tx.finding.findMany({
        where: { tenantId, ...(status ? { status } : {}) },
        include: { correctiveActions: true, inspection: { select: { id: true, siteId: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    );
  }

  async findOne(tenantId: string, id: string) {
    const finding = await this.prisma.forTenant(tenantId, (tx) =>
      tx.finding.findFirst({ where: { id, tenantId }, include: { correctiveActions: true } }),
    );
    if (!finding) {
      throw new NotFoundException(`Hallazgo ${id} no encontrado`);
    }
    return finding;
  }

  /** Paso "responsable sube evidencia de cierre" del flujo (ARCHITECTURE.md §8). */
  async submitClosureEvidence(tenantId: string, id: string, dto: CloseFindingDto) {
    const finding = await this.findOne(tenantId, id);
    if (finding.status === 'CLOSED') {
      throw new BadRequestException('El hallazgo ya está cerrado');
    }

    return this.prisma.forTenant(tenantId, async (tx) => {
      await tx.correctiveAction.updateMany({
        where: { findingId: id },
        data: { status: 'PENDING_VERIFICATION', closureEvidenceS3Key: dto.evidenceS3Key },
      });
      return tx.finding.update({
        where: { id },
        data: { status: 'PENDING_VERIFICATION' },
        include: { correctiveActions: true },
      });
    });
  }

  /** Paso "SST verifica y cierra" — requiere permiso APPROVE (ver módulo). */
  async verifyAndClose(tenantId: string, id: string) {
    const finding = await this.findOne(tenantId, id);
    if (finding.status !== 'PENDING_VERIFICATION') {
      throw new BadRequestException('El hallazgo debe estar en verificación antes de cerrarse');
    }

    return this.prisma.forTenant(tenantId, async (tx) => {
      await tx.correctiveAction.updateMany({
        where: { findingId: id },
        data: { status: 'CLOSED', verifiedAt: new Date() },
      });
      return tx.finding.update({ where: { id }, data: { status: 'CLOSED' } });
    });
  }
}
