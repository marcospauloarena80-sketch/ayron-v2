import { IsEnum, IsString, IsOptional, IsDateString } from 'class-validator';
import { ProtocolType, ProtocolStatus } from '@prisma/client';

export class CreateProtocolDto {
  @IsString()
  patient_id: string;

  @IsEnum(ProtocolType)
  type: ProtocolType;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  start_date: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsEnum(ProtocolStatus)
  status?: ProtocolStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateProtocolDto {
  @IsOptional()
  @IsEnum(ProtocolStatus)
  status?: ProtocolStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;
}
