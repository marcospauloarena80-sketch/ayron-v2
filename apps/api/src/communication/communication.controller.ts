import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CommunicationService } from './communication.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';

@ApiTags('Communication')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('communication')
export class CommunicationController {
  constructor(private readonly service: CommunicationService) {}

  @Get('channels') getChannels(@CurrentUser() u: RequestUser) { return this.service.getChannels(u.clinic_id); }
  @Get('channels/:channelId/messages') getMessages(@CurrentUser() u: RequestUser, @Param('channelId') id: string) { return this.service.getMessages(u.clinic_id, id); }
  @Get('templates') getTemplates(@CurrentUser() u: RequestUser) { return this.service.getTemplates(u.clinic_id); }
  @Post('messages') send(@CurrentUser() u: RequestUser, @Body() dto: CreateMessageDto) { return this.service.sendMessage(u.clinic_id, u.sub, dto); }
  @Patch('messages/:id/read') markRead(@CurrentUser() u: RequestUser, @Param('id') id: string) { return this.service.markRead(u.clinic_id, id); }
}
