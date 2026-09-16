import { Injectable, NotFoundException } from '@nestjs/common';
import { ActionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CorrectiveActionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * `overdue=true` calcula vencidas por `dueDate` en tiempo real en vez de
   * depender de un job que actualice `status` a OVERDUE — evita que el
   * indicador quede desactualizado si el job no corrió (ver Fase 4:
   * un job periódico puede seguir existiendo para notificaciones, pero
   * el estado "vencida" siempre se puede recalcular desde la fecha).
   */
  findAll(tenantId: string, status?: ActionStatus, overdue?: boolean) {
    return this.prisma.forTenant(tenantId, (tx) =>
      tx.correctiveAction.findMany({
        where: {
          tenantId,
          ...(status ? { status } : {}),
          ...(overdue ? { status: { notIn: ['CLOSED'] }, dueDate: { lt: new Date() } } : {}),
        },
        include: { finding: true, responsibleEmployee: true, responsibleUser: true },
        orderBy: { dueDate: 'asc' },
      }),
    );
  }

  async findOne(tenantId: string, id: string) {
    const action = await this.prisma.forTenant(tenantId, (tx) =>
      tx.correctiveAction.findFirst({ where: { id, tenantId }, include: { finding: true } }),
    );
    if (!action) {
      throw new NotFoundException(`Acción correctiva ${id} no encontrada`);
    }
    return action;
  }
}
