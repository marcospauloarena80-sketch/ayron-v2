import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AlertCategory, AlertOwnerRole, AlertSeverity } from '@prisma/client';
import { AlertCandidate, RuleContext } from './rule.types';

@Injectable()
export class SchedulingRules {
  constructor(private prisma: PrismaService) {}

  /**
   * R7 — Slot vago: listar top candidatos da fila de espera
   */
  async checkSlotCandidates(
    ctx: RuleContext,
    slotDate: Date,
    professionalId?: string,
  ): Promise<AlertCandidate[]> {
    const maxCandidates = ctx.params['max_candidates'] ?? 5;

    // Fetch open waitlist entries sorted by priority_score desc, created_at asc
    const waitlist = await this.prisma.waitlistEntry.findMany({
      where: {
        clinic_id: ctx.clinicId,
        status: 'OPEN',
        resolved_at: null,
      },
      include: { patient: { select: { id: true, full_name: true } } },
      orderBy: [{ priority_score: 'desc' }, { created_at: 'asc' }],
      take: maxCandidates,
    });

    if (waitlist.length === 0) return [];

    const dayOfWeek = slotDate.getDay(); // 0=Sun, 1=Mon...
    const hour = slotDate.getHours();

    // Filter by preferences (if provided)
    const compatible = waitlist.filter((entry) => {
      const prefDays = (entry.preferred_days_json as number[] | null) ?? null;
      if (prefDays && !prefDays.includes(dayOfWeek)) return false;

      const shift = entry.preferred_shift;
      if (shift) {
        if (shift === 'manha' && (hour < 7 || hour >= 12)) return false;
        if (shift === 'tarde' && (hour < 12 || hour >= 18)) return false;
        if (shift === 'noite' && hour < 18) return false;
      }
      return true;
    });

    const candidates = compatible.length > 0 ? compatible : waitlist.slice(0, 3);

    const names = candidates
      .slice(0, 5)
      .map((e, i) => `${i + 1}. ${e.patient.full_name} (score: ${e.priority_score})`)
      .join('\n');

    return [
      {
        ruleKey: 'R7_SLOT_CANDIDATES',
        category: AlertCategory.SCHEDULING,
        severity: AlertSeverity.MEDIUM,
        ownerRoleTarget: AlertOwnerRole.GERENTE,
        title: 'Slot disponível — candidatos para encaixe',
        message: `${candidates.length} candidato(s) compatível(is) com o slot de ${slotDate.toLocaleString('pt-BR')}.`,
        rationale: [
          `Slot disponível em ${slotDate.toLocaleString('pt-BR')}`,
          `${waitlist.length} paciente(s) na fila de espera`,
          `Filtro por preferência de dia/turno aplicado`,
        ],
        suggestedActions: [
          { key: 'schedule_slot', label: 'Agendar Encaixe' },
          { key: 'contact_candidate', label: 'Registrar Contato' },
          { key: 'snooze', label: 'Adiar 7 dias' },
        ],
        dedupWindowDays: 1,
        metadata: {
          slot_date: slotDate.toISOString(),
          professional_id: professionalId,
          candidates: candidates.map((e) => ({
            patient_id: e.patient_id,
            patient_name: e.patient.full_name,
            reason: e.reason,
            priority_score: e.priority_score,
            waitlist_id: e.id,
          })),
        },
      },
    ];
  }
}
