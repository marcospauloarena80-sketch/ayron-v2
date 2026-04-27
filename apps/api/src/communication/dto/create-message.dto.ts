import { IsString, IsEnum, IsOptional } from 'class-validator';
import { MessagePriority } from '@prisma/client';

export class CreateMessageDto {
  @IsString()
  channel_id: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsEnum(MessagePriority)
  priority?: MessagePriority;
}
