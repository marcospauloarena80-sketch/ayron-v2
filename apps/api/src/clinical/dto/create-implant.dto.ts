import { IsString, IsOptional, IsDateString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateImplantDto {
  @IsString()
  patient_id: string;

  @IsOptional()
  @IsString()
  appointment_id?: string;

  @IsString()
  hormone_type: string;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  dosage_mg: number;

  @IsDateString()
  application_date: string;

  @IsOptional()
  @IsString()
  lot_number?: string;

  @IsOptional()
  @IsDateString()
  next_change_date?: string;

  @IsOptional()
  @IsString()
  site?: string;

  @IsOptional()
  @IsString()
  observations?: string;
}
