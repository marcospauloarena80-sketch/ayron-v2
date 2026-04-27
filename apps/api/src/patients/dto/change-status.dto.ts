import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PatientStatus } from '@prisma/client';

export class ChangeStatusDto {
  @IsEnum(PatientStatus)
  status: PatientStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}
