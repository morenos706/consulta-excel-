import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

/**
 * Wrapper sobre PrismaClient que centraliza el aislamiento multi-tenant.
 *
 * La base de datos tiene Row-Level Security habilitada por `tenantId`
 * (ver apps/api/prisma/migrations/*_enable_row_level_security y
 * docs/SECURITY.md §1). Esa política solo se aplica dentro de la misma
 * sesión de Postgres en la que se ejecutó `set_config`, así que toda
 * consulta de negocio debe pasar por `forTenant`, que fija la variable de
 * sesión y ejecuta el callback dentro de la MISMA transacción/conexión.
 *
 * Ningún servicio de módulo debe usar `this.prisma.<model>` directamente
 * para datos de un tenant: siempre a través de `forTenant(tenantId, ...)`.
 * Esto es la segunda barrera (defensa en profundidad); el filtro explícito
 * por tenantId en cada query sigue siendo obligatorio en el código.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async forTenant<T>(tenantId: string, fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    if (!tenantId) {
      throw new Error('forTenant() requiere un tenantId — nunca se debe consultar sin contexto de tenant.');
    }
    return this.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
      return fn(tx);
    });
  }
}
