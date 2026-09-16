import { IsOptional, IsString } from 'class-validator';

export class CreateBrigadistDto {
  @IsString()
  employeeId!: string;

  @IsOptional()
  @IsString()
  group?: string;
}
