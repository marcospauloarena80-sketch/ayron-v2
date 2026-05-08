import { Injectable, NotFoundException, BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { EventsService } from '../events/events.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { AppointmentStatus, UserRole } from '@prisma/client';

@Injectable()
export class AgendaService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private events: EventsService,
  ) {}

  findAll(clinicId: string, filters?: {
    date?: string; professional_id?: string; status?: AppointmentStatus;
    patient_id?: string; actor_role?: string; actor_professional_id?: string;
    search?: string; kanban_stage?: string;
  }) {
    const where: any = { clinic_id: clinicId, deleted_at: null };
    if (filters?.professional_id) where.professional_id = filters.professional_id;
    else if (filters?.actor_role === 'MEDICO' && filters?.actor_professional_id) {
      where.professional_id = filters.actor_professional_id;
    }
    if (filters?.status) where.status = filters.status;
    if (filters?.patient_id) where.patient_id = filters.patient_id;
    if (filters?.kanban_stage) where.kanban_stage = filters.kanban_stage;
    if (filters?.date) {
      const d = new Date(filters.date);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      where.start_time = { gte: d, lt: next };
    }
    if (filters?.search) {
      where.OR = [
        { patient: { full_name: { contains: filters.search, mode: 'insensitive' } } },
        { patient: { email: { contains: filters.search, mode: 'insensitive' } } },
        { notes: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.appointment.findMany({
      where,
      include: {
        patient: { select: { id: true, full_name: true, phone: true } },
        professional: { select: { id: true, name: true, specialty: true } },
        service: { select: { id: true, name: true, duration_min: true, price: true } },
        receivables: { where: { deleted_at: null }, select: { id: true, status: true, total_amount: true, paid_amount: true } },
      },
      orderBy: { start_time: 'asc' },
    });
  }

  async findOne(clinicId: string, id: string) {
    const appt = await this.prisma.appointment.findFirst({
      where: { id, clinic_id: clinicId, deleted_at: null },
      include: {
        patient: true,
        professional: { include: { user: { select: { name: true, email: true } } } },
        service: true,
        clinical_records: { orderBy: { created_at: 'desc' }, take: 1 },
        patient_metrics: { orderBy: { created_at: 'desc' }, take: 1 },
        transactions: { where: { deleted_at: null } },
      },
    }) as any;
    if (!appt) throw new NotFoundException('Appointment not found');
    return appt;
  }

  async create(clinicId: string, dto: CreateAppointmentDto, actorId: string) {
    const conflict = await this.prisma.appointment.findFirst({
      where: {
        clinic_id: clinicId,
        professional_id: dto.professional_id,
        deleted_at: null,
        status: { notIn: ['CANCELLED', 'MISSED', 'RESCHEDULED'] },
        AND: [
          { start_time: { lt: new Date(dto.end_time) } },
          { end_time: { gt: new Date(dto.start_time) } },
        ],
      },
    });
    if (conflict) {
      throw new ConflictException(
        `Conflito de agenda: profissional já possui agendamento das ${new Date(conflict.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} às ${new Date(conflict.end_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} neste horário.`,
      );
    }
    const appt = await this.prisma.appointment.create({
      data: {
        clinic_id: clinicId,
        patient_id: dto.patient_id,
        professional_id: dto.professional_id,
        service_id: dto.service_id,
        type: dto.type,
        status: 'SCHEDULED',
        start_time: new Date(dto.start_time),
        end_time: new Date(dto.end_time),
        notes: dto.notes,
        is_telemedicine: dto.is_telemedicine ?? false,
      },
      include: { patient: { select: { full_name: true } }, service: { select: { name: true } } },
    });
    await Promise.all([
      this.audit.log({ clinic_id: clinicId, actor_id: actorId, action: 'CREATE', entity_type: 'Appointment', entity_id: appt.id }),
      this.events.emit({ clinic_id: clinicId, event_type: 'appointment.scheduled', entity_type: 'Appointment', entity_id: appt.id, actor_id: actorId }),
    ]);
    return appt;
  }

  async update(clinicId: string, id: string, dto: UpdateAppointmentDto, actorId: string) {
    await this.findOne(clinicId, id);
    const data: any = { ...dto };
    if (dto.start_time) data.start_time = new Date(dto.start_time);
    if (dto.end_time) data.end_time = new Date(dto.end_time);
    const updated = await this.prisma.appointment.update({ where: { id }, data });
    await this.audit.log({ clinic_id: clinicId, actor_id: actorId, action: 'UPDATE', entity_type: 'Appointment', entity_id: id });
    return updated;
  }

  async checkIn(clinicId: string, id: string, actorId: string) {
    const appt = await this.findOne(clinicId, id);
    if (!['SCHEDULED', 'CONFIRMED'].includes(appt.status)) throw new BadRequestException('Cannot check-in from current status');
    const updated = await this.prisma.appointment.update({
      where: { id },
      data: { status: 'CHECKED_IN', checked_in_at: new Date() },
    });
    await this.events.emit({ clinic_id: clinicId, event_type: 'checkin.completed', entity_type: 'Appointment', entity_id: id, actor_id: actorId });
    return updated;
  }

  async checkOut(clinicId: string, id: string, actorId: string) {
    const appt = await this.findOne(clinicId, id);
    if (!['CHECKED_IN', 'IN_PROGRESS'].includes(appt.status)) throw new BadRequestException('Cannot check-out from current status');

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: { status: 'COMPLETED', checked_out_at: new Date() },
    });

    // Auto-create charge if service has a price and no existing PENDING charge for this appointment
    let chargeCreated = false;
    let transaction: any = null;

    if (appt.service && Number(appt.service.price) > 0) {
      const existingCharge = await this.prisma.transaction.findFirst({
        where: { clinic_id: clinicId, appointment_id: id, type: 'REVENUE', deleted_at: null },
      });
      if (!existingCharge) {
        transaction = await this.prisma.transaction.create({
          data: {
            clinic_id: clinicId,
            patient_id: appt.patient_id,
            appointment_id: id,
            type: 'REVENUE',
            status: 'PENDING',
            amount: appt.service.price!,
            description: `Consulta: ${appt.service.name}`,
            category: appt.type,
            created_by: actorId,
          },
        });
        chargeCreated = true;
      }
    }

    await Promise.all([
      this.events.emit({ clinic_id: clinicId, event_type: 'checkout.completed', entity_type: 'Appointment', entity_id: id, actor_id: actorId, payload: { charge_created: chargeCreated } }),
      this.prisma.patient.update({ where: { id: appt.patient_id }, data: { current_status: 'AGUARDANDO_AGENDAMENTO' } }),
      chargeCreated && transaction
        ? this.audit.log({ clinic_id: clinicId, actor_id: actorId, action: 'CREATE', entity_type: 'Transaction', entity_id: transaction.id, data_after: { auto: true, amount: transaction.amount } })
        : Promise.resolve(),
    ]);

    return { appointment: updated, charge_created: chargeCreated, transaction };
  }

  async cancel(clinicId: string, id: string, reason: string, actorId: string) {
    await this.findOne(clinicId, id);
    const updated = await this.prisma.appointment.update({
      where: { id },
      data: { status: 'CANCELLED', cancellation_reason: reason },
    });
    await this.events.emit({ clinic_id: clinicId, event_type: 'appointment.cancelled', entity_type: 'Appointment', entity_id: id, actor_id: actorId, payload: { reason } });
    return updated;
  }

  async createRecurring(clinicId: string, dto: any, actorId: string) {
    const [hh, mm] = String(dto.time).split(':').map(Number);
    if (Number.isNaN(hh) || Number.isNaN(mm)) {
      throw new BadRequestException('Invalid time format (expected HH:mm)');
    }
    const interval = dto.interval_weeks ?? 1;
    const start = new Date(dto.start_date + 'T00:00:00');
    const end = dto.months_count
      ? new Date(start.getFullYear(), start.getMonth() + dto.months_count, start.getDate())
      : null;
    const targetCount = dto.occurrences_count ?? 9999;

    const slots: { start: Date; end: Date }[] = [];
    const cursor = new Date(start);
    let weekIndex = 0;
    let scanned = 0;
    while (slots.length < targetCount && scanned < 365 * 2) {
      const weekStart = new Date(cursor);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday
      if (weekIndex % interval === 0) {
        for (const wd of dto.weekdays as number[]) {
          const d = new Date(weekStart);
          d.setDate(d.getDate() + wd);
          if (d < start) continue;
          if (end && d >= end) continue;
          d.setHours(hh, mm, 0, 0);
          const e = new Date(d.getTime() + dto.duration_min * 60_000);
          slots.push({ start: d, end: e });
          if (slots.length >= targetCount) break;
        }
      }
      cursor.setDate(cursor.getDate() + 7);
      weekIndex++;
      scanned += 7;
      if (end && cursor >= end) break;
    }

    if (!slots.length) throw new BadRequestException('No occurrences derived from input');

    // Bulk conflict check + create. Skip slots that conflict; report them.
    const created: any[] = [];
    const skipped: { start: string; reason: string }[] = [];
    for (const slot of slots) {
      const conflict = await this.prisma.appointment.findFirst({
        where: {
          clinic_id: clinicId,
          professional_id: dto.professional_id,
          deleted_at: null,
          status: { notIn: ['CANCELLED', 'MISSED', 'RESCHEDULED'] },
          AND: [{ start_time: { lt: slot.end } }, { end_time: { gt: slot.start } }],
        },
        select: { id: true },
      });
      if (conflict) {
        skipped.push({ start: slot.start.toISOString(), reason: 'conflict' });
        continue;
      }
      const appt = await this.prisma.appointment.create({
        data: {
          clinic_id: clinicId,
          patient_id: dto.patient_id,
          professional_id: dto.professional_id,
          service_id: dto.service_id,
          type: dto.type,
          status: 'SCHEDULED',
          start_time: slot.start,
          end_time: slot.end,
          notes: dto.notes,
          is_telemedicine: dto.is_telemedicine ?? false,
        },
        select: { id: true, start_time: true, end_time: true, status: true },
      });
      created.push(appt);
    }

    if (created.length) {
      await this.audit.log({
        clinic_id: clinicId, actor_id: actorId, action: 'CREATE',
        entity_type: 'Appointment', entity_id: created[0].id,
        data_after: { recurring_count: created.length, skipped: skipped.length },
      });
      await this.events.emit({
        clinic_id: clinicId, event_type: 'appointment.recurring_created',
        entity_type: 'Appointment', entity_id: created[0].id, actor_id: actorId,
        payload: { count: created.length, skipped: skipped.length },
      });
    }

    return { created, skipped, count: created.length };
  }

  async bulkUpdateStatus(clinicId: string, ids: string[], status: string, actorId: string) {
    if (!ids?.length) return { updated: 0 };
    const result = await this.prisma.appointment.updateMany({
      where: { id: { in: ids }, clinic_id: clinicId, deleted_at: null },
      data: { status: status as any },
    });
    await this.events.emit({ clinic_id: clinicId, event_type: 'appointment.bulk_updated', entity_type: 'Appointment', entity_id: ids[0], actor_id: actorId, payload: { count: result.count, status } });
    return { updated: result.count };
  }

  async getDailyClosingStatus(clinicId: string, date: string) {
    const d = new Date(date);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    const [checkinPending, billingPending, existing] = await Promise.all([
      this.prisma.appointment.count({ where: { clinic_id: clinicId, status: 'CHECKED_IN', start_time: { gte: d, lt: next } } }),
      this.prisma.transaction.count({ where: { clinic_id: clinicId, status: 'PENDING', created_at: { gte: d, lt: next } } }),
      this.prisma.dailyClosing.findFirst({ where: { clinic_id: clinicId, closing_date: d } }),
    ]);
    return { already_closed: !!existing, checkin_pending: checkinPending, billing_pending: billingPending, can_close: checkinPending === 0 && billingPending === 0 };
  }

  async performDailyClosing(clinicId: string, date: string, actorId: string) {
    const status = await this.getDailyClosingStatus(clinicId, date);
    if (status.already_closed) throw new BadRequestException('Day already closed');
    if (!status.can_close) throw new BadRequestException(`Cannot close: ${status.checkin_pending} checkins pending, ${status.billing_pending} payments pending`);
    const d = new Date(date);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    const [revenue, expenses, apptStats] = await Promise.all([
      this.prisma.transaction.aggregate({ where: { clinic_id: clinicId, type: 'REVENUE', status: 'COMPLETED', paid_at: { gte: d, lt: next } }, _sum: { amount: true } }),
      this.prisma.transaction.aggregate({ where: { clinic_id: clinicId, type: 'EXPENSE', status: 'COMPLETED', paid_at: { gte: d, lt: next } }, _sum: { amount: true } }),
      this.prisma.appointment.groupBy({ by: ['status'], where: { clinic_id: clinicId, start_time: { gte: d, lt: next } }, _count: true }),
    ]);
    const totalRevenue = Number(revenue._sum.amount ?? 0);
    const totalExpenses = Number(expenses._sum.amount ?? 0);
    const apptMap = Object.fromEntries(apptStats.map((s: any) => [s.status, s._count]));
    const closing = await this.prisma.dailyClosing.create({
      data: {
        clinic_id: clinicId,
        closing_date: d,
        total_revenue: totalRevenue,
        total_expenses: totalExpenses,
        net_result: totalRevenue - totalExpenses,
        appointments_total: Object.values(apptMap as Record<string, number>).reduce((a, b) => a + b, 0),
        appointments_completed: (apptMap as Record<string, number>)['COMPLETED'] ?? 0,
        closed_by: actorId,
      },
    });
    await Promise.all([
      this.audit.log({ clinic_id: clinicId, actor_id: actorId, action: 'CREATE', entity_type: 'DailyClosing', entity_id: closing.id }),
      this.events.emit({ clinic_id: clinicId, event_type: 'daily_closing.completed', entity_type: 'DailyClosing', entity_id: closing.id, actor_id: actorId }),
    ]);
    return closing;
  }

  async startConsulta(clinicId: string, id: string, actorId: string) {
    const appt = await this.findOne(clinicId, id);
    if (!['CHECKED_IN', 'SCHEDULED', 'CONFIRMED'].includes(appt.status)) {
      throw new BadRequestException(`Não é possível iniciar a partir do status ${appt.status}`);
    }
    const updated = await this.prisma.appointment.update({
      where: { id },
      data: { status: 'IN_PROGRESS', started_at: new Date(), kanban_stage: 'CONSULTA' },
    });
    await Promise.all([
      this.audit.log({ clinic_id: clinicId, actor_id: actorId, action: 'START' as any, entity_type: 'Appointment', entity_id: id }),
      this.events.emit({ clinic_id: clinicId, event_type: 'appointment.started', entity_type: 'Appointment', entity_id: id, actor_id: actorId }),
    ]);
    return updated;
  }

  async finalizeConsulta(clinicId: string, id: string, dto: {
    finalization_note?: string;
    return_scheduled: boolean;
    return_exception_note?: string;
    skip_charge?: boolean;
  }, actorId: string) {
    const appt = await this.findOne(clinicId, id);
    if (!['IN_PROGRESS', 'CHECKED_IN'].includes(appt.status)) {
      throw new BadRequestException(`Não é possível finalizar a partir do status ${appt.status}`);
    }
    if (!dto.return_scheduled && !dto.return_exception_note) {
      throw new BadRequestException('Informe se o retorno foi agendado ou forneça justificativa para exceção');
    }

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        finalized_at: new Date(),
        checked_out_at: new Date(),
        finalization_note: dto.finalization_note,
        return_scheduled: dto.return_scheduled,
        return_exception_note: dto.return_exception_note,
        kanban_stage: 'FINALIZADO',
      },
    });

    const charges: any[] = [];
    if (!dto.skip_charge && appt.service && Number(appt.service.price) > 0) {
      const existing = await this.prisma.receivable.findFirst({
        where: { clinic_id: clinicId, appointment_id: id, deleted_at: null },
      });
      if (!existing) {
        const rec = await this.prisma.receivable.create({
          data: {
            clinic_id: clinicId,
            patient_id: appt.patient_id,
            appointment_id: id,
            due_date: new Date(),
            total_amount: appt.service.price!,
            description: `Consulta: ${appt.service.name}`,
            created_by: actorId,
          },
        });
        charges.push(rec);
      }
    }

    await Promise.all([
      this.audit.log({ clinic_id: clinicId, actor_id: actorId, action: 'FINALIZE' as any, entity_type: 'Appointment', entity_id: id }),
      this.events.emit({ clinic_id: clinicId, event_type: 'checkout.completed', entity_type: 'Appointment', entity_id: id, actor_id: actorId, payload: { return_scheduled: dto.return_scheduled } }),
    ]);

    return { appointment: updated, receivables_created: charges };
  }

  async updateKanbanStage(clinicId: string, id: string, dto: { stage: string; skipped_reason?: string }, actorId: string) {
    const appt = await this.findOne(clinicId, id);
    const STAGE_ORDER = ['AGENDADO', 'CHEGOU', 'BIOIMPEDANCIA', 'CONSULTA', 'SOROTERAPIA', 'IMPLANTE', 'FINALIZADO'];
    const currentIdx = STAGE_ORDER.indexOf(appt.kanban_stage ?? 'AGENDADO');
    const targetIdx = STAGE_ORDER.indexOf(dto.stage);
    const isSkipping = targetIdx > currentIdx + 1;
    if (isSkipping && !dto.skipped_reason) {
      throw new BadRequestException('Forneça o motivo para pular etapas');
    }
    const updated = await this.prisma.appointment.update({
      where: { id },
      data: {
        kanban_stage: dto.stage,
        stage_skipped_reason: isSkipping ? dto.skipped_reason : null,
      },
    });
    await this.audit.log({
      clinic_id: clinicId, actor_id: actorId, action: 'STAGE_CHANGE' as any, entity_type: 'Appointment', entity_id: id,
      metadata: { from: appt.kanban_stage, to: dto.stage, skipped: isSkipping, reason: dto.skipped_reason },
    });
    return updated;
  }
}
