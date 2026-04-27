import { IsString, IsOptional } from 'class-validator';

export class CreateClinicalRecordDto {
  @IsString()
  patient_id: string;

  @IsOptional()
  @IsString()
  appointment_id?: string;

  @IsOptional()
  @IsString()
  transcription?: string;

  @IsOptional()
  structured_data?: Record<string, any>;

  @IsOptional()
  @IsString()
  summary_ai?: string;

  @IsOptional()
  @IsString()
  voice_file_url?: string;
}
