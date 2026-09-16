import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

/**
 * Autenticación de desarrollo. Amazon Cognito es el proveedor de
 * identidad real (ver docs/ARCHITECTURE.md §3): gestiona contraseñas,
 * MFA y emisión de tokens en producción. Este servicio NO reemplaza a
 * Cognito — solo permite emitir un JWT con la misma forma para poder
 * desarrollar y probar los módulos de negocio sin un User Pool real.
 *
 * Se deshabilita solo con configurar AUTH_MODE=cognito (ver
 * JwtStrategy), momento en el que el frontend debe autenticar contra
 * Cognito Hosted UI / SDK directamente y este endpoint deja de usarse.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async devLogin(dto: LoginDto) {
    if (this.config.get<string>('AUTH_MODE', 'dev') === 'cognito') {
      throw new UnauthorizedException('AUTH_MODE=cognito: autenticar contra Amazon Cognito, no contra este endpoint.');
    }

    const expectedSecret = this.config.get<string>('DEV_LOGIN_SECRET', 'demo123');
    if (dto.devSecret !== expectedSecret) {
      throw new UnauthorizedException('Credenciales de desarrollo inválidas');
    }

    // Búsqueda de identidad: ver el comentario en JwtStrategy.validate
    // sobre por qué esta consulta no pasa por prisma.forTenant().
    const user = await this.prisma.user.findFirst({ where: { email: dto.email, deletedAt: null } });
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Usuario no encontrado o inactivo');
    }

    const accessToken = await this.jwt.signAsync({ sub: user.id });
    return { accessToken, expiresIn: 3600 };
  }
}
