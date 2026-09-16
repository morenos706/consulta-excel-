import { SetMetadata } from '@nestjs/common';
import { PermissionAction } from '@prisma/client';

export const PERMISSION_KEY = 'requiredPermission';

export interface RequiredPermission {
  module: string;
  action: PermissionAction;
}

/**
 * Exige un permiso granular (módulo + acción) del catálogo RBAC, en vez de
 * verificar por nombre de rol — ver docs/ARCHITECTURE.md §6.
 */
export const RequirePermission = (module: string, action: PermissionAction) =>
  SetMetadata(PERMISSION_KEY, { module, action } as RequiredPermission);
