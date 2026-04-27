import { IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class SnoozeAlertDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  days: number;
}
