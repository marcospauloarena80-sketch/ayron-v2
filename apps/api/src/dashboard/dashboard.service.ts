import { Injectable } from '@nestjs/common';
import { AppointmentStatus, TransactionStatus, TransactionType } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getOverview(clinicId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      todayAppointments,
      checkedIn,
      completed,
      cancelled,
      newPatientsMonth,
      totalActivePatients,
      pendingBilling,
      monthlyRevenue,
      lowStockItems,
      pendingDecisions,
      executive,
    ] = await Promise.all([
      this.prisma.appointment.count({ where: { clinic_id: clinicId, start_time: { gte: today, lt: tomorrow }, deleted_at: null } }),
      this.prisma.appointment.count({ where: { clinic_id: clinicId, status: AppointmentStatus.CHECKED_IN, start_time: { gte: today, lt: tomorrow } } }),
      this.prisma.appointment.count({ where: { clinic_id: clinicId, status: AppointmentStatus.COMPLETED, start_time: { gte: today, lt: tomorrow } } }),
      this.prisma.appointment.count({ where: { clinic_id: clinicId, status: AppointmentStatus.CANCELLED, start_time: { gte: today, lt: tomorrow } } }),
      this.prisma.patient.count({ where: { clinic_id: clinicId, created_at: { gte: firstDayOfMonth }, deleted_at: null } }),
      this.prisma.patient.count({ where: { clinic_id: clinicId, is_active: true, deleted_at: null } }),
      this.prisma.transaction.aggregate({ where: { clinic_id: clinicId, status: TransactionStatus.PENDING }, _sum: { amount: true }, _count: true }),
      this.prisma.transaction.aggregate({ where: { clinic_id: clinicId, type: TransactionType.REVENUE, status: TransactionStatus.COMPLETED, paid_at: { gte: firstDayOfMonth } }, _sum: { amount: true } }),
      this.prisma.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*) as count FROM inventory_items WHERE clinic_id = ${clinicId}::uuid AND deleted_at IS NULL AND quantity <= minimum_level`,
      this.prisma.decisionProposal.count({ where: { clinic_id: clinicId, status: 'PENDING_APPROVAL' } }),
      this.getExecutiveMetrics(clinicId),
    ]);

    const occupationRate = todayAppointments > 0 ? Math.round(((completed + checkedIn) / todayAppointments) * 100) : 0;

    return {
      today: { total: todayAppointments, checked_in: checkedIn, completed, cancelled, occupation_rate: occupationRate },
      patients: { active: totalActivePatients, new_this_month: newPatientsMonth },
      financial: { monthly_revenue: Number(monthlyRevenue._sum.amount ?? 0), pending_amount: Number(pendingBilling._sum.amount ?? 0), pending_count: pendingBilling._count },
      alerts: { low_stock: Number((lowStockItems as any[])[0]?.count ?? 0), pending_decisions: pendingDecisions },
      executive,
    };
  }

  async getExecutiveMetrics(clinicId: string) {
    const now = new Date();
    const since30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const since14 = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const in14 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    // Start of current week (Monday)
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const [
      pendingRevenue,
      completedLast30agg,
      activePatientsWithAppt,
      totalActive,
      highDropoutCount,
      appointmentsThisWeek,
      occupation14Count,
    ] = await Promise.all([
      // Receita projetada: charges pendentes
      this.prisma.transaction.aggregate({
        where: { clinic_id: clinicId, type: TransactionType.REVENUE, status: TransactionStatus.PENDING, deleted_at: null },
        _sum: { amount: true },
      }),
      // Receita completada últimos 30d para estimar diária
      this.prisma.transaction.aggregate({
        where: { clinic_id: clinicId, type: TransactionType.REVENUE, status: TransactionStatus.COMPLETED, paid_at: { gte: since30 }, deleted_at: null },
        _sum: { amount: true },
      }),
      // Retention: pacientes com consulta nos últimos 30d
      this.prisma.appointment.groupBy({
        by: ['patient_id'],
        where: { clinic_id: clinicId, status: AppointmentStatus.COMPLETED, start_time: { gte: since30 }, deleted_at: null },
        _count: true,
      }),
      // Total ativos
      this.prisma.patient.count({ where: { clinic_id: clinicId, is_active: true, deleted_at: null } }),
      // DR30 > 70
      this.prisma.patientCognitiveScore.count({
        where: { clinic_id: clinicId, dropout_risk_30d: { gt: 70 } },
      }),
      // Agendamentos desta semana para NSP médio
      this.prisma.appointment.findMany({
        where: {
          clinic_id: clinicId,
          start_time: { gte: weekStart, lt: weekEnd },
          status: { notIn: [AppointmentStatus.CANCELLED] },
          deleted_at: null,
        },
        select: { patient_id: true },
      }),
      // Ocupação 14 dias
      this.prisma.appointment.count({
        where: {
          clinic_id: clinicId,
          start_time: { gte: now, lte: in14 },
          status: { notIn: [AppointmentStatus.CANCELLED] },
          deleted_at: null,
        },
      }),
    ]);

    // Projected revenue 30d: pending + (completed_30d / 30) × remaining days in month
    const pendingAmt = Number(pendingRevenue._sum.amount ?? 0);
    const completed30Amt = Number(completedLast30agg._sum.amount ?? 0);
    const dailyAvg = completed30Amt / 30;
    const daysLeftInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
    const projectedRevenue30d = Math.round(pendingAmt + dailyAvg * daysLeftInMonth);

    // Retention rate
    const retainedPatientIds = new Set(activePatientsWithAppt.map((r) => r.patient_id));
    const retentionRate = totalActive > 0 ? Math.round((retainedPatientIds.size / totalActive) * 100) : 0;

    // Avg NSP this week
    let avgNspThisWeek = 0;
    if (appointmentsThisWeek.length > 0) {
      const patientIds = [...new Set(appointmentsThisWeek.map((a) => a.patient_id))];
      const scores = await this.prisma.patientCognitiveScore.findMany({
        where: { clinic_id: clinicId, patient_id: { in: patientIds } },
        select: { no_show_probability: true },
      });
      if (scores.length > 0) {
        avgNspThisWeek = Math.round(scores.reduce((s, r) => s + r.no_show_probability, 0) / scores.length);
      }
    }

    // Occupation 14d (default capacity: 8 slots/day × 14 = 112)
    const capacity14d = 8 * 14;
    const occupation14d = Math.min(100, Math.round((occupation14Count / capacity14d) * 100));

    return {
      projected_revenue_30d: projectedRevenue30d,
      retention_rate: retentionRate,
      high_dropout_count: highDropoutCount,
      avg_nsp_this_week: avgNspThisWeek,
      occupation_14d: occupation14d,
    };
  }

  async getWeeklyChart(clinicId: string) {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      d.setHours(0, 0, 0, 0);
      return d;
    });
    const results = await Promise.all(
      days.map(async (day) => {
        const next = new Date(day);
        next.setDate(next.getDate() + 1);
        const [appts, revenue] = await Promise.all([
          this.prisma.appointment.count({ where: { clinic_id: clinicId, start_time: { gte: day, lt: next }, status: AppointmentStatus.COMPLETED } }),
          this.prisma.transaction.aggregate({ where: { clinic_id: clinicId, type: TransactionType.REVENUE, status: TransactionStatus.COMPLETED, paid_at: { gte: day, lt: next } }, _sum: { amount: true } }),
        ]);
        return { date: day.toISOString().split('T')[0], appointments: appts, revenue: Number(revenue._sum.amount ?? 0) };
      }),
    );
    return results;
  }
}
