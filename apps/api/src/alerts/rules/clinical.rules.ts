import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AlertCategory, AlertOwnerRole, AlertSeverity, AppointmentStatus, ProtocolStatus } from '@prisma/client';
import { AlertCandidate, RuleContext } from './rule.types';

@Injectable()
export class ClinicalRules {
  private readonly logger = new Logger(ClinicalRules.name);

  constructor(private prisma: PrismaService) {}

  async checkNoReturn(ctx: RuleContext): Promise<AlertCandidate[]> {
    const days = ctx.params['no_return_days'] ?? 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const activeProtocols = await this.prisma.treatmentProtocol.findMany({
      where: { clinic_id: ctx.clinicId, status: ProtocolStatus.ATIVO, deleted_at: null },
      include: {
        patient: { select: { id: true, full_name: true } },
      },
    });

    const candidates: AlertCandidate[] = [];

    for (const protocol of activeProtocols) {
      const lastAppt = await this.prisma.appointment.findFirst({
        where: {
          clinic_id: ctx.clinicId,
          patient_id: protocol.patient_id,
          status: { in: [AppointmentStatus.COMPLETED] },
          deleted_at: null,
          start_time: { gte: since },
        },
        orderBy: { start_time: 'desc' },
      });

      if (!lastAppt) {
        candidates.push({
          ruleKey: 'R1_NO_RETURN',
          category: AlertCategory.CLINICAL_OPS,
          severity: AlertSeverity.MEDIUM,
          ownerRoleTarget: AlertOwnerRole.MEDICO,
          title: 'Retorno atrasado — protocolo ativo sem consulta',
          message: `${protocol.patient.full_name} tem protocolo ativo há mais de ${days} dias sem retorno.`,
          rationale: [
            `Protocolo "${protocol.type}" ativo desde ${protocol.start_date?.toLocaleDateString('pt-BR') ?? 'N/A'}`,
            `Sem consulta nos últimos ${days} dias`,
            'Retornos regulares são essenciais para monitoramento e ajuste do protocolo',
          ],
          suggestedActions: [
            { key: 'schedule_return', label: 'Agendar Retorno' },
            { key: 'add_waitlist', label: 'Adicionar à Fila de Espera' },
          ],
          patientId: protocol.patient_id,
          dedupWindowDays: 7,
          metadata: { protocol_id: protocol.id, protocol_type: protocol.type },
        });
      }
    }

    return candidates;
  }

  async checkImplantDue(ctx: RuleContext): Promise<AlertCandidate[]> {
    const windowDays = ctx.params['window_days'] ?? 10;
    const windowDate = new Date(Date.now() + windowDays * 24 * 60 * 60 * 1000);

    const implants = await this.prisma.hormoneImplant.findMany({
      where: {
        clinic_id: ctx.clinicId,
        deleted_at: null,
        next_change_date: { lte: windowDate, gte: new Date() },
      },
      include: {
        patient: { select: { id: true, full_name: true } },
      },
    });

    return implants.map((imp) => ({
      ruleKey: 'R2_IMPLANT_DUE',
      category: AlertCategory.CLINICAL_OPS,
      severity: AlertSeverity.HIGH,
      ownerRoleTarget: AlertOwnerRole.GERENTE,
      title: 'Implante hormonal próximo da troca',
      message: `${imp.patient.full_name} — troca prevista para ${imp.next_change_date?.toLocaleDateString('pt-BR') ?? 'N/A'}.`,
      rationale: [
        `Implante de ${imp.hormone_type} aplicado em ${imp.application_date?.toLocaleDateString('pt-BR') ?? 'N/A'}`,
        `Troca prevista em ${windowDays} dias ou menos`,
        'Atrasar a troca pode comprometer o efeito terapêutico',
      ],
      suggestedActions: [
        { key: 'call_patient', label: 'Registrar Contato' },
        { key: 'schedule_implant', label: 'Agendar Troca' },
      ],
      patientId: imp.patient_id,
      dedupWindowDays: 3,
      metadata: { implant_id: imp.id, next_change_date: imp.next_change_date },
    }));
  }

