import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../common/types/authenticated-user';

/**
 * Verifica el JWT y resuelve el usuario autenticado.
 *
 * `AUTH_MODE=cognito` (producción/AWS): valida tokens emitidos por el
 * User Pool de Amazon Cognito usando su JWKS público — nunca un secreto
 * compartido. `AUTH_MODE=dev` (por defecto fuera de producción): valida
 * tokens firmados localmente por AuthService, para poder desarrollar y
 * probar sin depender de un User Pool real. Cambiar de uno a otro es una
 * variable de entorno, no una reescritura (ver docs/API.md §4).
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super(JwtStrategy.buildOptions(config));
  }

  // `super()` debe ser la primera sentencia del constructor (regla de
  // TypeScript), así que la decisión dev/Cognito se resuelve en un método
  // estático antes de invocarlo, en vez de con un if/else dentro del
  // constructor.
  private static buildOptions(config: ConfigService) {
    const authMode = config.get<string>('AUTH_MODE', 'dev');

    if (authMode === 'cognito') {
      const region = config.getOrThrow<string>('AWS_REGION');
      const userPoolId = config.getOrThrow<string>('COGNITO_USER_POOL_ID');
      const issuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
      return {
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        ignoreExpiration: false,
        issuer,
        algorithms: ['RS256'],
        secretOrKeyProvider: passportJwtSecret({
          cache: true,
          rateLimit: true,
          jwksRequestsPerMinute: 5,
          jwksUri: `${issuer}/.well-known/jwks.json`,
        }),
      };
    }

    return {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('DEV_JWT_SECRET', 'dev-secret-change-me'),
      algorithms: ['HS256'],
    };
  }

  async validate(payload: { sub: string }): Promise<AuthenticatedUser> {
    // Única consulta del sistema que deliberadamente NO pasa por
    // `prisma.forTenant(...)`: en este punto el tenant todavía no se
    // conoce (es justamente lo que esta consulta resuelve a partir del
    // JWT ya verificado). En producción, el rol de base de datos de la
    // aplicación no debe tener BYPASSRLS de forma general; esta
    // resolución de identidad debe exponerse mediante una función
    // `SECURITY DEFINER` estrecha (solo id/tenantId/roleId) en vez de
    // depender de un bypass amplio — ver docs/SECURITY.md §1.
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: { include: { rolePermissions: { include: { permission: true } } } } },
    });

    if (!user || user.status !== 'ACTIVE' || user.deletedAt) {
      throw new UnauthorizedException('Usuario inválido o inactivo');
    }

    return {
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      fullName: user.fullName,
      roleId: user.roleId,
      roleName: user.role.name,
      permissions: user.role.rolePermissions.map((rp) => `${rp.permission.module}:${rp.permission.action}`),
    };
  }
}
