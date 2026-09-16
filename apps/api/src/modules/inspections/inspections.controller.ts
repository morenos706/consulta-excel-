import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuditEntity } from '../../common/decorators/audit-entity.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { CreateFindingDto } from './dto/create-finding.dto';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { InspectionsService } from './inspections.service';

@ApiTags('Inspecciones')
@ApiBearerAuth()
@Controller('api/v1/inspections')
@AuditEntity('Inspection')
export class InspectionsController {
  constructor(private readonly inspectionsService: InspectionsService) {}

  @Get()
  @RequirePermission('inspections', 'VIEW')
  findAll(@CurrentUser() user: AuthenticatedUser, @Query('siteId') siteId?: string) {
    return this.inspectionsService.findAll(user.tenantId, siteId);
  }

  // Debe declararse antes de ":id" — si no, Nest interpretaria "templates" como un :id.
  @Get('templates')
  @RequirePermission('inspections', 'VIEW')
  listTemplates(@CurrentUser() user: AuthenticatedUser) {
    return this.inspectionsService.listTemplates(user.tenantId);
  }

  @Get(':id')
  @RequirePermission('inspections', 'VIEW')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.inspectionsService.findOne(user.tenantId, id);
  }

  @Post()
  @RequirePermission('inspections', 'CREATE')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateInspectionDto) {
    return this.inspectionsService.create(user.tenantId, user.userId, dto);
  }

  @Post(':id/findings')
  @RequirePermission('findings', 'CREATE')
  addFinding(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: CreateFindingDto) {
    return this.inspectionsService.addFinding(user.tenantId, id, dto);
  }
}
