import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FindingsService } from './findings.service';

/**
 * Prueba la máquina de estados del cierre de hallazgos
 * (OPEN → PENDING_VERIFICATION → CLOSED, ver docs/ARCHITECTURE.md §8)
 * con un PrismaService simulado, sin depender de una base de datos real.
 */
describe('FindingsService', () => {
  const tenantId = 'tenant-1';
  const findingId = 'finding-1';

  let tx: {
    finding: { findFirst: jest.Mock; update: jest.Mock };
    correctiveAction: { updateMany: jest.Mock };
  };
  let prisma: { forTenant: jest.Mock };
  let service: FindingsService;

  beforeEach(() => {
    tx = {
      finding: { findFirst: jest.fn(), update: jest.fn() },
      correctiveAction: { updateMany: jest.fn() },
    };
    prisma = { forTenant: jest.fn((_tenantId: string, fn: any) => fn(tx)) };
    service = new FindingsService(prisma as any);
  });

  describe('findOne', () => {
    it('lanza NotFoundException si el hallazgo no existe en el tenant', async () => {
      tx.finding.findFirst.mockResolvedValue(null);
      await expect(service.findOne(tenantId, findingId)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('submitClosureEvidence', () => {
    it('rechaza subir evidencia si el hallazgo ya está cerrado', async () => {
      tx.finding.findFirst.mockResolvedValue({ id: findingId, status: 'CLOSED' });
      await expect(
        service.submitClosureEvidence(tenantId, findingId, { evidenceS3Key: 'x.jpg' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(tx.correctiveAction.updateMany).not.toHaveBeenCalled();
    });

    it('mueve el hallazgo y su acción correctiva a PENDING_VERIFICATION', async () => {
      tx.finding.findFirst.mockResolvedValue({ id: findingId, status: 'OPEN' });
      tx.finding.update.mockResolvedValue({ id: findingId, status: 'PENDING_VERIFICATION' });

      const result = await service.submitClosureEvidence(tenantId, findingId, { evidenceS3Key: 'x.jpg' });

      expect(tx.correctiveAction.updateMany).toHaveBeenCalledWith({
        where: { findingId },
        data: { status: 'PENDING_VERIFICATION', closureEvidenceS3Key: 'x.jpg' },
      });
      expect(tx.finding.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: findingId }, data: { status: 'PENDING_VERIFICATION' } }),
      );
      expect(result.status).toBe('PENDING_VERIFICATION');
    });
  });

  describe('verifyAndClose', () => {
    it('rechaza cerrar un hallazgo que no está en verificación', async () => {
      tx.finding.findFirst.mockResolvedValue({ id: findingId, status: 'OPEN' });
      await expect(service.verifyAndClose(tenantId, findingId)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('cierra el hallazgo y su acción correctiva cuando está pendiente de verificación', async () => {
      tx.finding.findFirst.mockResolvedValue({ id: findingId, status: 'PENDING_VERIFICATION' });
      tx.finding.update.mockResolvedValue({ id: findingId, status: 'CLOSED' });

      const result = await service.verifyAndClose(tenantId, findingId);

      expect(tx.correctiveAction.updateMany).toHaveBeenCalledWith({
        where: { findingId },
        data: { status: 'CLOSED', verifiedAt: expect.any(Date) },
      });
      expect(result.status).toBe('CLOSED');
    });
  });
});
