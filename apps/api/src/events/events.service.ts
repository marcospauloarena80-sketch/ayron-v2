import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

export type EmitEventParams = {
  clinic_id: string;
  event_type: string;
  entity_type?: string;
  entity_id?: string;
  actor_id?: string;
  payload?: Record<string, unknown>;
  event_version?: string;
};

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async emit(params: EmitEventParams): Promise<void> {
    await this.prisma.event.create({
      data: {
        clinic_id: params.clinic_id,
        event_type: params.event_type,
        event_version: params.event_version ?? '1.0',
        entity_type: params.entity_type,
        entity_id: params.entity_id,
        actor_id: params.actor_id,
        payload: (params.payload ?? {}) as any,
      },
    });
  }
}
