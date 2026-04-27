import { IsString, IsEnum, IsNumber, IsOptional, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionType, TransactionStatus, PaymentMethod } from '@prisma/client';

export class CreateTransactionDto {
  @IsOptional()
  @IsString()
  patient_id?: string;

  @IsOptional()
  @IsString()
  appointment_id?: string;

  @IsEnum(TransactionType)
  type: TransactionType;

  @IsNumber()
  @Type(() => Number)
  amount: number;

  @IsOptional()
  @IsEnum(PaymentMethod)
  payment_method?: PaymentMethod;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsDateString()
  due_date?: string;
}
