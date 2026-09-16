import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
import { AUDIT_ENTITY_KEY } from '../decorators/audit-entity.decorator';
import { AuthenticatedUser } from '../types/authenticated-user';

const MUTATING_METHODS = ['POST', 'PATCH', 'PUT', 'DELETE'];

/**
 * Registra en AuditLog toda mutación de un módulo marcado con
 * @AuditEntity(...) — ver docs/SECURITY.md §5. No reemplaza la revisión de
 * negocio de cada módulo, solo garantiza que "quién hizo qué, cuándo, con
 * qué IP" quede registrado de forma consistente en toda la API.
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const entityType = this.reflector.getAllAndOverride<string | undefined>(AUDIT_ENTITY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!entityType || !MUTATING_METHODS.includes(request.method)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap((result: any) => {
        const user: AuthenticatedUser | undefined = request.user;
        if (!user) return;

        const entityId = result?.id ?? request.params?.id ?? 'unknown';
        this.prisma
          .forTenant(user.tenantId, (tx) =>
            tx.auditLog.create({
              data: {
                tenantId: user.tenantId,
                userId: user.userId,
                action: request.method,
                entityType,
                entityId,
                ipAddress: request.ip,
              },
            }),
          )
          .catch(() => {
            // El audit log nunca debe romper la respuesta al usuario; un
            // fallo aquí se reporta a CloudWatch en producción (Fase 8).
          });
      }),
    );
  }
}
