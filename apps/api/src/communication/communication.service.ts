import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';

@Injectable()
export class CommunicationService {
  constructor(private prisma: PrismaService) {}

  getChannels(clinicId: string) {
    return this.prisma.communicationChannel.findMany({ where: { clinic_id: clinicId, is_active: true } });
  }

  getMessages(clinicId: string, channelId: string) {
    return this.prisma.communicationMessage.findMany({
      where: { channel_id: channelId, clinic_id: clinicId, deleted_at: null },
      include: { sender: { select: { id: true, name: true, role: true } } },
      orderBy: { created_at: 'asc' },
      take: 100,
    });
  }

  async sendMessage(clinicId: string, senderId: string, dto: CreateMessageDto) {
    const channel = await this.prisma.communicationChannel.findFirst({ where: { id: dto.channel_id, clinic_id: clinicId } });
    if (!channel) throw new NotFoundException('Channel not found');
    return this.prisma.communicationMessage.create({
      data: { channel_id: dto.channel_id, clinic_id: clinicId, sender_id: senderId, content: dto.content, priority: dto.priority ?? 'NORMAL' },
      include: { sender: { select: { id: true, name: true, role: true } } },
    });
  }

  async markRead(clinicId: string, messageId: string) {
    return this.prisma.communicationMessage.update({ where: { id: messageId }, data: { is_read: true, read_at: new Date() } });
  }

  async createChannel(clinicId: string, name: string, type: any) {
    return this.prisma.communicationChannel.create({ data: { clinic_id: clinicId, name, type } });
  }

  getTemplates(clinicId: string) {
    return this.prisma.messageTemplate.findMany({ where: { clinic_id: clinicId, is_active: true } });
  }
}
