import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Catálogo de sedes/áreas: datos de referencia de solo lectura que
 * alimentan los formularios de otros módulos (trabajadores, hallazgos,
 * etc.). No tiene un permiso RBAC propio todavía — cualquier usuario
 * autenticado del tenant puede leerlo (ver SitesController). Cuando el
 * módulo de gestión de sedes (crear/editar sede) se implemente, esto se
 * amplía con su propio catálogo de permisos "sites:*".
 */
@Injectable()
export class SitesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(tenantId: string) {
    return this.prisma.forTenant(tenantId, (tx) =>
      tx.site.findMany({
        where: { tenantId },
        include: { areas: true },
        orderBy: { name: 'asc' },
      }),
    );
  }
}
