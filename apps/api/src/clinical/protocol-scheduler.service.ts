import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { ProtocolFrequency } from '@prisma/client';

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function nextOccurrence(from: Date, freq: ProtocolFrequency): Date {
  const map: Record<ProtocolFrequency, number> = {
    DAILY: 1, WEEKLY: 7, BIWEEKLY: 14, MONTHLY: 30, SEMIANNUAL: 182, ANNUAL: 365,
  };
  return addDays(from, map[freq] ?? 7);
}

function getPreferredSlot(base: Date, preferredWeekday?: number | null, preferredTime?: string | null): Date {
  const d = new Date(base);
  if (preferredWeekday != null) {
    const diff = (preferredWeekday - d.getDay() + 7) % 7;
    d.setDate(d.getDate() + diff);
  }
  if (preferredTime) {
    const [hh, mm] = preferredTime.split(':').map(Number);
    d.setHours(hh ?? 9, mm ?? 0, 0, 0);
  } else {
    d.setHours(9, 0, 0, 0);
  }
  return d;
}

@Injectable()
export class ProtocolSchedulerService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async generateProtocolSlots(clinicId: string, protocolId: string, dto: {
    professional_id: string;
    service_id?: string;
    duration_min?: number;
    start_date?: string;
  }, actorId: string) {
    const protocol = await this.prisma.treatmentProtocol.findFirst({
      where: { id: protocolId, clinic_id: clinicId },
    });
    if (!protocol) throw new NotFoundException('Protocolo não encontrado');
    if (!protocol.total_sessions || !protocol.frequency) {
      throw new BadRequestException('Protocolo sem total_sessions ou frequency definidos');
    }

    const startDate = dto.start_date ? new Date(dto.start_date) : (protocol.start_date ?? new Date());
    const durationMin = dto.duration_min ?? 30;
    const conflicts: any[] = [];
    const created: any[] = [];
    let current = getPreferredSlot(startDate, protocol.preferred_weekday, protocol.preferred_time);

    for (let i = 0; i < protocol.total_sessions; i++) {
      const slotEnd = new Date(current.getTime() + durationMin * 60 * 1000);

      const conflict = await this.prisma.appointment.findFirst({
        where: {
          clinic_id: clinicId,
          professional_id: dto.professional_id,
          deleted_at: null,
          status: { notIn: ['CANCELLED', 'MISSED'] },
          start_time: { lt: slotEnd },
          end_time: { gt: current },
        },
      });

      if (conflict) {
        conflicts.push({ session: i + 1, start_time: current, conflict_id: conflict.id });
      } else {
        const appt = await this.prisma.appointment.create({
          data: {
            clinic_id: clinicId,
            patient_id: protocol.patient_id,
            professional_id: dto.professional_id,
            service_id: dto.service_id,
            start_time: current,
            end_time: slotEnd,
            status: 'SCHEDULED',
            protocol_id: protocolId,
            kanban_stage: 'AGENDADO',
            notes: `Protocolo ${protocol.name ?? ''} — sessão ${i + 1}/${protocol.total_sessions}`,
          },
        });
        created.push(appt);
      }

      current = getPreferredSlot(nextOccurrence(current, protocol.frequency as ProtocolFrequency), protocol.preferred_weekday, protocol.preferred_time);
    }

    await this.audit.log({
      clinic_id: clinicId, actor_id: actorId, action: 'CREATE' as any,
      entity_type: 'TreatmentProtocol', entity_id: protocolId,
      metadata: { sessions_created: created.length, conflicts: conflicts.length },
    });

    return {
      protocol_id: protocolId,
      sessions_requested: protocol.total_sessions,
      sessions_created: created.length,
      conflicts_found: conflicts.length,
      conflicts,
      created: created.map(a => ({ id: a.id, start_time: a.start_time })),
    };
  }

  async getProtocolSessions(clinicId: string, protocolId: string) {
    return this.prisma.appointment.findMany({
      where: { clinic_id: clinicId, protocol_id: protocolId, deleted_at: null },
      orderBy: { start_time: 'asc' },
      include: {
        patient: { select: { id: true, full_name: true } },
        professional: { select: { id: true, name: true } },
      },
    });
  }
}
