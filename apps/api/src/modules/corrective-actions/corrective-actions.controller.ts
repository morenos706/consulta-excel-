import { Controller, Get, Param, Query } from '@nestjs/common';
import { ActionStatus } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { CorrectiveActionsService } from './corrective-actions.service';

@Controller('api/v1/corrective-actions')
export class CorrectiveActionsController {
  constructor(private readonly correctiveActionsService: CorrectiveActionsService) {}

  @Get()
  @RequirePermission('findings', 'VIEW')
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: ActionStatus,
    @Query('overdue') overdue?: string,
  ) {
    return this.correctiveActionsService.findAll(user.tenantId, status, overdue === 'true');
  }

  @Get(':id')
  @RequirePermission('findings', 'VIEW')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.correctiveActionsService.findOne(user.tenantId, id);
  }
}
