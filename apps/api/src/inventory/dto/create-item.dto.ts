import { IsString, IsOptional, IsInt, IsNumber, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateItemDto {
  @IsString()
  name: string;

  @IsOptional() @IsString() technical_name?: string;
  @IsOptional() @IsString() internal_code?: string;
  @IsOptional() @IsString() qr_code?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() subcategory?: string;
  @IsOptional() @IsString() manufacturer?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @IsString() barcode?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() storage_sector?: string;
  @IsOptional() @IsString() batch_number?: string;
  @IsOptional() @IsString() expiry_date?: string;
  @IsOptional() @IsString() photo_url?: string;
  @IsOptional() @IsString() supplier_id?: string;
  @IsOptional() @IsString() secondary_supplier_id?: string;
  @IsOptional() @IsEnum(['ACTIVE', 'BLOCKED', 'EXPIRED']) status?: string;

  @IsOptional() @IsInt() @Type(() => Number) quantity?: number;
  @IsOptional() @IsInt() @Type(() => Number) minimum_level?: number;
  @IsOptional() @IsInt() @Type(() => Number) ideal_stock?: number;
  @IsOptional() @IsInt() @Type(() => Number) max_stock?: number;
  @IsOptional() @IsInt() @Type(() => Number) lead_time_days?: number;

  @IsOptional() @IsNumber() @Type(() => Number) unit_cost?: number;
  @IsOptional() @IsNumber() @Type(() => Number) temperature_min?: number;
  @IsOptional() @IsNumber() @Type(() => Number) temperature_max?: number;
}
