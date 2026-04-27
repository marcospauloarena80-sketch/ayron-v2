import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { EventsService } from '../events/events.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Injectable()
export class FinancialService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private events: EventsService,
  ) {}

  async findAll(clinicId: string, filters?: { type?: string; status?: string; from?: string; to?: string; page?: number; limit?: number }) {
    const page = Math.max(1, filters?.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters?.limit ?? 30));
    const where: any = { clinic_id: clinicId, deleted_at: null };
    if (filters?.type) where.type = filters.type;
    if (filters?.status) where.status = filters.status;
    if (filters?.from || filters?.to) {
      where.created_at = {};
      if (filters.from) where.created_at.gte = new Date(filters.from);
      if (filters.to) where.created_at.lte = new Date(filters.to);
    }
    const [data, total] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        where,
        include: { patient: { select: { id: true, full_name: true } } },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async findByPatient(clinicId: string, patientId: string, filters?: { status?: string; type?: string; page?: number; limit?: number }) {
    const page = Math.max(1, filters?.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters?.limit ?? 20));
    const where: any = { clinic_id: clinicId, patient_id: patientId, deleted_at: null };
    if (filters?.status) where.status = filters.status;
    if (filters?.type) where.type = filters.type;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getPatientBalance(clinicId: string, patientId: string) {
    const [pending, paid, refunded] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { clinic_id: clinicId, patient_id: patientId, type: 'REVENUE', status: 'PENDING', deleted_at: null },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.transaction.aggregate({
        where: { clinic_id: clinicId, patient_id: patientId, type: 'REVENUE', status: 'COMPLETED', deleted_at: null },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.transaction.aggregate({
        where: { clinic_id: clinicId, patient_id: patientId, type: 'REFUND', status: 'COMPLETED', deleted_at: null },
        _sum: { amount: true },
        _count: true,
      }),
    ]);
    const pendingAmount = Number(pending._sum.amount ?? 0);
    const paidAmount = Number(paid._sum.amount ?? 0);
    const refundedAmount = Number(refunded._sum.amount ?? 0);
    const creditAvailable = paidAmount + refundedAmount - pendingAmount;
    let status: 'EM_DIA' | 'DEVENDO' | 'CREDITO' = 'EM_DIA';
    if (pendingAmount > 0) status = 'DEVENDO';
    else if (creditAvailable > 0) status = 'CREDITO';
    return {
      pending_amount: pendingAmount,
      pending_count: pending._count,
      paid_amount: paidAmount,
      refunded_amount: refundedAmount,
      credit_available: Math.max(0, creditAvailable),
      status,
    };
  }

  async create(clinicId: string, dto: CreateTransactionDto, actorId: string) {
    const tx = await this.prisma.transaction.create({
      data: {
        clinic_id: clinicId,
        patient_id: dto.patient_id,
        appointment_id: dto.appointment_id,
        type: dto.type,
        status: 'PENDING',
        amount: dto.amount,
        payment_method: dto.payment_method,
        description: dto.description,
        category: dto.category,
        due_date: dto.due_date ? new Date(dto.due_date) : undefined,
        created_by: actorId,
      },
    });
    await Promise.all([
      this.audit.log({ clinic_id: clinicId, actor_id: actorId, action: 'CREATE', entity_type: 'Transaction', entity_id: tx.id }),
      this.events.emit({ clinic_id: clinicId, event_type: 'financial.transaction_created', entity_type: 'Transaction', entity_id: tx.id, actor_id: actorId }),
    ]);
    return tx;
  }

  async markPaid(clinicId: string, id: string, actorId: string, paymentMethod?: string) {
    const tx = await this.prisma.transaction.findFirst({ where: { id, clinic_id: clinicId, deleted_at: null } });
    if (!tx) throw new NotFoundException('Transaction not found');
    const updated = await this.prisma.transaction.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        paid_at: new Date(),
        ...(paymentMethod ? { payment_method: paymentMethod as any } : {}),
      },
    });
    await Promise.all([
      this.audit.log({ clinic_id: clinicId, actor_id: actorId, action: 'UPDATE', entity_type: 'Transaction', entity_id: id, data_after: { status: 'COMPLETED' } }),
      this.events.emit({ clinic_id: clinicId, event_type: 'financial.payment_completed', entity_type: 'Transaction', entity_id: id, actor_id: actorId }),
    ]);
    return updated;
  }

  async getDRE(clinicId: string, from: string, to: string) {
    const [revenues, expenses] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { clinic_id: clinicId, type: 'REVENUE', status: 'COMPLETED', paid_at: { gte: new Date(from), lte: new Date(to) } },
        _sum: { amount: true }, _count: true,
      }),
      this.prisma.transaction.aggregate({
        where: { clinic_id: clinicId, type: 'EXPENSE', status: 'COMPLETED', paid_at: { gte: new Date(from), lte: new Date(to) } },
        _sum: { amount: true }, _count: true,
      }),
    ]);
    const totalRevenue = Number(revenues._sum.amount ?? 0);
    const totalExpenses = Number(expenses._sum.amount ?? 0);
    return {
      period: { from, to },
      revenue: { total: totalRevenue, count: revenues._count },
      expenses: { total: totalExpenses, count: expenses._count },
      net_result: totalRevenue - totalExpenses,
      margin_pct: totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0,
    };
  }

  async getHealthScore(clinicId: string) {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const [revenue, overdue, pending] = await Promise.all([
      this.prisma.transaction.aggregate({ where: { clinic_id: clinicId, type: 'REVENUE', status: 'COMPLETED', paid_at: { gte: firstDay } }, _sum: { amount: true } }),
      this.prisma.transaction.count({ where: { clinic_id: clinicId, status: 'OVERDUE', due_date: { lt: now } } }),
      this.prisma.transaction.aggregate({ where: { clinic_id: clinicId, status: 'PENDING', deleted_at: null }, _sum: { amount: true } }),
    ]);
    return {
      monthly_revenue: Number(revenue._sum.amount ?? 0),
      overdue_count: overdue,
      pending_amount: Number(pending._sum.amount ?? 0),
    };
  }
}
