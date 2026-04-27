import { IsOptional, IsString, IsNumber, IsBoolean, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePatientMetricsDto {
  @IsString()
  patient_id: string;

  @IsOptional()
  @IsString()
  appointment_id?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(600)
  weight_kg?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(300)
  height_cm?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(100)
  body_fat_pct?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  lean_mass_kg?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(300)
  waist_cm?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  bp_systolic?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  bp_diastolic?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  heart_rate?: number;

  @IsOptional()
  @IsBoolean()
  is_bioimpedance?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
