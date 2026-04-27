import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { AlertCategory, AlertSeverity, AlertStatus, AuditAction } from '@prisma/client';

export interface AlertsQuery {
  status?: AlertStatus;
  severity?: AlertSeverity;
  category?: AlertCategory;
  page?: number;
  limit?: number;
}

@Injectable()
export class AlertsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async findAll(clinicId: string, query: AlertsQuery = {}) {
    const { status, severity, category, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = { clinic_id: clinicId, deleted_at: null };
    if (status) where.status = status;
    if (severity) where.severity = severity;
    if (category) where.category = category;

    const [data, total] = await Promise.all([
      this.prisma.alert.findMany({
        where,
        orderBy: [{ score: 'desc' }, { created_at: 'desc' }],
        skip,
        take: limit,
        include: {
          patient: { select: { id: true, full_name: true } },
          action_logs: { orderBy: { created_at: 'desc' }, take: 5 },
        },
      }),
      this.prisma.alert.count({ where }),
    ]);

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(clinicId: string, id: string) {
    const alert = await this.prisma.alert.findFirst({
      where: { id, clinic_id: clinicId, deleted_at: null },
      include: {
        patient: { select: { id: true, full_name: true } },
        action_logs: { orderBy: { created_at: 'desc' } },
      },
    });
    if (!alert) throw new NotFoundException('Alert not found');
    return alert;
  }

  async ack(clinicId: string, id: string, userId: string) {
    const alert = await this.findOne(clinicId, id);

    const updated = await this.prisma.alert.update({
      where: { id },
      data: { status: AlertStatus.ACKNOWLEDGED },
    });

    await Promise.all([
      this.prisma.alertActionLog.create({
        data: { alert_id: id, clinic_id: clinicId, user_id: userId, action: 'ACK' },
      }),
      this.audit.log({
        clinic_id: clinicId,
        actor_id: userId,
        action: AuditAction.ALERT_ACK,
        entity_type: 'Alert',
        entity_id: id,
        data_before: { status: alert.status },
        data_after: { status: AlertStatus.ACKNOWLEDGED },
      }),
    ]);

    return updated;
  }

  async snooze(clinicId: string, id: string, userId: string, days: number) {
    const alert = await this.findOne(clinicId, id);
    const snoozedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const updated = await this.prisma.alert.update({
      where: { id },
      data: { status: AlertStatus.SNOOZED, snoozed_until: snoozedUntil },
    });

    await Promise.all([
      this.prisma.alertActionLog.create({
        data: {
          alert_id: id,
          clinic_id: clinicId,
          user_id: userId,
          action: 'SNOOZE',
          note: `Snoozed for ${days} day(s) until ${snoozedUntil.toISOString()}`,
        },
      }),
      this.audit.log({
        clinic_id: clinicId,
        actor_id: userId,
        action: AuditAction.ALERT_SNOOZE,
        entity_type: 'Alert',
        entity_id: id,
        data_before: { status: alert.status },
        data_after: { status: AlertStatus.SNOOZED, snoozed_until: snoozedUntil },
      }),
    ]);

    return updated;
  }

  async resolve(clinicId: string, id: string, userId: string, note?: string) {
    const alert = await this.findOne(clinicId, id);
    const now = new Date();

    const updated = await this.prisma.alert.update({
      where: { id },
      data: {
        status: AlertStatus.RESOLVED,
        resolved_at: now,
        resolved_by_user_id: userId,
        resolution_note: note ?? null,
      },
    });

    await Promise.all([
      this.prisma.alertActionLog.create({
        data: { alert_id: id, clinic_id: clinicId, user_id: userId, action: 'RESOLVE', note: note ?? null },
      }),
      this.audit.log({
        clinic_id: clinicId,
        actor_id: userId,
        action: AuditAction.ALERT_RESOLVE,
        entity_type: 'Alert',
        entity_id: id,
        data_before: { status: alert.status },
        data_after: { status: AlertStatus.RESOLVED, resolved_at: now, note },
      }),
    ]);

    return updated;
  }

  async dismiss(clinicId: string, id: string, userId: string, note?: string) {
    const alert = await this.findOne(clinicId, id);

    const updated = await this.prisma.alert.update({
      where: { id },
      data: { status: AlertStatus.DISMISSED, resolution_note: note ?? null },
    });

    await Promise.all([
      this.prisma.alertActionLog.create({
        data: { alert_id: id, clinic_id: clinicId, user_id: userId, action: 'DISMISS', note: note ?? null },
      }),
      this.audit.log({
        clinic_id: clinicId,
        actor_id: userId,
        action: AuditAction.ALERT_DISMISS,
        entity_type: 'Alert',
        entity_id: id,
        data_before: { status: alert.status },
        data_after: { status: AlertStatus.DISMISSED, note },
      }),
    ]);

    return updated;
  }

  async findByPatient(clinicId: string, patientId: string) {
    return this.prisma.alert.findMany({
      where: {
        clinic_id: clinicId,
        patient_id: patientId,
        status: { in: [AlertStatus.OPEN, AlertStatus.ACKNOWLEDGED, AlertStatus.SNOOZED] },
        deleted_at: null,
      },
      orderBy: [{ score: 'desc' }, { created_at: 'desc' }],
    });
  }

  async getOpenCount(clinicId: string): Promise<{ total: number }> {
    const total = await this.prisma.alert.count({
      where: { clinic_id: clinicId, status: AlertStatus.OPEN, deleted_at: null },
    });
    return { total };
  }

  async getMetrics(clinicId: string) {
    const where = { clinic_id: clinicId };

    const [total_created, resolved, dismissed, snoozed] = await Promise.all([
      this.prisma.alert.count({ where }),
      this.prisma.alert.count({ where: { ...where, status: AlertStatus.RESOLVED } }),
      this.prisma.alert.count({ where: { ...where, status: AlertStatus.DISMISSED } }),
      this.prisma.alert.count({ where: { ...where, status: AlertStatus.SNOOZED } }),
    ]);

    // avg_time_to_resolve in hours
    const resolvedWithTime = await this.prisma.alert.findMany({
      where: { ...where, status: AlertStatus.RESOLVED, resolved_at: { not: null } },
      select: { created_at: true, resolved_at: true },
    });

    const avgMs =
      resolvedWithTime.length > 0
        ? resolvedWithTime.reduce((acc, a) => acc + (a.resolved_at!.getTime() - a.created_at.getTime()), 0) /
          resolvedWithTime.length
        : 0;

    // top rules by volume
    const ruleGroups = await this.prisma.alert.groupBy({
      by: ['rule_key'],
      where,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    return {
      total_created,
      total_resolved: resolved,
      total_dismissed: dismissed,
      total_snoozed: snoozed,
      avg_time_to_resolve_hours: Math.round(avgMs / (1000 * 60 * 60) * 10) / 10,
      top_rules_by_volume: ruleGroups.map((g) => ({ rule_key: g.rule_key, count: g._count.id })),
    };
  }
}
