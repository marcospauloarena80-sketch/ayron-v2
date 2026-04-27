import { IsString, IsEmail, IsOptional, IsDateString, IsEnum, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';
import { PatientStatus, PatientTag } from '@prisma/client';

export class CreatePatientDto {
  @IsString()
  full_name: string;

  @IsDateString()
  birth_date: string;

  @IsString()
  sex: string;

  @IsOptional()
  @Transform(({ value }) => value?.replace(/\D/g, '') || undefined)
  @IsString()
  cpf?: string;

  @IsOptional()
  @IsString()
  rg?: string;

  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  @IsString()
  foreign_doc_type?: string;

  @IsOptional()
  @IsString()
  foreign_doc_number?: string;

  @Transform(({ value }) => value?.replace(/\D/g, ''))
  @IsString()
  phone: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  address?: Record<string, any>;

  @IsOptional()
  insurance?: Record<string, any>;

  @IsOptional()
  preferences?: Record<string, any>;

  @IsOptional()
  @IsEnum(PatientStatus)
  current_status?: PatientStatus;

  @IsOptional()
  @IsArray()
  @IsEnum(PatientTag, { each: true })
  tags?: PatientTag[];

  @IsOptional()
  @IsString()
  notes?: string;
}
