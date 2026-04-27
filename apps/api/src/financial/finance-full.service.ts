import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { ReceivableStatus, PayableStatus, LedgerEntryType } from '@prisma/client';

function pag(page = 1, limit = 30) {
  const p = Math.max(1, page);
  const l = Math.min(100, Math.max(1, limit));
  return { skip: (p - 1) * l, take: l, page: p, limit: l };
}

@Injectable()
export class FinanceFullService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // ── Contas (FinancialAccount) ────────────────────────────────────────────────

  async listAccounts(clinicId: string) {
    return this.prisma.financialAccount.findMany({
      where: { clinic_id: clinicId, deleted_at: null },
      orderBy: { name: 'asc' },
    });
  }

  async createAccount(clinicId: string, dto: { name: string; type?: string; currency?: string }, userId: string) {
    const account = await this.prisma.financialAccount.create({
      data: { clinic_id: clinicId, name: dto.name, type: (dto.type as any) ?? 'CASH', currency: dto.currency ?? 'BRL' },
    });
    await this.audit.log({ clinic_id: clinicId, actor_id: userId, action: 'CREATE' as any, entity_type: 'FinancialAccount', entity_id: account.id });
    return account;
  }

  async updateAccount(clinicId: string, id: string, dto: { name?: string; is_active?: boolean }, userId: string) {
    const account = await this.prisma.financialAccount.findFirst({ where: { id, clinic_id: clinicId, deleted_at: null } });
    if (!account) throw new NotFoundException('Conta não encontrada');
    const updated = await this.prisma.financialAccount.update({ where: { id }, data: dto });
    await this.audit.log({ clinic_id: clinicId, actor_id: userId, action: 'UPDATE' as any, entity_type: 'FinancialAccount', entity_id: id });
    return updated;
  }

  // ── Counterparties ────────────────────────────────────────────────────────────

  async listCounterparties(clinicId: string, search?: string) {
    const where: any = { clinic_id: clinicId, deleted_at: null };
    if (search) where.name = { contains: search, mode: 'insensitive' };
    return this.prisma.counterparty.findMany({ where, orderBy: { name: 'asc' } });
  }

  async createCounterparty(clinicId: string, dto: { type?: string; name: string; patient_id?: string; document_id?: string }, userId: string) {
    const cp = await this.prisma.counterparty.create({
      data: { clinic_id: clinicId, type: (dto.type as any) ?? 'OTHER', name: dto.name, patient_id: dto.patient_id, document_id: dto.document_id },
    });
    await this.audit.log({ clinic_id: clinicId, actor_id: userId, action: 'CREATE' as any, entity_type: 'Counterparty', entity_id: cp.id });
    return cp;
  }

  // ── Receivables (Contas a Receber) ────────────────────────────────────────────

  async listReceivables(clinicId: string, filters: {
    status?: string; patientId?: string; from?: string; to?: string;
    search?: string; page?: number; limit?: number;
  } = {}) {
    const { skip, take, page, limit } = pag(filters.page, filters.limit);
    const where: any = { clinic_id: clinicId, deleted_at: null };
    if (filters.status) where.status = filters.status;
    if (filters.patientId) where.patient_id = filters.patientId;
    if (filters.from || filters.to) {
      where.due_date = {};
      if (filters.from) where.due_date.gte = new Date(filters.from);
      if (filters.to) where.due_date.lte = new Date(filters.to);
    }
    if (filters.search) {
      where.OR = [
        { description: { contains: filters.search, mode: 'insensitive' } },
        { patient: { full_name: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }
    const [data, total] = await this.prisma.$transaction([
      this.prisma.receivable.findMany({
        where, skip, take,
        orderBy: { due_date: 'asc' },
        include: {
          patient: { select: { id: true, full_name: true } },
          appointment: { select: { id: true, start_time: true, status: true } },
        },
      }),
      this.prisma.receivable.count({ where }),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async createReceivable(clinicId: string, dto: {
    patient_id: string; appointment_id?: string; budget_id?: string;
    due_date: string; total_amount: number; description?: string; notes?: string;
  }, userId: string) {
    const rec = await this.prisma.receivable.create({
      data: {
        clinic_id: clinicId,
        patient_id: dto.patient_id,
        appointment_id: dto.appointment_id,
        budget_id: dto.budget_id,
        due_date: new Date(dto.due_date),
        total_amount: dto.total_amount,
        description: dto.description,
        notes: dto.notes,
        created_by: userId,
      },
      include: { patient: { select: { id: true, full_name: true } } },
    });
    await this.audit.log({ clinic_id: clinicId, actor_id: userId, action: 'CREATE' as any, entity_type: 'Receivable', entity_id: rec.id, metadata: { amount: dto.total_amount } });
    await this.logFinancialAction(clinicId, userId, 'Receivable', rec.id, 'CREATE', dto.total_amount);
    return rec;
  }

  async markReceivablePaid(clinicId: string, id: string, dto: {
    amount: number; method?: string; account_id?: string; note?: string;
  }, userId: string) {
    const rec = await this.prisma.receivable.findFirst({ where: { id, clinic_id: clinicId, deleted_at: null } });
    if (!rec) throw new NotFoundException('Recebível não encontrado');
    if (rec.status === ReceivableStatus.CANCELLED) throw new BadRequestException('Recebível cancelado');

    const newPaid = Number(rec.paid_amount) + dto.amount;
    const total = Number(rec.total_amount);
    let status: ReceivableStatus = ReceivableStatus.PARTIALLY_PAID;
    if (newPaid >= total) status = ReceivableStatus.PAID;

    const [updated] = await this.prisma.$transaction([
      this.prisma.receivable.update({
        where: { id },
        data: { paid_amount: newPaid, status },
      }),
      this.prisma.ledgerEntry.create({
        data: {
          clinic_id: clinicId,
          type: LedgerEntryType.RECEIPT,
          account_id: dto.account_id,
          receivable_id: id,
          amount: dto.amount,
          method: dto.method ?? 'OTHER',
          description: `Recebimento parcial/total: ${id}`,
          created_by: userId,
        },
      }),
    ]);
    await this.audit.log({ clinic_id: clinicId, actor_id: userId, action: 'UPDATE' as any, entity_type: 'Receivable', entity_id: id, metadata: { paid: dto.amount, status } });
    await this.logFinancialAction(clinicId, userId, 'Receivable', id, 'MARK_PAID', dto.amount);
    return updated;
  }

  async cancelReceivable(clinicId: string, id: string, note: string, userId: string) {
    const rec = await this.prisma.receivable.findFirst({ where: { id, clinic_id: clinicId, deleted_at: null } });
    if (!rec) throw new NotFoundException('Recebível não encontrado');
    if (rec.status === ReceivableStatus.PAID) throw new BadRequestException('Não é possível cancelar recebível pago');
    const updated = await this.prisma.receivable.update({ where: { id }, data: { status: ReceivableStatus.CANCELLED } });
    await this.audit.log({ clinic_id: clinicId, actor_id: userId, action: 'CANCEL' as any, entity_type: 'Receivable', entity_id: id, metadata: { note } });
    await this.logFinancialAction(clinicId, userId, 'Receivable', id, 'CANCEL', undefined, note);
    return updated;
  }

  // ── Payables (Contas a Pagar) ─────────────────────────────────────────────────

  async listPayables(clinicId: string, filters: {
    status?: string; category?: string; from?: string; to?: string;
    search?: string; page?: number; limit?: number;
  } = {}) {
    const { skip, take, page, limit } = pag(filters.page, filters.limit);
    const where: any = { clinic_id: clinicId, deleted_at: null };
    if (filters.status) where.status = filters.status;
    if (filters.category) where.category = filters.category;
    if (filters.from || filters.to) {
      where.due_date = {};
      if (filters.from) where.due_date.gte = new Date(filters.from);
      if (filters.to) where.due_date.lte = new Date(filters.to);
    }
    if (filters.search) {
      where.OR = [
        { description: { contains: filters.search, mode: 'insensitive' } },
        { counterparty: { name: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }
    const [data, total] = await this.prisma.$transaction([
      this.prisma.payable.findMany({
        where, skip, take,
        orderBy: { due_date: 'asc' },
        include: { counterparty: { select: { id: true, name: true, type: true } } },
      }),
      this.prisma.payable.count({ where }),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async createPayable(clinicId: string, dto: {
    counterparty_id?: string; category?: string; due_date: string;
    amount: number; description?: string; notes?: string;
  }, userId: string) {
    const payable = await this.prisma.payable.create({
      data: {
        clinic_id: clinicId,
        counterparty_id: dto.counterparty_id,
        category: (dto.category as any) ?? 'OTHER',
        due_date: new Date(dto.due_date),
        amount: dto.amount,
        description: dto.description,
        notes: dto.notes,
        created_by: userId,
      },
    });
    await this.audit.log({ clinic_id: clinicId, actor_id: userId, action: 'CREATE' as any, entity_type: 'Payable', entity_id: payable.id, metadata: { amount: dto.amount } });
    await this.logFinancialAction(clinicId, userId, 'Payable', payable.id, 'CREATE', dto.amount);
    return payable;
  }

  async markPayablePaid(clinicId: string, id: string, dto: { account_id?: string; method?: string; note?: string }, userId: string) {
    const payable = await this.prisma.payable.findFirst({ where: { id, clinic_id: clinicId, deleted_at: null } });
    if (!payable) throw new NotFoundException('Conta a pagar não encontrada');
    if (payable.status === PayableStatus.PAID) throw new BadRequestException('Já paga');
    const [updated] = await this.prisma.$transaction([
      this.prisma.payable.update({ where: { id }, data: { status: PayableStatus.PAID } }),
      this.prisma.ledgerEntry.create({
        data: {
          clinic_id: clinicId,
          type: LedgerEntryType.PAYMENT,
          account_id: dto.account_id,
          payable_id: id,
          amount: payable.amount,
          method: dto.method ?? 'OTHER',
          description: `Pagamento: ${id}`,
          created_by: userId,
        },
      }),
    ]);
    await this.audit.log({ clinic_id: clinicId, actor_id: userId, action: 'UPDATE' as any, entity_type: 'Payable', entity_id: id, metadata: { status: 'PAID' } });
    await this.logFinancialAction(clinicId, userId, 'Payable', id, 'MARK_PAID', Number(payable.amount));
    return updated;
  }

  async cancelPayable(clinicId: string, id: string, note: string, userId: string) {
    const payable = await this.prisma.payable.findFirst({ where: { id, clinic_id: clinicId, deleted_at: null } });
    if (!payable) throw new NotFoundException('Conta a pagar não encontrada');
    if (payable.status === PayableStatus.PAID) throw new BadRequestException('Não é possível cancelar conta paga');
    const updated = await this.prisma.payable.update({ where: { id }, data: { status: PayableStatus.CANCELLED } });
    await this.audit.log({ clinic_id: clinicId, actor_id: userId, action: 'CANCEL' as any, entity_type: 'Payable', entity_id: id, metadata: { note } });
    await this.logFinancialAction(clinicId, userId, 'Payable', id, 'CANCEL', undefined, note);
    return updated;
  }

  // ── Ledger ────────────────────────────────────────────────────────────────────

  async listLedger(clinicId: string, filters: {
    type?: string; account_id?: string; from?: string; to?: string;
    page?: number; limit?: number;
  } = {}) {
    const { skip, take, page, limit } = pag(filters.page, filters.limit);
    const where: any = { clinic_id: clinicId };
    if (filters.type) where.type = filters.type;
    if (filters.account_id) where.OR = [{ account_id: filters.account_id }, { account_to_id: filters.account_id }];
    if (filters.from || filters.to) {
      where.occurred_at = {};
      if (filters.from) where.occurred_at.gte = new Date(filters.from);
      if (filters.to) where.occurred_at.lte = new Date(filters.to);
    }
    const [data, total] = await this.prisma.$transaction([
      this.prisma.ledgerEntry.findMany({
        where, skip, take, orderBy: { occurred_at: 'desc' },
        include: {
          account: { select: { id: true, name: true, type: true } },
          receivable: { select: { id: true, patient_id: true, description: true } },
          payable: { select: { id: true, description: true } },
        },
      }),
      this.prisma.ledgerEntry.count({ where }),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async createTransfer(clinicId: string, dto: { from_account_id: string; to_account_id: string; amount: number; description?: string }, userId: string) {
    const entry = await this.prisma.ledgerEntry.create({
      data: {
        clinic_id: clinicId,
        type: LedgerEntryType.TRANSFER,
        account_id: dto.from_account_id,
        account_to_id: dto.to_account_id,
        amount: dto.amount,
        description: dto.description ?? 'Transferência entre contas',
        created_by: userId,
      },
    });
    await this.audit.log({ clinic_id: clinicId, actor_id: userId, action: 'CREATE' as any, entity_type: 'LedgerEntry', entity_id: entry.id });
    return entry;
  }

  // ── Budget (Orçamento) ────────────────────────────────────────────────────────

  async listBudgets(clinicId: string, filters: {
    patientId?: string; status?: string; search?: string; page?: number; limit?: number;
  } = {}) {
    const { skip, take, page, limit } = pag(filters.page, filters.limit);
    const where: any = { clinic_id: clinicId, deleted_at: null };
    if (filters.status) where.status = filters.status;
    if (filters.patientId) where.patient_id = filters.patientId;
    if (filters.search) {
      where.OR = [
        { notes: { contains: filters.search, mode: 'insensitive' } },
        { patient: { full_name: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }
    const [data, total] = await this.prisma.$transaction([
      this.prisma.budget.findMany({
        where, skip, take,
        orderBy: { created_at: 'desc' },
        include: { patient: { select: { id: true, full_name: true } } },
      }),
      this.prisma.budget.count({ where }),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async createBudget(clinicId: string, dto: {
    patient_id: string; appointment_id?: string;
    total_amount: number; discount?: number; notes?: string;
    items: Array<{ service_id?: string; description: string; quantity: number; unit_price: number }>;
  }, userId: string) {
    const items = dto.items.map(i => ({ ...i, total_price: i.quantity * i.unit_price }));
    const budget = await this.prisma.budget.create({
      data: {
        clinic_id: clinicId,
        patient_id: dto.patient_id,
        appointment_id: dto.appointment_id,
        total_amount: dto.total_amount,
        discount: dto.discount ?? 0,
        notes: dto.notes,
        items,
        created_by: userId,
      },
      include: { patient: { select: { id: true, full_name: true } } },
    });
    await this.audit.log({ clinic_id: clinicId, actor_id: userId, action: 'CREATE' as any, entity_type: 'Budget', entity_id: budget.id });
    return budget;
  }

  async approveBudget(clinicId: string, id: string, userId: string) {
    const budget = await this.prisma.budget.findFirst({ where: { id, clinic_id: clinicId, deleted_at: null } });
    if (!budget) throw new NotFoundException('Orçamento não encontrado');
    if (budget.status !== 'DRAFT' && budget.status !== 'SENT') throw new BadRequestException('Apenas orçamentos DRAFT/SENT podem ser aprovados');
    const updated = await this.prisma.budget.update({ where: { id }, data: { status: 'APPROVED' } });
    await this.audit.log({ clinic_id: clinicId, actor_id: userId, action: 'APPROVE' as any, entity_type: 'Budget', entity_id: id });
    await this.logFinancialAction(clinicId, userId, 'Budget', id, 'APPROVE', Number(budget.total_amount));
    return updated;
  }

  async convertBudgetToReceivable(clinicId: string, id: string, dto: { due_date: string }, userId: string) {
    const budget = await this.prisma.budget.findFirst({ where: { id, clinic_id: clinicId, deleted_at: null } });
    if (!budget) throw new NotFoundException('Orçamento não encontrado');
    if (budget.status !== 'APPROVED') throw new BadRequestException('Apenas orçamentos APPROVED podem ser convertidos');

    const finalAmount = Number(budget.total_amount) - Number(budget.discount ?? 0);
    const [receivable] = await this.prisma.$transaction([
      this.prisma.receivable.create({
        data: {
          clinic_id: clinicId,
          patient_id: budget.patient_id,
          budget_id: id,
          due_date: new Date(dto.due_date),
          total_amount: finalAmount,
          description: `Orçamento #${id.slice(0, 8)}`,
          notes: budget.notes,
          created_by: userId,
        },
      }),
      this.prisma.budget.update({ where: { id }, data: { status: 'CONVERTED', converted_at: new Date() } }),
    ]);
    await this.audit.log({ clinic_id: clinicId, actor_id: userId, action: 'CONVERT' as any, entity_type: 'Budget', entity_id: id, metadata: { receivable_id: receivable.id } });
    await this.logFinancialAction(clinicId, userId, 'Budget', id, 'CONVERT_TO_RECEIVABLE', finalAmount);
    return { budget_id: id, receivable };
  }

  // ── Reports ───────────────────────────────────────────────────────────────────

  async getSummary(clinicId: string, from: string, to: string) {
    const dateFilter = { gte: new Date(from), lte: new Date(to) };
    const [receivables, payables, ledger] = await Promise.all([
      this.prisma.receivable.aggregate({
        where: { clinic_id: clinicId, deleted_at: null, issue_date: dateFilter },
        _sum: { total_amount: true, paid_amount: true },
        _count: true,
      }),
      this.prisma.payable.aggregate({
        where: { clinic_id: clinicId, deleted_at: null, issue_date: dateFilter },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.ledgerEntry.aggregate({
        where: { clinic_id: clinicId, occurred_at: dateFilter },
        _sum: { amount: true },
      }),
    ]);
    const totalReceivable = Number(receivables._sum.total_amount ?? 0);
    const totalPaid = Number(receivables._sum.paid_amount ?? 0);
    const totalPayable = Number(payables._sum.amount ?? 0);
    return {
      period: { from, to },
      receivables: { total: totalReceivable, paid: totalPaid, pending: totalReceivable - totalPaid, count: receivables._count },
      payables: { total: totalPayable, count: payables._count },
      net: totalPaid - totalPayable,
      ledger_total: Number(ledger._sum.amount ?? 0),
    };
  }

  async getDRE(clinicId: string, from: string, to: string) {
    const dateFilter = { gte: new Date(from), lte: new Date(to) };
    const [receipts, payments, receivablesByCategory] = await Promise.all([
      this.prisma.ledgerEntry.findMany({
        where: { clinic_id: clinicId, type: 'RECEIPT', occurred_at: dateFilter },
        select: { amount: true, method: true },
      }),
      this.prisma.payable.findMany({
        where: { clinic_id: clinicId, status: 'PAID', deleted_at: null, issue_date: dateFilter },
        select: { amount: true, category: true },
      }),
      this.prisma.receivable.groupBy({
        by: ['status'],
        where: { clinic_id: clinicId, deleted_at: null, issue_date: dateFilter },
        _sum: { total_amount: true, paid_amount: true },
      }),
    ]);

    const grossRevenue = receipts.reduce((s, r) => s + Number(r.amount), 0);
    const totalExpenses = payments.reduce((s, p) => s + Number(p.amount), 0);
    const byCategory: Record<string, number> = {};
    for (const p of payments) {
      byCategory[p.category] = (byCategory[p.category] ?? 0) + Number(p.amount);
    }
    const byMethod: Record<string, number> = {};
    for (const r of receipts) {
      byMethod[r.method] = (byMethod[r.method] ?? 0) + Number(r.amount);
    }

    return {
      period: { from, to },
      gross_revenue: grossRevenue,
      expenses: totalExpenses,
      expenses_by_category: byCategory,
      revenue_by_method: byMethod,
      net_profit: grossRevenue - totalExpenses,
      receivables_by_status: receivablesByCategory,
    };
  }

  async getHealthScore(clinicId: string) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const [overdue, receivables30, paid30, payable30] = await Promise.all([
      this.prisma.receivable.count({ where: { clinic_id: clinicId, status: 'OVERDUE', deleted_at: null } }),
      this.prisma.receivable.aggregate({
        where: { clinic_id: clinicId, deleted_at: null, issue_date: { gte: thirtyDaysAgo } },
        _sum: { total_amount: true, paid_amount: true },
      }),
      this.prisma.ledgerEntry.aggregate({
        where: { clinic_id: clinicId, type: 'RECEIPT', occurred_at: { gte: thirtyDaysAgo } },
        _sum: { amount: true },
      }),
      this.prisma.payable.aggregate({
        where: { clinic_id: clinicId, deleted_at: null, due_date: { gte: thirtyDaysAgo } },
        _sum: { amount: true },
      }),
    ]);

    const totalRevenue = Number(receivables30._sum.total_amount ?? 0);
    const totalPaid = Number(receivables30._sum.paid_amount ?? 0);
    const collectionRate = totalRevenue > 0 ? Math.round((totalPaid / totalRevenue) * 100) : 100;

    return {
      collection_rate_30d: collectionRate,
      overdue_count: overdue,
      revenue_30d: Number(paid30._sum.amount ?? 0),
      payable_30d: Number(payable30._sum.amount ?? 0),
      health_label: overdue === 0 && collectionRate >= 80 ? 'SAUDAVEL' : overdue > 5 || collectionRate < 50 ? 'CRITICO' : 'ATENCAO',
    };
  }

  async closeDay(clinicId: string, date: string) {
    const d = new Date(date);
    const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const [completedAppts, chargesForDay, overdueUpdated] = await Promise.all([
      this.prisma.appointment.findMany({
        where: {
          clinic_id: clinicId,
          status: 'COMPLETED',
          finalized_at: { gte: startOfDay, lt: endOfDay },
          deleted_at: null,
        },
        select: { id: true, patient_id: true, receivables: { select: { id: true } } },
      }),
      this.prisma.receivable.aggregate({
        where: { clinic_id: clinicId, issue_date: { gte: startOfDay, lt: endOfDay }, deleted_at: null },
        _sum: { total_amount: true, paid_amount: true },
        _count: true,
      }),
      this.prisma.receivable.updateMany({
        where: { clinic_id: clinicId, status: 'OPEN', due_date: { lt: new Date() }, deleted_at: null },
        data: { status: 'OVERDUE' },
      }),
    ]);

    const withoutCharge = completedAppts.filter(a => a.receivables.length === 0);

    return {
      date,
      appointments_completed: completedAppts.length,
      appointments_without_charge: withoutCharge.length,
      missing_charges: withoutCharge.map(a => ({ appointment_id: a.id, patient_id: a.patient_id })),
      receivables_issued: { count: chargesForDay._count, total: Number(chargesForDay._sum.total_amount ?? 0), paid: Number(chargesForDay._sum.paid_amount ?? 0) },
      overdue_updated: overdueUpdated.count,
    };
  }

  async getAuditLog(clinicId: string, filters: { entity_type?: string; from?: string; to?: string; page?: number; limit?: number } = {}) {
    const { skip, take, page, limit } = pag(filters.page, filters.limit);
    const where: any = { clinic_id: clinicId };
    if (filters.entity_type) where.entity_type = filters.entity_type;
    if (filters.from || filters.to) {
      where.created_at = {};
      if (filters.from) where.created_at.gte = new Date(filters.from);
      if (filters.to) where.created_at.lte = new Date(filters.to);
    }
    const [data, total] = await this.prisma.$transaction([
      this.prisma.financialActionLog.findMany({ where, skip, take, orderBy: { created_at: 'desc' } }),
      this.prisma.financialActionLog.count({ where }),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  // ── Patient Financial Status ──────────────────────────────────────────────────

  async getPatientFinancialStatus(clinicId: string, patientId: string) {
    const [receivables, pending, overdue] = await Promise.all([
      this.prisma.receivable.findMany({
        where: { clinic_id: clinicId, patient_id: patientId, deleted_at: null, status: { not: 'CANCELLED' } },
        orderBy: { due_date: 'desc' },
        take: 20,
        include: { appointment: { select: { id: true, start_time: true } } },
      }),
      this.prisma.receivable.aggregate({
        where: { clinic_id: clinicId, patient_id: patientId, deleted_at: null, status: { in: ['OPEN', 'PARTIALLY_PAID'] } },
        _sum: { total_amount: true, paid_amount: true },
      }),
      this.prisma.receivable.count({
        where: { clinic_id: clinicId, patient_id: patientId, deleted_at: null, status: 'OVERDUE' },
      }),
    ]);
    const totalPending = Number(pending._sum.total_amount ?? 0) - Number(pending._sum.paid_amount ?? 0);
    const statusLabel = overdue > 0 ? 'DEVENDO' : totalPending > 0 ? 'PENDENTE' : 'EM_DIA';
    return { receivables, total_pending: totalPending, overdue_count: overdue, status_label: statusLabel };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  async createReceivableOnCheckout(clinicId: string, appointmentId: string, patientId: string, amount: number, userId: string) {
    const existing = await this.prisma.receivable.findFirst({
      where: { clinic_id: clinicId, appointment_id: appointmentId, deleted_at: null },
    });
    if (existing) return existing;
    return this.createReceivable(clinicId, {
      patient_id: patientId,
      appointment_id: appointmentId,
      due_date: new Date().toISOString(),
      total_amount: amount,
      description: 'Cobrança de consulta',
    }, userId);
  }

  private async logFinancialAction(clinicId: string, userId: string, entityType: string, entityId: string, action: string, amount?: number, note?: string) {
    await this.prisma.financialActionLog.create({
      data: { clinic_id: clinicId, user_id: userId, entity_type: entityType, entity_id: entityId, action, amount, note },
    });
  }
}
