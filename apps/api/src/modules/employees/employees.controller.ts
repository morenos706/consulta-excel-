import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { AuditEntity } from '../../common/decorators/audit-entity.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeesService } from './employees.service';

@Controller('api/v1/employees')
@AuditEntity('Employee')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  @RequirePermission('employees', 'VIEW')
  findAll(@CurrentUser() user: AuthenticatedUser, @Query('siteId') siteId?: string) {
    return this.employeesService.findAll(user.tenantId, siteId);
  }

  @Get(':id')
  @RequirePermission('employees', 'VIEW')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.employeesService.findOne(user.tenantId, id);
  }

  @Get(':id/security-passport')
  @RequirePermission('employees', 'VIEW')
  securityPassport(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.employeesService.securityPassport(user.tenantId, id);
  }

  @Post()
  @RequirePermission('employees', 'CREATE')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(user.tenantId, dto);
  }

  @Patch(':id')
  @RequirePermission('employees', 'EDIT')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.employeesService.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermission('employees', 'DELETE')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.employeesService.remove(user.tenantId, id);
  }
}
