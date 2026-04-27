import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  AlertOwnerRole,
  AppointmentStatus,
  ProtocolStatus,
  TaskActionType,
  TaskPriority,
  TaskSource,
  TaskStatus,
  TaskType,
  TransactionStatus,
  TransactionType,
} from '@prisma/client';

const COOLDOWN_MS = 24 * 60 * 60 * 1000;

interface TaskCandidate {
  ruleKey: string;
  type: TaskType;
  priority: TaskPriority;
  title: string;
  message: string;
  dueAt: Date;
  ownerRoleTarget: AlertOwnerRole;
  source: TaskSource;
  sourceRefId?: string;
  patientId?: string;
  appointmentId?: string;
}

function daysFromNow(n: number): Date {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000);
}

@Injectable()
export class CadenceEngine {
  private readonly logger = new Logger(CadenceEngine.name);

  constructor(private prisma: PrismaService) {}

  // ── Scheduler ────────────────────────────────────────────────────────────────

  @Cron('*/30 * * * *')
  async runScheduled(): Promise<void> {
    const clinics = await this.prisma.clinic.findMany({
      where: { deleted_at: null },
      select: { id: true },
    });
    for (const clinic of clinics) {
      await this.runForClinic(clinic.id).catch((e) =>
        this.logger.error(`CadenceEngine clinic=${clinic.id} error`, e),
      );
    }
  }

  // ── Public ───────────────────────────────────────────────────────────────────

  async runForClinic(clinicId: string): Promise<{ created: number; updated: number; resolved: number }> {
    let created = 0;
    let updated = 0;
    let resolved = 0;

    const patients = await this.prisma.patient.findMany({
      where: { clinic_id: clinicId, deleted_at: null },
      select: { id: true },
    });

    for (const { id: patientId } of patients) {
      const r = await this.runForPatient(patientId, clinicId);
      created += r.created;
      updated += r.updated;
      resolved += r.resolved;
    }

    this.logger.log(`CadenceEngine clinic=${clinicId}: created=${created}, updated=${updated}, resolved=${resolved}`);
    return { created, updated, resolved };
  }

  async runForPatient(
    patientId: string,
    clinicId: string,
  ): Promise<{ created: number; updated: number; resolved: number }> {
    let created = 0;
    let updated = 0;
    let resolved = 0;

    // First: auto-resolve tasks whose condition no longer exists
    resolved += await this.autoResolve(patientId, clinicId);

    // Collect candidates from all rules
    const candidates: TaskCandidate[] = [
      ...(await this.ruleC1(patientId, clinicId)),
      ...(await this.ruleC2(patientId, clinicId)),
      ...(await this.ruleC3(patientId, clinicId)),
      ...(await this.ruleC4(patientId, clinicId)),
      ...(await this.ruleC5(patientId, clinicId)),
      ...(await this.ruleC6(patientId, clinicId)),
    ];

    for (const candidate of candidates) {
      const result = await this.upsertTask(clinicId, candidate);
      if (result === 'created') created++;
      else if (result === 'updated') updated++;
    }

    return { created, updated, resolved };
  }

  async onEvent(clinicId: string, event: { type: string; patientId?: string; appointmentId?: string }): Promise<void> {
    if (!event.patientId) return;
    const triggers = ['CHECKOUT', 'PAYMENT', 'IMPLANT_APPLIED', 'APPOINTMENT_SCHEDULED', 'DOCUMENT_SIGNED'];
    if (triggers.includes(event.type)) {
      await this.runForPatient(event.patientId, clinicId).catch((e) =>
        this.logger.error(`CadenceEngine onEvent error`, e),
      );
    }
  }

  // ── Rules ────────────────────────────────────────────────────────────────────

