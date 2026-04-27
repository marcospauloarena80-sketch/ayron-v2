import { IsNumber, IsString, Min } from 'class-validator';

export class CreateChargeActionDto {
  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  description: string;
}
