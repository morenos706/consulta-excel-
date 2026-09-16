import { ActionPriority, RiskLevel } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class CorrectiveActionInputDto {
  @IsString()
  description!: string;

  @IsEnum(ActionPriority)
  priority!: ActionPriority;

  @IsOptional()
  @IsString()
  responsibleEmployeeId?: string;

  @IsOptional()
  @IsString()
  responsibleUserId?: string;

  @IsDateString()
  dueDate!: string;
}

/**
 * Registrar un hallazgo dentro de una inspección crea, en la misma
 * operación, su acción correctiva — así el flujo
 * inspección → hallazgo → acción correctiva (docs/ARCHITECTURE.md §8)
 * queda garantizado por el backend y no depende de que el frontend
 * recuerde hacer una segunda llamada.
 */
export class CreateFindingDto {
  @IsString()
  description!: string;

  @IsString()
  category!: string;

  @IsOptional()
  @IsString()
  hazard?: string;

  @IsEnum(RiskLevel)
  riskLevel!: RiskLevel;

  @IsOptional()
  @IsString()
  photoS3Key?: string;

  @IsOptional()
  latitude?: number;

  @IsOptional()
  longitude?: number;

  @ValidateNested()
  @Type(() => CorrectiveActionInputDto)
  correctiveAction!: CorrectiveActionInputDto;
}
