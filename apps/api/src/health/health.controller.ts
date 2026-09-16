import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';

/** Health check del ALB/ECS — sin autenticación y sin tocar la base de datos, para no acoplar la salud del contenedor a la disponibilidad de RDS. */
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  check() {
    return { status: 'ok' };
  }
}
