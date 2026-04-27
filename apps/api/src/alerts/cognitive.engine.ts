import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import {
  AlertSeverity,
  AlertStatus,
  AppointmentStatus,
  ProtocolStatus,
  TransactionStatus,
  TransactionType,
  WaitlistEntryStatus,
} from '@prisma/client';

export interface CognitiveScoreBreakdown {
  css: { score: number; components: Record<string, number> };
  rrs: { score: number; components: Record<string, number> };
  crs: number;
  financial_priority: number;
  nsp: number;
  dr30: number;
  clinical_trend: ClinicalTrendLabel;
  calculated_at: string;
}

export type BandLabel = 'GREEN' | 'YELLOW' | 'RED';
export type TrendLabel = 'UP' | 'DOWN' | 'FLAT';
export type ClinicalTrendLabel = 'UP' | 'DOWN' | 'STABLE';

export interface PlaybookAction {
  key: string;
  label: string;
  endpoint?: string;
  navigation?: string;
  priority: 'high' | 'normal';
}

export interface PatientBrief {
  patient_id: string;
  scores: {
    css: number;
    rrs: number;
    crs: number;
    band: BandLabel;
    trend: TrendLabel;
    nsp: number;
    dr30: number;
    clinical_trend: ClinicalTrendLabel;
  };
  top_3_factors: Array<{ key: string; weight: number }>;
  last_appointment: { id: string; start_time: Date; status: string } | null;
  next_appointment: { id: string; start_time: Date; status: string } | null;
  active_protocols: Array<{ id: string; name: string; status: string }>;
  implant_next_change: { id: string; next_change_date: Date | null } | null;
  pending_charges: number;
  recent_documents: Array<{ id: string; title: string; status: string; created_at: Date }>;
  open_alerts: Array<{ id: string; title: string; severity: string; score: number }>;
  playbook_actions: PlaybookAction[];
}

function cap(n: number): number {
  return Math.min(100, Math.max(0, n));
}

const PLAYBOOK_RED: PlaybookAction[] = [
  { key: 'open_scheduling', label: 'Priorizar retorno', navigation: '/agenda?patientId=:id', priority: 'high' },
  { key: 'add_waitlist', label: 'Waitlist prioridade alta', endpoint: '/cognitive/patients/:id/actions/add-waitlist', priority: 'high' },
  { key: 'financial_charge', label: 'Financeiro: cobrar', endpoint: '/cognitive/patients/:id/actions/create-financial-charge', priority: 'normal' },
  { key: 'mark_contacted', label: 'Marcar como contatado', endpoint: '/cognitive/patients/:id/actions/mark-contacted', priority: 'normal' },
];

const PLAYBOOK_YELLOW: PlaybookAction[] = [
  { key: 'open_scheduling', label: 'Sugerir retorno 7–14 dias', navigation: '/agenda?patientId=:id', priority: 'normal' },
  { key: 'review_protocol', label: 'Revisar protocolo/implante', navigation: '/patients/:id?tab=prontuario', priority: 'normal' },
];

const PLAYBOOK_GREEN: PlaybookAction[] = [
  { key: 'maintain_routine', label: 'Manter rotina (sem ação obrigatória)', priority: 'normal' },
];

