import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AuditEntity } from '../../common/decorators/audit-entity.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { BrigadeService } from './brigade.service';
import { CreateBrigadistDto } from './dto/create-brigadist.dto';

@Controller('api/v1/brigadists')
@AuditEntity('Brigadist')
export class BrigadeController {
  constructor(private readonly brigadeService: BrigadeService) {}

  @Get()
  @RequirePermission('brigade', 'VIEW')
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.brigadeService.findAll(user.tenantId);
  }

  @Get(':id/competency-status')
  @RequirePermission('brigade', 'VIEW')
  competencyStatus(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.brigadeService.competencyStatus(user.tenantId, id);
  }

  @Post()
  @RequirePermission('brigade', 'CREATE')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateBrigadistDto) {
    return this.brigadeService.create(user.tenantId, dto);
  }
}
