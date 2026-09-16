import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(tenantId: string, siteId?: string) {
    return this.prisma.forTenant(tenantId, (tx) =>
      tx.employee.findMany({
        where: { tenantId, deletedAt: null, ...(siteId ? { siteId } : {}) },
        orderBy: { fullName: 'asc' },
      }),
    );
  }

  async findOne(tenantId: string, id: string) {
    const employee = await this.prisma.forTenant(tenantId, (tx) =>
      tx.employee.findFirst({ where: { id, tenantId, deletedAt: null } }),
    );
    if (!employee) {
      throw new NotFoundException(`Trabajador ${id} no encontrado`);
    }
    return employee;
  }

  create(tenantId: string, dto: CreateEmployeeDto) {
    return this.prisma.forTenant(tenantId, (tx) =>
      tx.employee.create({
        data: {
          tenantId,
          siteId: dto.siteId,
          areaId: dto.areaId,
          documentNumber: dto.documentNumber,
          fullName: dto.fullName,
          birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
          position: dto.position,
          employmentType: dto.employmentType,
          hireDate: new Date(dto.hireDate),
          phone: dto.phone,
          emergencyContactName: dto.emergencyContactName,
          emergencyContactPhone: dto.emergencyContactPhone,
          eps: dto.eps,
          arl: dto.arl,
        },
      }),
    );
  }

  async update(tenantId: string, id: string, dto: UpdateEmployeeDto) {
    await this.findOne(tenantId, id);
    return this.prisma.forTenant(tenantId, (tx) =>
      tx.employee.update({
        where: { id },
        data: {
          ...dto,
          birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
          hireDate: dto.hireDate ? new Date(dto.hireDate) : undefined,
        },
      }),
    );
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    // Soft delete: se conserva el historial (formación, EPP, hallazgos
    // asociados) por trazabilidad — ver docs/DATABASE.md §1.
    return this.prisma.forTenant(tenantId, (tx) =>
      tx.employee.update({ where: { id }, data: { deletedAt: new Date(), status: 'INACTIVE' } }),
    );
  }

  /**
   * Pasaporte digital de seguridad (sección 11 del alcance funcional):
   * consolida formación, certificados y EPP asignado de un trabajador.
   */
  async securityPassport(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.forTenant(tenantId, (tx) =>
      tx.employee.findFirst({
        where: { id, tenantId },
        include: {
          trainingRecords: { include: { course: true, certificate: true } },
          ppeAssignments: { include: { ppeItem: true } },
          brigadist: { include: { competencies: { include: { competency: true } }, certificates: true } },
        },
      }),
    );
  }
}
