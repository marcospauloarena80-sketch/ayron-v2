import { IsEnum, IsOptional, IsString } from 'class-validator';

export class AddWaitlistActionDto {
  @IsEnum(['high', 'normal'])
  priority: 'high' | 'normal' = 'normal';

  @IsString()
  @IsOptional()
  reason?: string;
}