  async checkMissingDocument(ctx: RuleContext, appointmentId?: string): Promise<AlertCandidate[]> {
    const where: any = {
      clinic_id: ctx.clinicId,
      status: AppointmentStatus.COMPLETED,
      deleted_at: null,
    };

    if (appointmentId) {
      where.id = appointmentId;
    } else {
      const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000);
      where.end_time = { gte: cutoff };
    }

    const appts = await this.prisma.appointment.findMany({
      where,
      include: {
        patient: { select: { id: true, full_name: true } },
        documents: { where: { deleted_at: null } },
      },
    });

    return appts
      .filter((a) => a.documents.length === 0)
      .map((a) => ({
        ruleKey: 'R3_MISSING_DOC',
        category: AlertCategory.CLINICAL_OPS,
        severity: AlertSeverity.LOW,
        ownerRoleTarget: AlertOwnerRole.MEDICO,
        title: 'Consulta finalizada sem documento',
        message: `${a.patient.full_name} — consulta finalizada sem receita ou pedido de exame.`,
        rationale: [
          'Consulta finalizada (COMPLETED)',
          'Nenhum documento (receita, pedido, laudo) foi gerado',
          'Verificar se há documento pendente de criação',
        ],
        suggestedActions: [
          { key: 'create_prescription', label: 'Criar Receita' },
          { key: 'create_exam_order', label: 'Criar Pedido de Exame' },
        ],
        patientId: a.patient_id,
        appointmentId: a.id,
        dedupWindowDays: 1,
        metadata: { appointment_id: a.id },
      }));
  }

  async checkMissingBioimpedance(ctx: RuleContext, appointmentId?: string): Promise<AlertCandidate[]> {
    const where: any = {
      clinic_id: ctx.clinicId,
      status: { in: [AppointmentStatus.CHECKED_IN, AppointmentStatus.IN_PROGRESS] },
      deleted_at: null,
    };

    if (appointmentId) where.id = appointmentId;

    const appts = await this.prisma.appointment.findMany({
      where,
      include: { patient: { select: { id: true, full_name: true } } },
    });

    const candidates: AlertCandidate[] = [];

    for (const appt of appts) {
      const prevCount = await this.prisma.appointment.count({
        where: {
          clinic_id: ctx.clinicId,
          patient_id: appt.patient_id,
          deleted_at: null,
          start_time: { lt: appt.start_time },
          status: AppointmentStatus.COMPLETED,
        },
      });

      if (prevCount > 0) continue;

      const hasBio = await this.prisma.patientMetrics.findFirst({
        where: {
          clinic_id: ctx.clinicId,
          patient_id: appt.patient_id,
          is_bioimpedance: true,
          deleted_at: null,
        },
      });

      if (!hasBio) {
        candidates.push({
          ruleKey: 'R4_MISSING_BIO',
          category: AlertCategory.CLINICAL_OPS,
          severity: AlertSeverity.MEDIUM,
          ownerRoleTarget: AlertOwnerRole.MEDICO,
          title: 'Bioimpedância ausente — primeira consulta',
          message: `${appt.patient.full_name} — primeira consulta sem bioimpedância registrada.`,
          rationale: [
            'Protocolo clínico: bioimpedância obrigatória na avaliação inicial',
            'Sem bioimpedância não é possível definir baseline para composição corporal',
            'Registrar antes ou durante a próxima consulta',
          ],
          suggestedActions: [
            { key: 'add_bioimpedance', label: 'Registrar Bioimpedância' },
          ],
          patientId: appt.patient_id,
          appointmentId: appt.id,
          dedupWindowDays: 14,
          metadata: { appointment_id: appt.id },
        });
      }
    }

    return candidates;
  }
}
