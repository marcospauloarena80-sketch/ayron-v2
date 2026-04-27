import { IsString, IsDateString, IsOptional, IsArray, ValidateNested, IsNumber, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ExamMarkerStatus } from '@prisma/client';

export class CreateExamMarkerDto {
  @IsString()
  marker_name: string;

  @IsOptional()
  @IsString()
  standardized_name?: string;

  @IsNumber()
  @Type(() => Number)
  value: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  ideal_min?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  ideal_max?: number;

  @IsEnum(ExamMarkerStatus)
  status: ExamMarkerStatus;

  @IsOptional()
  @IsString()
  trend?: string;
}

export class CreateExamDto {
  @IsString()
  patient_id: string;

  @IsDateString()
  exam_date: string;

  @IsOptional()
  @IsString()
  laboratory?: string;

  @IsOptional()
  @IsString()
  file_url?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateExamMarkerDto)
  markers?: CreateExamMarkerDto[];
}
