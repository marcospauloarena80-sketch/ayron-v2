import { IsString, IsDateString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { AppointmentType } from '@prisma/client';

export class CreateAppointmentDto {
  @IsString()
  patient_id: string;

  @IsString()
  professional_id: string;

  @IsOptional()
  @IsString()
  service_id?: string;

  @IsEnum(AppointmentType)
  type: AppointmentType;

  @IsDateString()
  start_time: string;

  @IsDateString()
  end_time: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  is_telemedicine?: boolean;
}
