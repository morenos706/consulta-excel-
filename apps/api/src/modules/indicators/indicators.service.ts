import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class IndicatorsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Indicadores generales del dashboard (sección 6 del alcance
   * funcional). Es el punto final del flujo conectado: cada inspección,
   * hallazgo y cierre registrado en los módulos anteriores se refleja
   * aquí sin necesidad de un proceso de sincronización aparte, porque
   * todos leen de las mismas tablas transaccionales.
   */
  async dashboardSummary(tenantId: string) {
    return this.prisma.forTenant(tenantId, async (tx) => {
      const [
        employees,
        brigadists,
        contractors,
        inspections,
        findingsOpen,
        actionsOverdue,
        trainingRecords,
        accidents,
        drills,
        findingsByRisk,
      ] = await Promise.all([
        tx.employee.count({ where: { tenantId, deletedAt: null } }),
        tx.brigadist.count({ where: { tenantId, status: 'ACTIVE' } }),
        tx.contractor.count({ where: { tenantId } }),
        tx.inspection.count({ where: { tenantId } }),
        tx.finding.count({ where: { tenantId, status: { notIn: ['CLOSED'] } } }),
        tx.correctiveAction.count({ where: { tenantId, status: { notIn: ['CLOSED'] }, dueDate: { lt: new Date() } } }),
        tx.trainingRecord.count({ where: { tenantId } }),
        tx.accident.count({ where: { tenantId } }),
        tx.drill.count({ where: { tenantId } }),
        tx.finding.groupBy({ by: ['riskLevel'], where: { tenantId }, _count: true }),
      ]);

      return {
        employees,
        brigadists,
        contractors,
        inspections,
        findingsOpen,
        actionsOverdue,
        trainingRecords,
        accidents,
        drills,
        findingsByRiskLevel: Object.fromEntries(findingsByRisk.map((f) => [f.riskLevel, f._count])),
      };
    });
  }
}
