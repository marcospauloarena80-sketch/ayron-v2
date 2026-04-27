import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AlertCategory, AlertOwnerRole, AlertSeverity, AppointmentStatus, TransactionType, TransactionStatus } from '@prisma/client';
import { AlertCandidate, RuleContext } from './rule.types';

@Injectable()
export class FinancialRules {
  constructor(private prisma: PrismaService) {}

  async checkPendingCharge(ctx: RuleContext): Promise<AlertCandidate[]> {
    const overdueDays = ctx.params['overdue_days'] ?? 7;
    const since = new Date(Date.now() - overdueDays * 24 * 60 * 60 * 1000);

    const charges = await this.prisma.transaction.findMany({
      where: {
        clinic_id: ctx.clinicId,
        type: TransactionType.REVENUE,
        status: TransactionStatus.PENDING,
        created_at: { lte: since },
        deleted_at: null,
      },
      include: { patient: { select: { id: true, full_name: true } } },
    });

    return charges.map((charge) => ({
      ruleKey: 'R5_PENDING_CHARGE',
      category: AlertCategory.FINANCIAL_OPS,
      severity: AlertSeverity.HIGH,
      ownerRoleTarget: AlertOwnerRole.GERENTE,
      title: `Cobrança pendente há mais de ${overdueDays} dias`,
      message: `${charge.patient?.full_name ?? 'Paciente'} — valor R$${Number(charge.amount).toFixed(2)} pendente desde ${charge.created_at.toLocaleDateString('pt-BR')}.`,
      rationale: [
        `Cobrança de R$${Number(charge.amount).toFixed(2)} gerada há mais de ${overdueDays} dias`,
        'Status atual: PENDING — sem registro de pagamento',
        'Verificar com o paciente e registrar pagamento ou negociar',
      ],
      suggestedActions: [
        { key: 'register_payment', label: 'Registrar Pagamento' },
        { key: 'contact_patient', label: 'Contatar Paciente' },
      ],
      patientId: charge.patient_id ?? undefined,
      dedupWindowDays: 3,
      metadata: { transaction_id: charge.id, amount: charge.amount },
    }));
  }

  async checkCheckoutNoCharge(ctx: RuleContext, appointmentId?: string): Promise<AlertCandidate[]> {
    const where: any = {
      clinic_id: ctx.clinicId,
      status: AppointmentStatus.COMPLETED,
      deleted_at: null,
    };

    if (appointmentId) {
      where.id = appointmentId;
    } else {
      const cutoff = new Date(Date.now() - 1 * 60 * 60 * 1000);
      where.end_time = { gte: cutoff };
    }

    const appts = await this.prisma.appointment.findMany({
      where,
      include: { patient: { select: { id: true, full_name: true } } },
    });

    const candidates: AlertCandidate[] = [];

    for (const appt of appts) {
      const charge = await this.prisma.transaction.findFirst({
        where: {
          clinic_id: ctx.clinicId,
          appointment_id: appt.id,
          type: TransactionType.REVENUE,
          deleted_at: null,
        },
      });

      if (!charge) {
        candidates.push({
          ruleKey: 'R6_CHECKOUT_NO_CHARGE',
          category: AlertCategory.FINANCIAL_OPS,
          severity: AlertSeverity.CRITICAL,
          ownerRoleTarget: AlertOwnerRole.GERENTE,
          title: 'Consulta finalizada sem cobrança registrada',
          message: `${appt.patient?.full_name ?? 'Paciente'} — consulta finalizada sem cobrança.`,
          rationale: [
            'Consulta com status COMPLETED',
            'Nenhuma cobrança (REVENUE) foi associada a esta consulta',
            'Falha operacional: possível perda de receita',
          ],
          suggestedActions: [
            { key: 'create_charge', label: 'Criar Cobrança' },
          ],
          patientId: appt.patient_id,
          appointmentId: appt.id,
          dedupWindowDays: 1,
          metadata: { appointment_id: appt.id },
        });
      }
    }

    return candidates;
  }
}
