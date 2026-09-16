import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { SitesService } from './sites.service';

@ApiTags('Sedes')
@ApiBearerAuth()
@Controller('api/v1/sites')
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.sitesService.findAll(user.tenantId);
  }
}
