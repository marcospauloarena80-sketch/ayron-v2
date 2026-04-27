import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { AuditAction, TaskActionType, TaskPriority, TaskStatus } from '@prisma/client';

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async findAll(
    clinicId: string,
    query: {
      status?: string;
      priority?: string;
      type?: string;
      ownerRole?: string;
      due?: 'overdue' | 'today' | 'week';
      page?: number;
      limit?: number;
    },
  ) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    const endOfWeek = new Date(startOfDay.getTime() + 7 * 24 * 60 * 60 * 1000);

    const where: any = {
      clinic_id: clinicId,
      ...(query.status && { status: query.status }),
      ...(query.priority && { priority: query.priority }),
      ...(query.type && { type: query.type }),
      ...(query.ownerRole && { owner_role_target: query.ownerRole }),
    };

    if (query.due === 'overdue') {
      where.due_at = { lt: startOfDay };
      where.status = { in: [TaskStatus.OPEN, TaskStatus.IN_PROGRESS] };
    } else if (query.due === 'today') {
      where.due_at = { gte: startOfDay, lt: endOfDay };
    } else if (query.due === 'week') {
      where.due_at = { gte: startOfDay, lt: endOfWeek };
    }

    const [data, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { priority: 'desc' },
          { due_at: 'asc' },
        ],
        include: {
          patient: { select: { id: true, full_name: true } },
        },
      }),
      this.prisma.task.count({ where }),
    ]);

    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getCount(clinicId: string): Promise<{ total: number; overdue: number }> {
    const now = new Date();
    const [total, overdue] = await Promise.all([
      this.prisma.task.count({
        where: { clinic_id: clinicId, status: { in: [TaskStatus.OPEN, TaskStatus.IN_PROGRESS] } },
      }),
      this.prisma.task.count({
        where: {
          clinic_id: clinicId,
          status: { in: [TaskStatus.OPEN, TaskStatus.IN_PROGRESS] },
          due_at: { lt: now },
        },
      }),
    ]);
    return { total, overdue };
  }

  async findOne(clinicId: string, id: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, clinic_id: clinicId },
      include: { patient: { select: { id: true, full_name: true } }, logs: { orderBy: { created_at: 'desc' } } },
    });
    if (!task) throw new NotFoundException('Task não encontrada');
    return task;
  }

  async findByPatient(clinicId: string, patientId: string) {
    return this.prisma.task.findMany({
      where: { clinic_id: clinicId, patient_id: patientId, status: { in: [TaskStatus.OPEN, TaskStatus.IN_PROGRESS, TaskStatus.SNOOZED] } },
      orderBy: [{ priority: 'desc' }, { due_at: 'asc' }],
      take: 10,
    });
  }

  async start(clinicId: string, id: string, userId: string) {
    const task = await this.findOne(clinicId, id);
    await this.prisma.task.update({ where: { id }, data: { status: TaskStatus.IN_PROGRESS } });
    await this.log(clinicId, id, userId, TaskActionType.START);
    await this.audit.log({ clinic_id: clinicId, actor_id: userId, action: AuditAction.TASK_CREATE, entity_type: 'TASK', entity_id: id });
    return this.findOne(clinicId, id);
  }

  async snooze(clinicId: string, id: string, userId: string, days: number) {
    const task = await this.findOne(clinicId, id);
    const snoozedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    await this.prisma.task.update({ where: { id }, data: { status: TaskStatus.SNOOZED, snoozed_until: snoozedUntil } });
    await this.log(clinicId, id, userId, TaskActionType.SNOOZE, `days=${days}`);
    return { id, status: TaskStatus.SNOOZED, snoozed_until: snoozedUntil };
  }

  async complete(clinicId: string, id: string, userId: string, note?: string) {
    await this.findOne(clinicId, id);
    await this.prisma.task.update({
      where: { id },
      data: { status: TaskStatus.DONE, completed_at: new Date(), completed_by_user_id: userId, resolution_note: note ?? null },
    });
    await this.log(clinicId, id, userId, TaskActionType.COMPLETE, note);
    await this.audit.log({ clinic_id: clinicId, actor_id: userId, action: AuditAction.TASK_COMPLETE, entity_type: 'TASK', entity_id: id });
    return { id, status: TaskStatus.DONE };
  }

  async cancel(clinicId: string, id: string, userId: string, note?: string) {
    await this.findOne(clinicId, id);
    await this.prisma.task.update({ where: { id }, data: { status: TaskStatus.CANCELLED, resolution_note: note ?? null } });
    await this.log(clinicId, id, userId, TaskActionType.CANCEL, note);
    await this.audit.log({ clinic_id: clinicId, actor_id: userId, action: AuditAction.TASK_CANCEL, entity_type: 'TASK', entity_id: id });
    return { id, status: TaskStatus.CANCELLED };
  }

  private async log(clinicId: string, taskId: string, userId: string, action: TaskActionType, note?: string) {
    await this.prisma.taskActionLog.create({
      data: { clinic_id: clinicId, task_id: taskId, user_id: userId, action, note: note ?? null },
    });
  }
}
