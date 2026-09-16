import { EmploymentType } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateEmployeeDto {
  @IsString()
  siteId!: string;

  @IsOptional()
  @IsString()
  areaId?: string;

  @IsString()
  documentNumber!: string;

  @IsString()
  fullName!: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsString()
  position!: string;

  @IsEnum(EmploymentType)
  employmentType!: EmploymentType;

  @IsDateString()
  hireDate!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @IsOptional()
  @IsString()
  emergencyContactPhone?: string;

  @IsOptional()
  @IsString()
  eps?: string;

  @IsOptional()
  @IsString()
  arl?: string;
}
