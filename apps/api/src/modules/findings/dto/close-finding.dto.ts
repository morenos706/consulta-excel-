import { IsString } from 'class-validator';

export class CloseFindingDto {
  @IsString()
  evidenceS3Key!: string;
}
