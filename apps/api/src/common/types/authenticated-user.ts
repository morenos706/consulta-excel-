export interface AuthenticatedUser {
  userId: string;
  tenantId: string;
  email: string;
  fullName: string;
  roleId: string;
  roleName: string;
  /** Lista de permisos concedidos al rol, en formato "modulo:accion". */
  permissions: string[];
}
