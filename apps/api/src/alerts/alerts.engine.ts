import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { AlertSeverity, AlertStatus } from '@prisma/client';
import { ClinicalRules } from './rules/clinical.rules';
import { FinancialRules } from './rules/financial.rules';
import { SchedulingRules } from './rules/scheduling.rules';
import { AlertCandidate, RuleContext } from './rules/rule.types';
import * as crypto from 'crypto';

const SEVERITY_SCORE: Record<AlertSeverity, number> = {
  [AlertSeverity.INFO]: 10,
  [AlertSeverity.LOW]: 25,
  [AlertSeverity.MEDIUM]: 50,
  [AlertSeverity.HIGH]: 75,
  [AlertSeverity.CRITICAL]: 95,
};

const COOLDOWN_MS = 12 * 60 * 60 * 1000;

export function calculateScore(candidate: AlertCandidate): number {
  let score = SEVERITY_SCORE[candidate.severity] ?? 10;
  const meta = candidate.metadata ?? {};
  if (meta['protocol_id']) score += 10;
  if (meta['implant_id']) score += 15;
  if (candidate.ruleKey === 'R5_PENDING_CHARGE') score += 10;
  if (candidate.dueAt) {
    const daysLeft = (candidate.dueAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
    if (daysLeft <= 7 && daysLeft >= 0) {
      score += Math.round((1 - daysLeft / 7) * 20);
    }
  }
  return Math.min(score, 100);
}

@Injectable()
export class AlertsEngine {
  private readonly logger = new Logger(AlertsEngine.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private clinicalRules: ClinicalRules,
    private financialRules: FinancialRules,
    private schedulingRules: SchedulingRules,
  ) {}

  async runRulesForClinic(clinicId: string): Promise<{ created: number; updated: number; skipped: number }> {
    let created = 0;
    let updated = 0;
    let skipped = 0;

    const ruleConfigs = await this.prisma.alertRuleConfig.findMany({ where: { clinic_id: clinicId } });
    const configMap = new Map(ruleConfigs.map((c) => [c.rule_key, c]));

    const isEnabled = (k: string) => (configMap.get(k)?.enabled ?? true);
    const getParams = (k: string): Record<string, any> => (configMap.get(k)?.params as Record<string, any>) ?? {};
    const ctx = (k: string): RuleContext => ({ clinicId, params: getParams(k) });

    const all: AlertCandidate[] = [];

    try {
      if (isEnabled('R1_NO_RETURN')) all.push(...await this.clinicalRules.checkNoReturn(ctx('R1_NO_RETURN')));
      if (isEnabled('R2_IMPLANT_DUE')) all.push(...await this.clinicalRules.checkImplantDue(ctx('R2_IMPLANT_DUE')));
      if (isEnabled('R3_MISSING_DOC')) all.push(...await this.clinicalRules.checkMissingDocument(ctx('R3_MISSING_DOC')));
      if (isEnabled('R4_MISSING_BIO')) all.push(...await this.clinicalRules.checkMissingBioimpedance(ctx('R4_MISSING_BIO')));
      if (isEnabled('R5_PENDING_CHARGE')) all.push(...await this.financialRules.checkPendingCharge(ctx('R5_PENDING_CHARGE')));
      if (isEnabled('R6_CHECKOUT_NO_CHARGE')) all.push(...await this.financialRules.checkCheckoutNoCharge(ctx('R6_CHECKOUT_NO_CHARGE')));
    } catch (err) {
      this.logger.error(`Rules error clinic ${clinicId}`, err);
    }

    for (const c of all) {
      const r = await this.upsertAlert(clinicId, c);
      if (r === 'created') created++;
      else if (r === 'updated') updated++;
      else skipped++;
    }

    this.logger.log(`Clinic ${clinicId}: created=${created}, updated=${updated}, skipped=${skipped}`);
    return { created, updated, skipped };
  }

  async runOnEvent(clinicId: string, event: { type: string; appointmentId?: string }): Promise<void> {
    const ctx = (): RuleContext => ({ clinicId, params: {} });
    try {
      if (event.type === 'CHECKOUT' && event.appointmentId) {
        const docs = await this.clinicalRules.checkMissingDocument(ctx(), event.appointmentId);
        const charges = await this.financialRules.checkCheckoutNoCharge(ctx(), event.appointmentId);
        const bio = await this.clinicalRules.checkMissingBioimpedance(ctx(), event.appointmentId);
        for (const c of [...docs, ...charges, ...bio]) {
          await this.upsertAlert(clinicId, c);
        }
      }
    } catch (err) {
      this.logger.error(`onEvent error`, err);
    }
  }

  private buildDedupKey(clinicId: string, candidate: AlertCandidate): string {
    const windowDays = candidate.dedupWindowDays ?? 1;
    const slot = Math.floor(Date.now() / (windowDays * 24 * 60 * 60 * 1000));
    const raw = `${clinicId}:${candidate.patientId ?? 'nil'}:${candidate.ruleKey}:${slot}`;
    return crypto.createHash('sha256').update(raw).digest('hex').substring(0, 64);
  }

  private severityRank(s: AlertSeverity): number {
    const map: Record<AlertSeverity, number> = { INFO: 0, LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
    return map[s] ?? 0;
  }

  private async upsertAlert(clinicId: string, candidate: AlertCandidate): Promise<'created' | 'updated' | 'skipped'> {
    const score = calculateScore(candidate);
    const now = new Date();

    const existing = await this.prisma.alert.findFirst({
      where: {
        clinic_id: clinicId,
        patient_id: candidate.patientId ?? null,
        rule_key: candidate.ruleKey,
        status: { in: [AlertStatus.OPEN, AlertStatus.SNOOZED, AlertStatus.ACKNOWLEDGED] },
      },
    });

    if (existing) {
      const cooldownExpired =
        !existing.last_triggered_at ||
        now.getTime() - existing.last_triggered_at.getTime() > COOLDOWN_MS;
      const severityEscalated = this.severityRank(candidate.severity) > this.severityRank(existing.severity);

      if (!cooldownExpired && !severityEscalated) return 'skipped';

      await this.prisma.alert.update({
        where: { id: existing.id },
        data: {
          message: candidate.message,
          rationale: candidate.rationale as any,
          suggested_actions: candidate.suggestedActions as any,
          metadata: candidate.metadata as any,
          score,
          severity: candidate.severity,
          last_triggered_at: now,
          due_at: candidate.dueAt ?? null,
        },
      });

      await this.prisma.alertActionLog.create({
        data: { alert_id: existing.id, clinic_id: clinicId, user_id: 'SYSTEM', action: 'SYSTEM_UPDATE', note: `score=${score}` },
      });

      return 'updated';
    }

    const dedupKey = this.buildDedupKey(clinicId, candidate);

    try {
      await this.prisma.alert.create({
        data: {
          clinic_id: clinicId,
          patient_id: candidate.patientId ?? null,
          appointment_id: candidate.appointmentId ?? null,
          rule_key: candidate.ruleKey,
          category: candidate.category,
          severity: candidate.severity,
          owner_role_target: candidate.ownerRoleTarget,
          title: candidate.title,
          message: candidate.message,
          rationale: candidate.rationale as any,
          suggested_actions: candidate.suggestedActions as any,
          metadata: candidate.metadata as any,
          dedup_key: dedupKey,
          score,
          last_triggered_at: now,
          due_at: candidate.dueAt ?? null,
          status: AlertStatus.OPEN,
        },
      });
    } catch (err: any) {
      if (err?.code === 'P2002') return 'skipped';
      throw err;
    }

    return 'created';
  }
}
