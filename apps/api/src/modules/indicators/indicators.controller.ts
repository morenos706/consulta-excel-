import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { IndicatorsService } from './indicators.service';

@ApiTags('Indicadores')
@ApiBearerAuth()
@Controller('api/v1/indicators')
export class IndicatorsController {
  constructor(private readonly indicatorsService: IndicatorsService) {}

  @Get('dashboard')
  @RequirePermission('dashboard', 'VIEW')
  dashboardSummary(@CurrentUser() user: AuthenticatedUser) {
    return this.indicatorsService.dashboardSummary(user.tenantId);
  }
}
