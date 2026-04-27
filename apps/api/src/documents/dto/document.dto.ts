import { IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { DocumentType } from '@prisma/client';

export class CreateDocumentDto {
  @IsUUID()
  patientId: string;

  @IsUUID()
  @IsOptional()
  appointmentId?: string;

  @IsEnum(DocumentType)
  type: DocumentType;

  @IsString()
  @MinLength(3)
  title: string;

  @IsString()
  @MinLength(1)
  content: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class UpdateDocumentDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}
