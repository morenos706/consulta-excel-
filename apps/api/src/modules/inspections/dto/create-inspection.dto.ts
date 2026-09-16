import { IsDateString, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateInspectionDto {
  @IsString()
  templateId!: string;

  @IsString()
  siteId!: string;

  @IsDateString()
  performedAt!: string;

  @IsOptional()
  latitude?: number;

  @IsOptional()
  longitude?: number;

  @IsObject()
  answers!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  observations?: string;
}