  /** C1: RED CRS (>=70) without future appointment */
  private async ruleC1(patientId: string, clinicId: string): Promise<TaskCandidate[]> {
    const score = await this.prisma.patientCognitiveScore.findFirst({
      where: { patient_id: patientId, clinic_id: clinicId },
    });
    if (!score || score.composite_risk_score < 70) return [];

    const future = await this.prisma.appointment.findFirst({
      where: {
        clinic_id: clinicId,
        patient_id: patientId,
        status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED] },
        start_time: { gt: new Date() },
        deleted_at: null,
      },
    });
    if (future) return [];

    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId },
      select: { full_name: true },
    });

    return [
      {
        ruleKey: 'C1_RED_NO_APPT',
        type: TaskType.SCHEDULE_VISIT,
        priority: TaskPriority.HIGH,
        title: 'Agendar retorno — risco alto',
        message: `${patient?.full_name ?? 'Paciente'} tem risco composto ≥70 e sem consulta futura agendada.`,
        dueAt: daysFromNow(1),
        ownerRoleTarget: AlertOwnerRole.GERENTE,
        source: TaskSource.SCORE,
        patientId,
      },
    ];
  }

  /** C2: Implant exchange within 10 days */
  private async ruleC2(patientId: string, clinicId: string): Promise<TaskCandidate[]> {
    const implant = await this.prisma.hormoneImplant.findFirst({
      where: {
        clinic_id: clinicId,
        patient_id: patientId,
        deleted_at: null,
        next_change_date: { lte: daysFromNow(10), gte: new Date() },
      },
    });
    if (!implant) return [];

    // If there is already a future appointment scheduled, skip
    const future = await this.prisma.appointment.findFirst({
      where: {
        clinic_id: clinicId,
        patient_id: patientId,
        status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED] },
        start_time: { lte: daysFromNow(12), gt: new Date() },
        deleted_at: null,
      },
    });
    if (future) return [];

    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId },
      select: { full_name: true },
    });

    return [
      {
        ruleKey: 'C2_IMPLANT_DUE',
        type: TaskType.FOLLOWUP_IMPLANT,
        priority: TaskPriority.HIGH,
        title: 'Contatar — troca de implante próxima',
        message: `${patient?.full_name ?? 'Paciente'} tem troca de implante em ≤10 dias. Confirmar agendamento.`,
        dueAt: new Date(),
        ownerRoleTarget: AlertOwnerRole.GERENTE,
        source: TaskSource.SCORE,
        sourceRefId: implant.id,
        patientId,
      },
    ];
  }

  /** C3: Active protocol without return >30 days */
  private async ruleC3(patientId: string, clinicId: string): Promise<TaskCandidate[]> {
    const protocol = await this.prisma.treatmentProtocol.findFirst({
      where: { clinic_id: clinicId, patient_id: patientId, status: ProtocolStatus.ATIVO, deleted_at: null },
    });
    if (!protocol) return [];

    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const lastAppt = await this.prisma.appointment.findFirst({
      where: {
        clinic_id: clinicId,
        patient_id: patientId,
        status: AppointmentStatus.COMPLETED,
        start_time: { gte: since30 },
        deleted_at: null,
      },
    });
    if (lastAppt) return [];

    const score = await this.prisma.patientCognitiveScore.findFirst({
      where: { patient_id: patientId, clinic_id: clinicId },
    });
    const priority = score && score.clinical_stability_score >= 70 ? TaskPriority.HIGH : TaskPriority.MEDIUM;

    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId },
      select: { full_name: true },
    });

    return [
      {
        ruleKey: 'C3_PROTOCOL_NO_RETURN',
        type: TaskType.FOLLOWUP_PROTOCOL,
        priority,
        title: 'Follow-up de protocolo — sem retorno',
        message: `${patient?.full_name ?? 'Paciente'} tem protocolo ativo sem retorno há mais de 30 dias.`,
        dueAt: daysFromNow(2),
        ownerRoleTarget: AlertOwnerRole.MEDICO,
        source: TaskSource.SCORE,
        sourceRefId: protocol.id,
        patientId,
      },
    ];
  }

  /** C4: Pending charge >7 days */
  private async ruleC4(patientId: string, clinicId: string): Promise<TaskCandidate[]> {
    const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const charge = await this.prisma.transaction.findFirst({
      where: {
        clinic_id: clinicId,
        patient_id: patientId,
        type: TransactionType.REVENUE,
        status: TransactionStatus.PENDING,
        created_at: { lte: since7 },
        deleted_at: null,
      },
    });
    if (!charge) return [];

    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId },
      select: { full_name: true },
    });

    return [
      {
        ruleKey: 'C4_PENDING_CHARGE',
        type: TaskType.COLLECT_PAYMENT,
        priority: TaskPriority.HIGH,
        title: 'Cobrar — pagamento pendente há mais de 7 dias',
        message: `${patient?.full_name ?? 'Paciente'} tem cobrança de R$${Number(charge.amount).toFixed(2)} pendente.`,
        dueAt: new Date(),
        ownerRoleTarget: AlertOwnerRole.GERENTE,
        source: TaskSource.FINANCE,
        sourceRefId: charge.id,
        patientId,
      },
    ];
  }

  /** C5: Patient in waitlist with high CRS */
  private async ruleC5(patientId: string, clinicId: string): Promise<TaskCandidate[]> {
    const entry = await this.prisma.waitlistEntry.findFirst({
      where: { clinic_id: clinicId, patient_id: patientId, status: 'OPEN' },
    });
    if (!entry) return [];

    const score = await this.prisma.patientCognitiveScore.findFirst({
      where: { patient_id: patientId, clinic_id: clinicId },
    });
    if (!score || score.composite_risk_score < 40) return [];

    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId },
      select: { full_name: true },
    });

    return [
      {
        ruleKey: 'C5_WAITLIST_HIGH_CRS',
        type: TaskType.CONTACT_PATIENT,
        priority: score.composite_risk_score >= 70 ? TaskPriority.HIGH : TaskPriority.MEDIUM,
        title: 'Contatar paciente na fila de espera',
        message: `${patient?.full_name ?? 'Paciente'} está na fila de espera com risco ${score.composite_risk_score >= 70 ? 'ALTO' : 'MÉDIO'}.`,
        dueAt: new Date(),
        ownerRoleTarget: AlertOwnerRole.GERENTE,
        source: TaskSource.WAITLIST,
        sourceRefId: entry.id,
        patientId,
      },
    ];
  }

  /** C6: Appointment completed without document */
  private async ruleC6(patientId: string, clinicId: string): Promise<TaskCandidate[]> {
    const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const appt = await this.prisma.appointment.findFirst({
      where: {
        clinic_id: clinicId,
        patient_id: patientId,
        status: AppointmentStatus.COMPLETED,
        end_time: { gte: cutoff },
        deleted_at: null,
        documents: { none: { deleted_at: null } },
      },
    });
    if (!appt) return [];

    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId },
      select: { full_name: true },
    });

    return [
      {
        ruleKey: 'C6_MISSING_DOC',
        type: TaskType.REQUEST_DOCUMENT,
        priority: TaskPriority.MEDIUM,
        title: 'Documento pendente — consulta finalizada',
        message: `${patient?.full_name ?? 'Paciente'} finalizou consulta sem receita ou pedido de exame.`,
        dueAt: new Date(),
        ownerRoleTarget: AlertOwnerRole.MEDICO,
        source: TaskSource.ALERT,
        sourceRefId: appt.id,
        patientId,
        appointmentId: appt.id,
      },
    ];
  }

  // ── Auto-resolve ─────────────────────────────────────────────────────────────

  private async autoResolve(patientId: string, clinicId: string): Promise<number> {
    let count = 0;
    const openTasks = await this.prisma.task.findMany({
      where: {
        clinic_id: clinicId,
        patient_id: patientId,
        status: { in: [TaskStatus.OPEN, TaskStatus.IN_PROGRESS] },
      },
    });

    for (const task of openTasks) {
      let resolved = false;

      if (task.rule_key === 'C1_RED_NO_APPT' || task.rule_key === 'C3_PROTOCOL_NO_RETURN') {
        const future = await this.prisma.appointment.findFirst({
          where: {
            clinic_id: clinicId,
            patient_id: patientId,
            status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED] },
            start_time: { gt: new Date() },
            deleted_at: null,
          },
        });
        if (future) resolved = true;
      }

      if (task.rule_key === 'C2_IMPLANT_DUE') {
        const future = await this.prisma.appointment.findFirst({
          where: {
            clinic_id: clinicId,
            patient_id: patientId,
            status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED] },
            start_time: { lte: daysFromNow(12), gt: new Date() },
            deleted_at: null,
          },
        });
        if (future) resolved = true;
      }

      if (task.rule_key === 'C4_PENDING_CHARGE') {
        const paid = await this.prisma.transaction.findFirst({
          where: {
            clinic_id: clinicId,
            patient_id: patientId,
            type: TransactionType.REVENUE,
            status: TransactionStatus.COMPLETED,
            deleted_at: null,
          },
        });
        if (paid) resolved = true;
      }

      if (task.rule_key === 'C6_MISSING_DOC' && task.appointment_id) {
        const doc = await this.prisma.document.findFirst({
          where: {
            clinic_id: clinicId,
            appointment_id: task.appointment_id,
            deleted_at: null,
          },
        });
        if (doc) resolved = true;
      }

      if (resolved) {
        await this.prisma.task.update({
          where: { id: task.id },
          data: { status: TaskStatus.DONE, completed_at: new Date() },
        });
        await this.prisma.taskActionLog.create({
          data: {
            clinic_id: clinicId,
            task_id: task.id,
            user_id: 'SYSTEM',
            action: TaskActionType.COMPLETE,
            note: 'Auto-resolved: condition no longer exists',
          },
        });
        count++;
      }
    }

    return count;
  }

  // ── Upsert with cooldown ──────────────────────────────────────────────────────

  private async upsertTask(clinicId: string, candidate: TaskCandidate): Promise<'created' | 'updated' | 'skipped'> {
    const existing = await this.prisma.task.findFirst({
      where: {
        clinic_id: clinicId,
        patient_id: candidate.patientId ?? null,
        rule_key: candidate.ruleKey,
        status: { in: [TaskStatus.OPEN, TaskStatus.IN_PROGRESS, TaskStatus.SNOOZED] },
      },
    });

    if (existing) {
      const cooldownExpired =
        !existing.created_at ||
        Date.now() - existing.created_at.getTime() > COOLDOWN_MS;

      const priorityEscalated =
        this.priorityRank(candidate.priority) > this.priorityRank(existing.priority);

      if (!cooldownExpired && !priorityEscalated) return 'skipped';

      await this.prisma.task.update({
        where: { id: existing.id },
        data: {
          priority: candidate.priority,
          due_at: candidate.dueAt,
          message: candidate.message,
        },
      });
      await this.prisma.taskActionLog.create({
        data: {
          clinic_id: clinicId,
          task_id: existing.id,
          user_id: 'SYSTEM',
          action: TaskActionType.SYSTEM_UPDATE,
          note: `priority=${candidate.priority}`,
        },
      });
      return 'updated';
    }

    const task = await this.prisma.task.create({
      data: {
        clinic_id: clinicId,
        patient_id: candidate.patientId ?? null,
        appointment_id: candidate.appointmentId ?? null,
        source: candidate.source,
        source_ref_id: candidate.sourceRefId ?? null,
        rule_key: candidate.ruleKey,
        type: candidate.type,
        priority: candidate.priority,
        title: candidate.title,
        message: candidate.message,
        due_at: candidate.dueAt,
        owner_role_target: candidate.ownerRoleTarget,
        status: TaskStatus.OPEN,
      },
    });
    await this.prisma.taskActionLog.create({
      data: {
        clinic_id: clinicId,
        task_id: task.id,
        user_id: 'SYSTEM',
        action: TaskActionType.CREATE,
        note: `rule=${candidate.ruleKey}`,
      },
    });
    return 'created';
  }

  private priorityRank(p: TaskPriority): number {
    return { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 }[p] ?? 0;
  }
}
