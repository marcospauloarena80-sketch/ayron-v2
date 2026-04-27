import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateProfessionalDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  specialty?: string;

  @IsOptional()
  @IsString()
  crm?: string;

  @IsOptional()
  @IsString()
  crm_state?: string;

  @IsOptional()
  @IsString()
  user_id?: string;
}
