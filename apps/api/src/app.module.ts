import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';
import { PrismaModule } from './prisma/prisma.module';
import { BrigadeModule } from './modules/brigade/brigade.module';
import { CorrectiveActionsModule } from './modules/corrective-actions/corrective-actions.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { FindingsModule } from './modules/findings/findings.module';
import { IndicatorsModule } from './modules/indicators/indicators.module';
import { InspectionsModule } from './modules/inspections/inspections.module';
import { SitesModule } from './modules/sites/sites.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
    AuthModule,
    SitesModule,
    EmployeesModule,
    BrigadeModule,
    InspectionsModule,
    FindingsModule,
    CorrectiveActionsModule,
    IndicatorsModule,
  ],
  providers: [
    // Orden: primero autenticación (JWT), luego autorización (permisos).
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
