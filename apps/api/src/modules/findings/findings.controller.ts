import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { FindingStatus } from '@prisma/client';
import { AuditEntity } from '../../common/decorators/audit-entity.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { CloseFindingDto } from './dto/close-finding.dto';
import { FindingsService } from './findings.service';

@Controller('api/v1/findings')
@AuditEntity('Finding')
export class FindingsController {
  constructor(private readonly findingsService: FindingsService) {}

  @Get()
  @RequirePermission('findings', 'VIEW')
  findAll(@CurrentUser() user: AuthenticatedUser, @Query('status') status?: FindingStatus) {
    return this.findingsService.findAll(user.tenantId, status);
  }

  @Get(':id')
  @RequirePermission('findings', 'VIEW')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.findingsService.findOne(user.tenantId, id);
  }

  @Patch(':id/closure-evidence')
  @RequirePermission('findings', 'EDIT')
  submitClosureEvidence(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: CloseFindingDto) {
    return this.findingsService.submitClosureEvidence(user.tenantId, id, dto);
  }

  @Patch(':id/verify')
  @RequirePermission('findings', 'APPROVE')
  verifyAndClose(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.findingsService.verifyAndClose(user.tenantId, id);
  }
}
