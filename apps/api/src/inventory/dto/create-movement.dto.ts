import { IsString, IsEnum, IsInt, IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { InventoryMovementType } from '@prisma/client';

export class CreateMovementDto {
  @IsString()
  item_id: string;

  @IsEnum(InventoryMovementType)
  type: InventoryMovementType;

  @IsInt()
  @Type(() => Number)
  quantity: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  unit_cost?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  ocr_data?: Record<string, any>;
}
