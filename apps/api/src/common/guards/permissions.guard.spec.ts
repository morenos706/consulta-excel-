import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';

function buildContext(user: any): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('PermissionsGuard', () => {
  it('permite el acceso si el endpoint no declaró ningún permiso requerido', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(undefined) } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);
    expect(guard.canActivate(buildContext({ permissions: [] }))).toBe(true);
  });

  it('deniega el acceso si el usuario no tiene el permiso exacto módulo:acción', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue({ module: 'employees', action: 'DELETE' }),
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);
    const context = buildContext({ permissions: ['employees:VIEW', 'employees:CREATE'] });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('permite el acceso si el usuario tiene el permiso exacto módulo:acción', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue({ module: 'employees', action: 'DELETE' }),
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);
    const context = buildContext({ permissions: ['employees:DELETE'] });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('deniega el acceso si no hay usuario autenticado en el request', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue({ module: 'employees', action: 'VIEW' }),
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);
    expect(() => guard.canActivate(buildContext(undefined))).toThrow(ForbiddenException);
  });
});
