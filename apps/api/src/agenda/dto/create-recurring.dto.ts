import { IsString, IsDateString, IsEnum, IsOptional, IsBoolean, IsArray, IsInt, Min, Max, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { AppointmentType } from '@prisma/client';

export class CreateRecurringAppointmentsDto {
  @IsString()
  patient_id: string;

  @IsString()
  professional_id: string;

  @IsOptional()
  @IsString()
  service_id?: string;

  @IsEnum(AppointmentType)
  type: AppointmentType;

  /** ISO date (YYYY-MM-DD) — first day of recurrence window */
  @IsDateString()
  start_date: string;

  /** HH:mm — appointment start time of day */
  @IsString()
  time: string;

  /** Duration in minutes */
  @IsInt()
  @Min(5)
  @Max(600)
  @Type(() => Number)
  duration_min: number;

  /** Days of week to schedule on (0=Sunday … 6=Saturday) */
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  weekdays: number[];

  /** Total occurrences to create (alternative to months_count) */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  @Type(() => Number)
  occurrences_count?: number;

  /** Months to span — derives occurrences if occurrences_count not set */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  @Type(() => Number)
  months_count?: number;

  /** Skip every N-th occurrence (1 = every week, 2 = every other week) */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8)
  @Type(() => Number)
  interval_weeks?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  is_telemedicine?: boolean;
}