@Injectable()
export class CognitiveEngine {
  private readonly logger = new Logger(CognitiveEngine.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // ── Scheduler ───────────────────────────────────────────────────────────────

  @Cron('*/15 * * * *')
  async runScheduled(): Promise<void> {
    const clinics = await this.prisma.clinic.findMany({
      where: { deleted_at: null },
      select: { id: true },
    });
    for (const clinic of clinics) {
      await this.runClinicScores(clinic.id).catch((e) =>
        this.logger.error(`Clinic ${clinic.id} scores failed`, e),
      );
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  async runClinicScores(clinicId: string): Promise<{ updated: number }> {
    const patients = await this.prisma.patient.findMany({
      where: { clinic_id: clinicId, deleted_at: null },
      select: { id: true },
    });

    let updated = 0;
    for (const p of patients) {
      await this.runPatientScore(p.id, clinicId);
      updated++;
    }
    this.logger.log(`CognitiveEngine: clinic=${clinicId}, updated=${updated} scores`);
    return { updated };
  }

  async runPatientScore(patientId: string, clinicId?: string): Promise<CognitiveScoreBreakdown> {
    if (!clinicId) {
      const p = await this.prisma.patient.findFirst({
        where: { id: patientId },
        select: { clinic_id: true },
      });
      if (!p) throw new Error(`Patient ${patientId} not found`);
      clinicId = p.clinic_id;
    }

    const [css, cssComponents] = await this.calcCSS(patientId, clinicId);
    const [rrs, rrsComponents] = await this.calcRRS(patientId, clinicId);
    const [financialPriority] = await this.calcFinancialPriority(patientId, clinicId);

    const crs = cap(Math.round(0.5 * css + 0.3 * rrs + 0.2 * financialPriority));

    const breakdown: CognitiveScoreBreakdown = {
      css: { score: css, components: cssComponents },
      rrs: { score: rrs, components: rrsComponents },
      crs,
      financial_priority: financialPriority,
      nsp: 0,
      dr30: 0,
      clinical_trend: 'STABLE',
      calculated_at: new Date().toISOString(),
    };

    // Load thresholds
    const thresholds = await this.getThresholds(clinicId);
    const band: BandLabel =
      crs >= thresholds.red ? 'RED' : crs >= thresholds.yellow ? 'YELLOW' : 'GREEN';

    // Load existing score for previous values
    const existing = await this.prisma.patientCognitiveScore.findFirst({
      where: { patient_id: patientId },
    });

    const prevCrs = existing?.composite_risk_score ?? crs;
    const trend: TrendLabel = crs > prevCrs ? 'UP' : crs < prevCrs ? 'DOWN' : 'FLAT';

    // Anti-flapping: count consecutive hits
    let consRed = existing?.consecutive_hits_red ?? 0;
    let consYellow = existing?.consecutive_hits_yellow ?? 0;

    if (band === 'RED') {
      consRed = Math.min(consRed + 1, 99);
      consYellow = 0;
    } else if (band === 'YELLOW') {
      consYellow = Math.min(consYellow + 1, 99);
      consRed = 0;
    } else {
      consRed = 0;
      consYellow = 0;
    }

    // Predictive fields
    const [nsp, dr30, clinicalTrend] = await Promise.all([
      this.calcNSP(patientId, clinicId, rrs, crs),
      this.calcDR30(patientId, clinicId, rrs, crs, consRed),
      this.calcCDT(patientId, clinicId, css, existing?.clinical_stability_score ?? css),
    ]);

    breakdown.nsp = nsp;
    breakdown.dr30 = dr30;
    breakdown.clinical_trend = clinicalTrend;

    // Emit audit when RED is confirmed (2+ consecutive hits)
    if (band === 'RED' && consRed >= 2 && (existing?.consecutive_hits_red ?? 0) < 2) {
      await this.audit.log({
        clinic_id: clinicId,
        entity_type: 'PATIENT',
        entity_id: patientId,
        action: 'UPDATE' as any,
        actor_id: 'SYSTEM',
        metadata: { event: 'RED_BAND_CONFIRMED', crs },
      });
    }

    await this.prisma.patientCognitiveScore.upsert({
      where: { patient_id: patientId },
      create: {
        clinic_id: clinicId,
        patient_id: patientId,
        clinical_stability_score: css,
        retention_risk_score: rrs,
        composite_risk_score: crs,
        calculated_at: new Date(),
        explanation_json: breakdown as any,
        score_previous: 0,
        score_trend: trend,
        current_band: band,
        consecutive_hits_red: consRed,
        consecutive_hits_yellow: consYellow,
        no_show_probability: nsp,
        dropout_risk_30d: dr30,
        clinical_trend: clinicalTrend,
      },
      update: {
        clinical_stability_score: css,
        retention_risk_score: rrs,
        composite_risk_score: crs,
        calculated_at: new Date(),
        explanation_json: breakdown as any,
        score_previous: prevCrs,
        score_trend: trend,
        current_band: band,
        consecutive_hits_red: consRed,
        consecutive_hits_yellow: consYellow,
        no_show_probability: nsp,
        dropout_risk_30d: dr30,
        clinical_trend: clinicalTrend,
      },
    });

    return breakdown;
  }

  // ── Brief ────────────────────────────────────────────────────────────────────

  async getPatientBrief(patientId: string, clinicId: string): Promise<PatientBrief> {
    const [
      scoreRecord,
      lastAppt,
      nextAppt,
      activeProtocols,
      nextImplant,
      pendingChargesAgg,
      recentDocs,
      openAlerts,
    ] = await Promise.all([
      this.prisma.patientCognitiveScore.findFirst({ where: { patient_id: patientId, clinic_id: clinicId } }),
      this.prisma.appointment.findFirst({
        where: { clinic_id: clinicId, patient_id: patientId, status: AppointmentStatus.COMPLETED, deleted_at: null },
        orderBy: { start_time: 'desc' },
        select: { id: true, start_time: true, status: true },
      }),
      this.prisma.appointment.findFirst({
        where: {
          clinic_id: clinicId,
          patient_id: patientId,
          status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED] },
          start_time: { gt: new Date() },
          deleted_at: null,
        },
        orderBy: { start_time: 'asc' },
        select: { id: true, start_time: true, status: true },
      }),
      this.prisma.treatmentProtocol.findMany({
        where: { clinic_id: clinicId, patient_id: patientId, status: ProtocolStatus.ATIVO, deleted_at: null },
        select: { id: true, name: true, status: true },
      }),
      this.prisma.hormoneImplant.findFirst({
        where: { clinic_id: clinicId, patient_id: patientId, deleted_at: null },
        orderBy: { next_change_date: 'asc' },
        select: { id: true, next_change_date: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          clinic_id: clinicId,
          patient_id: patientId,
          type: TransactionType.REVENUE,
          status: TransactionStatus.PENDING,
          deleted_at: null,
        },
        _sum: { amount: true },
      }),
      this.prisma.document.findMany({
        where: { clinic_id: clinicId, patient_id: patientId, deleted_at: null },
        orderBy: { created_at: 'desc' },
        take: 3,
        select: { id: true, title: true, status: true, created_at: true },
      }),
      this.prisma.alert.findMany({
        where: { clinic_id: clinicId, patient_id: patientId, status: AlertStatus.OPEN, deleted_at: null },
        orderBy: { score: 'desc' },
        take: 5,
        select: { id: true, title: true, severity: true, score: true },
      }),
    ]);

    const crs = scoreRecord?.composite_risk_score ?? 0;
    const band = (scoreRecord?.current_band ?? 'GREEN') as BandLabel;
    const trend = (scoreRecord?.score_trend ?? 'FLAT') as TrendLabel;

    // top 3 factors from explanation_json
    const explanation = (scoreRecord?.explanation_json ?? {}) as any;
    const allComponents: Array<{ key: string; weight: number }> = [];
    for (const [k, v] of Object.entries(explanation?.css?.components ?? {})) {
      allComponents.push({ key: k, weight: Number(v) });
    }
    for (const [k, v] of Object.entries(explanation?.rrs?.components ?? {})) {
      allComponents.push({ key: k, weight: Number(v) });
    }
    allComponents.sort((a, b) => b.weight - a.weight);
    const top3 = allComponents.slice(0, 3);

    const actions = await this.getPlaybookActions(crs, clinicId);

    return {
      patient_id: patientId,
      scores: {
        css: scoreRecord?.clinical_stability_score ?? 0,
        rrs: scoreRecord?.retention_risk_score ?? 0,
        crs,
        band,
        trend,
        nsp: scoreRecord?.no_show_probability ?? 0,
        dr30: scoreRecord?.dropout_risk_30d ?? 0,
        clinical_trend: (scoreRecord?.clinical_trend ?? 'STABLE') as ClinicalTrendLabel,
      },
      top_3_factors: top3,
      last_appointment: lastAppt
        ? { id: lastAppt.id, start_time: lastAppt.start_time, status: lastAppt.status }
        : null,
      next_appointment: nextAppt
        ? { id: nextAppt.id, start_time: nextAppt.start_time, status: nextAppt.status }
        : null,
      active_protocols: activeProtocols.map((p) => ({ id: p.id, name: p.name, status: p.status })),
      implant_next_change: nextImplant
        ? { id: nextImplant.id, next_change_date: nextImplant.next_change_date }
        : null,
      pending_charges: Number(pendingChargesAgg._sum.amount ?? 0),
      recent_documents: recentDocs.map((d) => ({
        id: d.id,
        title: d.title,
        status: d.status,
        created_at: d.created_at,
      })),
      open_alerts: openAlerts.map((a) => ({
        id: a.id,
        title: a.title,
        severity: a.severity,
        score: a.score,
      })),
      playbook_actions: actions,
    };
  }

  // ── Playbook ─────────────────────────────────────────────────────────────────

  async getPlaybookActions(crs: number, clinicId: string): Promise<PlaybookAction[]> {
    const thresholds = await this.getThresholds(clinicId);
    if (crs >= thresholds.red) return PLAYBOOK_RED;
    if (crs >= thresholds.yellow) return PLAYBOOK_YELLOW;
    return PLAYBOOK_GREEN;
  }

  private async getThresholds(clinicId: string): Promise<{ red: number; yellow: number }> {
    const config = await this.prisma.playbookConfig.findFirst({
      where: { clinic_id: clinicId },
    });
    if (config) {
      const t = config.thresholds as any;
      return { red: t.red ?? 70, yellow: t.yellow ?? 40 };
    }
    return { red: 70, yellow: 40 };
  }

  // ── Action dispatcher ────────────────────────────────────────────────────────

  async executeAction(
    patientId: string,
    clinicId: string,
    actionKey: string,
    actorId: string,
    params?: any,
  ): Promise<{ ok: boolean; result: any }> {
    switch (actionKey) {
      case 'add_waitlist': {
        const existing = await this.prisma.waitlistEntry.findFirst({
          where: { patient_id: patientId, clinic_id: clinicId, status: WaitlistEntryStatus.OPEN },
        });
        if (existing) {
          return { ok: true, result: { waitlist_id: existing.id, already_exists: true } };
        }
        const entry = await this.prisma.waitlistEntry.create({
          data: {
            clinic_id: clinicId,
            patient_id: patientId,
            reason: params?.reason ?? 'RETURN',
            priority_score: params?.priority === 'high' ? 100 : 50,
            status: WaitlistEntryStatus.OPEN,
          },
        });
        await this.audit.log({
          clinic_id: clinicId,
          entity_type: 'PATIENT',
          entity_id: patientId,
          action: 'CREATE' as any,
          actor_id: actorId,
          metadata: { event: 'ADD_WAITLIST', waitlist_id: entry.id },
        });
        return { ok: true, result: { waitlist_id: entry.id } };
      }

      case 'mark_contacted': {
        const entry = await this.prisma.waitlistEntry.findFirst({
          where: { patient_id: patientId, clinic_id: clinicId, status: WaitlistEntryStatus.OPEN },
        });
        if (entry) {
          await this.prisma.waitlistEntry.update({
            where: { id: entry.id },
            data: { status: WaitlistEntryStatus.CONTACTED },
          });
        }
        await this.audit.log({
          clinic_id: clinicId,
          entity_type: 'PATIENT',
          entity_id: patientId,
          action: 'UPDATE' as any,
          actor_id: actorId,
          metadata: { event: 'MARK_CONTACTED' },
        });
        return { ok: true, result: { contacted: true } };
      }

      case 'create_financial_charge': {
        // 409 if REVENUE+PENDING exists today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const existing = await this.prisma.transaction.findFirst({
          where: {
            clinic_id: clinicId,
            patient_id: patientId,
            type: TransactionType.REVENUE,
            status: TransactionStatus.PENDING,
            created_at: { gte: today },
            deleted_at: null,
          },
        });
        if (existing) {
          return { ok: false, result: { conflict: true, existing_id: existing.id } };
        }
        const tx = await this.prisma.transaction.create({
          data: {
            clinic_id: clinicId,
            patient_id: patientId,
            type: TransactionType.REVENUE,
            status: TransactionStatus.PENDING,
            amount: params?.amount ?? 0,
            description: params?.description ?? 'Cobrança criada via Cognitivo',
            created_by: actorId,
          },
        });
        await this.audit.log({
          clinic_id: clinicId,
          entity_type: 'TRANSACTION',
          entity_id: tx.id,
          action: 'CREATE' as any,
          actor_id: actorId,
          metadata: { event: 'CREATE_FINANCIAL_CHARGE', amount: tx.amount },
        });
        return { ok: true, result: { transaction_id: tx.id } };
      }

      default:
        return { ok: false, result: { error: `Unknown action: ${actionKey}` } };
    }
  }

  // ── NSP — No-Show Probability ────────────────────────────────────────────────

  async calcNSP(patientId: string, clinicId: string, rrs: number, crs: number): Promise<number> {
    let score = 0;
    const since90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // +20 se 2+ faltas/cancelamentos nos últimos 90d
    const missCount = await this.prisma.appointment.count({
      where: {
        clinic_id: clinicId,
        patient_id: patientId,
        status: { in: [AppointmentStatus.MISSED, AppointmentStatus.CANCELLED] },
        start_time: { gte: since90 },
        deleted_at: null,
      },
    });
    if (missCount >= 2) score += 20;

    // +20 se cancelamento tardio (cancelou com <24h de antecedência) nos últimos 30d
    const lateCancellations = await this.prisma.appointment.findMany({
      where: {
        clinic_id: clinicId,
        patient_id: patientId,
        status: AppointmentStatus.CANCELLED,
        start_time: { gte: since30 },
        deleted_at: null,
      },
      select: { start_time: true, updated_at: true },
    });
    const hasLateCancellation = lateCancellations.some(
      (a) => a.start_time.getTime() - a.updated_at.getTime() < 24 * 60 * 60 * 1000,
    );
    if (hasLateCancellation) score += 20;

    // +20 se RRS > 60
    if (rrs > 60) score += 20;

    // +20 se CRS > 70
    if (crs > 70) score += 20;

    // +20 se intervalo entre consultas > média × 1.5
    const completedAppts = await this.prisma.appointment.findMany({
      where: {
        clinic_id: clinicId,
        patient_id: patientId,
        status: AppointmentStatus.COMPLETED,
        deleted_at: null,
      },
      orderBy: { start_time: 'asc' },
      select: { start_time: true },
    });
    if (completedAppts.length >= 3) {
      const intervals: number[] = [];
      for (let i = 1; i < completedAppts.length; i++) {
        intervals.push(completedAppts[i].start_time.getTime() - completedAppts[i - 1].start_time.getTime());
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const lastInterval = Date.now() - completedAppts[completedAppts.length - 1].start_time.getTime();
      if (lastInterval > avgInterval * 1.5) score += 20;
    }

    return cap(score);
  }

  // ── DR30 — Dropout Risk 30d ──────────────────────────────────────────────────

  async calcDR30(
    patientId: string,
    clinicId: string,
    rrs: number,
    crs: number,
    consecutiveHitsRed: number,
  ): Promise<number> {
    let score = 0;
    const since14 = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    // +20 se CRS > 70 com 2+ hits consecutivos RED
    if (crs > 70 && consecutiveHitsRed >= 2) score += 20;

    // +20 se RRS > 70
    if (rrs > 70) score += 20;

    // +20 se sem agendamento futuro
    const futureAppt = await this.prisma.appointment.findFirst({
      where: {
        clinic_id: clinicId,
        patient_id: patientId,
        status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED] },
        start_time: { gt: new Date() },
        deleted_at: null,
      },
    });
    if (!futureAppt) score += 20;

    // +20 se >2 tasks OPEN/IN_PROGRESS de CONTACT ou SCHEDULE não resolvidas
    const openTasks = await this.prisma.task.count({
      where: {
        clinic_id: clinicId,
        patient_id: patientId,
        type: { in: ['CONTACT_PATIENT', 'SCHEDULE_VISIT'] as any },
        status: { in: ['OPEN', 'IN_PROGRESS'] as any },
      },
    });
    if (openTasks > 2) score += 20;

    // +20 se cobrança pendente > 14 dias
    const oldCharge = await this.prisma.transaction.findFirst({
      where: {
        clinic_id: clinicId,
        patient_id: patientId,
        type: TransactionType.REVENUE,
        status: TransactionStatus.PENDING,
        created_at: { lte: since14 },
        deleted_at: null,
      },
    });
    if (oldCharge) score += 20;

    return cap(score);
  }

  // ── CDT — Clinical Trend ─────────────────────────────────────────────────────

  async calcCDT(
    patientId: string,
    clinicId: string,
    cssNow: number,
    cssPrevious: number,
  ): Promise<ClinicalTrendLabel> {
    // Get recent weight metrics
    const metrics = await this.prisma.patientMetrics.findMany({
      where: { clinic_id: clinicId, patient_id: patientId, deleted_at: null, weight_kg: { not: null } },
      orderBy: { created_at: 'desc' },
      take: 6,
      select: { weight_kg: true, created_at: true },
    });

    if (metrics.length < 2) return 'STABLE';

    const latest = Number(metrics[0].weight_kg);
    const oldest = Number(metrics[metrics.length - 1].weight_kg);
    const variation = oldest > 0 ? ((latest - oldest) / oldest) * 100 : 0;

    // DOWN: peso caiu >5% E alerta HIGH/CRITICAL ativo
    if (variation < -5) {
      const highAlert = await this.prisma.alert.count({
        where: {
          clinic_id: clinicId,
          patient_id: patientId,
          status: { in: [AlertStatus.OPEN, AlertStatus.ACKNOWLEDGED] },
          severity: { in: [AlertSeverity.HIGH, AlertSeverity.CRITICAL] },
          deleted_at: null,
        },
      });
      if (highAlert > 0) return 'DOWN';
    }

    // UP: peso subiu ≥5% E CSS decrescente (cssPrevious > cssNow) E sem alerta crítico
    if (variation >= 5 && cssPrevious > cssNow) {
      const criticalAlert = await this.prisma.alert.count({
        where: {
          clinic_id: clinicId,
          patient_id: patientId,
          status: AlertStatus.OPEN,
          severity: { in: [AlertSeverity.HIGH, AlertSeverity.CRITICAL] },
          deleted_at: null,
        },
      });
      if (criticalAlert === 0) return 'UP';
    }

    return 'STABLE';
  }

  // ── CSS — Clinical Stability Score ──────────────────────────────────────────

  private async calcCSS(patientId: string, clinicId: string): Promise<[number, Record<string, number>]> {
    const components: Record<string, number> = {};
    let score = 0;

    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const activeProtocol = await this.prisma.treatmentProtocol.findFirst({
      where: { clinic_id: clinicId, patient_id: patientId, status: ProtocolStatus.ATIVO, deleted_at: null },
    });

    if (activeProtocol) {
      const lastAppt = await this.prisma.appointment.findFirst({
        where: {
          clinic_id: clinicId,
          patient_id: patientId,
          status: AppointmentStatus.COMPLETED,
          deleted_at: null,
          start_time: { gte: since30 },
        },
      });
      if (!lastAppt) {
        components['no_return_active_protocol'] = 20;
        score += 20;
      }
    }

    const implantDue = await this.prisma.hormoneImplant.findFirst({
      where: {
        clinic_id: clinicId,
        patient_id: patientId,
        deleted_at: null,
        next_change_date: { lte: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), gte: new Date() },
      },
    });
    if (implantDue) {
      components['implant_due_soon'] = 20;
      score += 20;
    }

    const recentMetrics = await this.prisma.patientMetrics.findMany({
      where: { clinic_id: clinicId, patient_id: patientId, deleted_at: null, weight_kg: { not: null } },
      orderBy: { created_at: 'desc' },
      take: 6,
      select: { weight_kg: true, created_at: true },
    });

    if (recentMetrics.length >= 2) {
      const latest = Number(recentMetrics[0].weight_kg);
      const oldest = Number(recentMetrics[recentMetrics.length - 1].weight_kg);
      if (oldest > 0) {
        const variation = ((latest - oldest) / oldest) * 100;
        if (variation < -5) {
          const protocolAdjusted = await this.prisma.treatmentProtocol.findFirst({
            where: {
              clinic_id: clinicId,
              patient_id: patientId,
              updated_at: { gte: recentMetrics[recentMetrics.length - 1].created_at },
            },
          });
          if (!protocolAdjusted) {
            components['weight_drop_no_adjustment'] = 20;
            score += 20;
          }
        }
      }
    }

    const firstAppt = await this.prisma.appointment.findFirst({
      where: { clinic_id: clinicId, patient_id: patientId, deleted_at: null },
      orderBy: { start_time: 'asc' },
    });
    if (firstAppt) {
      const hasBio = await this.prisma.patientMetrics.findFirst({
        where: { clinic_id: clinicId, patient_id: patientId, is_bioimpedance: true, deleted_at: null },
      });
      if (!hasBio) {
        components['missing_bioimpedance'] = 10;
        score += 10;
      }
    }

    const highAlerts = await this.prisma.alert.count({
      where: {
        clinic_id: clinicId,
        patient_id: patientId,
        status: { in: [AlertStatus.OPEN, AlertStatus.ACKNOWLEDGED] },
        severity: { in: [AlertSeverity.HIGH, AlertSeverity.CRITICAL] },
        deleted_at: null,
      },
    });
    if (highAlerts > 0) {
      components['active_high_critical_alerts'] = 20;
      score += 20;
    }

    return [cap(score), components];
  }

  // ── RRS — Retention Risk Score ───────────────────────────────────────────────

  private async calcRRS(patientId: string, clinicId: string): Promise<[number, Record<string, number>]> {
    const components: Record<string, number> = {};
    let score = 0;

    const since90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const pendingCharge = await this.prisma.transaction.findFirst({
      where: {
        clinic_id: clinicId,
        patient_id: patientId,
        type: TransactionType.REVENUE,
        status: TransactionStatus.PENDING,
        created_at: { lte: since7 },
        deleted_at: null,
      },
    });
    if (pendingCharge) {
      components['pending_charge_7d'] = 20;
      score += 20;
    }

    const missCount = await this.prisma.appointment.count({
      where: {
        clinic_id: clinicId,
        patient_id: patientId,
        status: { in: [AppointmentStatus.MISSED, AppointmentStatus.CANCELLED] },
        deleted_at: null,
        start_time: { gte: since90 },
      },
    });
    if (missCount >= 2) {
      components['multiple_misses_90d'] = 20;
      score += 20;
    }

    const completedAppts = await this.prisma.appointment.findMany({
      where: {
        clinic_id: clinicId,
        patient_id: patientId,
        status: AppointmentStatus.COMPLETED,
        deleted_at: null,
      },
      orderBy: { start_time: 'asc' },
      select: { start_time: true },
    });

    if (completedAppts.length >= 3) {
      const intervals: number[] = [];
      for (let i = 1; i < completedAppts.length; i++) {
        intervals.push(completedAppts[i].start_time.getTime() - completedAppts[i - 1].start_time.getTime());
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const lastInterval =
        completedAppts.length >= 2
          ? Date.now() - completedAppts[completedAppts.length - 1].start_time.getTime()
          : 0;
      if (lastInterval > avgInterval * 1.5) {
        components['interval_above_average'] = 20;
        score += 20;
      }
    }

    const dismissedCount = await this.prisma.alert.count({
      where: {
        clinic_id: clinicId,
        patient_id: patientId,
        status: AlertStatus.DISMISSED,
      },
    });
    if (dismissedCount > 3) {
      components['many_dismissed_alerts'] = 20;
      score += 20;
    }

    const hasActiveProtocol = await this.prisma.treatmentProtocol.findFirst({
      where: { clinic_id: clinicId, patient_id: patientId, status: ProtocolStatus.ATIVO, deleted_at: null },
    });
    if (hasActiveProtocol) {
      const futureAppt = await this.prisma.appointment.findFirst({
        where: {
          clinic_id: clinicId,
          patient_id: patientId,
          status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED] },
          start_time: { gt: new Date() },
          deleted_at: null,
        },
      });
      if (!futureAppt) {
        components['no_future_appt_active_protocol'] = 20;
        score += 20;
      }
    }

    return [cap(score), components];
  }

  // ── Financial Priority ───────────────────────────────────────────────────────

  private async calcFinancialPriority(patientId: string, clinicId: string): Promise<[number]> {
    const pending = await this.prisma.transaction.aggregate({
      where: {
        clinic_id: clinicId,
        patient_id: patientId,
        type: TransactionType.REVENUE,
        status: TransactionStatus.PENDING,
        deleted_at: null,
      },
      _sum: { amount: true },
    });

    const total = Number(pending._sum.amount ?? 0);
    return [cap(Math.round(Math.min(total / 10, 100)))];
  }

  // ── On-event trigger ─────────────────────────────────────────────────────────

  async onEvent(clinicId: string, event: { type: string; patientId?: string }): Promise<void> {
    if (!event.patientId) return;
    const triggers = ['CHECKOUT', 'PAYMENT', 'IMPLANT_APPLIED', 'APPOINTMENT_SCHEDULED'];
    if (triggers.includes(event.type)) {
      await this.runPatientScore(event.patientId, clinicId).catch((e) =>
        this.logger.error(`onEvent score failed`, e),
      );
    }
  }
}
