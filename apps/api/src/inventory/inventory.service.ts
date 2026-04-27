import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { EventsService } from '../events/events.service';
import { CreateItemDto } from './dto/create-item.dto';
import { CreateMovementDto } from './dto/create-movement.dto';
import { InventoryItemStatus, InventoryMovementType } from '@prisma/client';

@Injectable()
export class InventoryService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private events: EventsService,
  ) {}

  async findAll(clinicId: string, filters?: any) {
    const where: any = { clinic_id: clinicId, deleted_at: null, is_active: true };
    if (filters?.category) where.category = filters.category;
    if (filters?.subcategory) where.subcategory = filters.subcategory;
    if (filters?.status) where.status = filters.status;
    if (filters?.supplier_id) where.supplier_id = filters.supplier_id;
    if (filters?.abc_class) where.abc_class = filters.abc_class;
    if (filters?.critical) where.days_remaining = { lte: 7, not: null };
    if (filters?.search) where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { technical_name: { contains: filters.search, mode: 'insensitive' } },
      { internal_code: { contains: filters.search, mode: 'insensitive' } },
      { barcode: { contains: filters.search, mode: 'insensitive' } },
    ];

    const items = await this.prisma.inventoryItem.findMany({
      where,
      orderBy: [{ risk_score: 'desc' }, { name: 'asc' }],
      include: { supplier: true, secondary_supplier: true },
    });

    if (filters?.low_stock) {
      return items.filter(i => i.quantity <= i.minimum_level);
    }
    return items;
  }

  async findOne(clinicId: string, id: string) {
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id, clinic_id: clinicId, deleted_at: null },
      include: {
        movements: { orderBy: { created_at: 'desc' }, take: 50 },
        supplier: true,
        secondary_supplier: true,
        reservations: { where: { status: 'ACTIVE' } },
        losses: { orderBy: { created_at: 'desc' }, take: 10 },
      },
    });
    if (!item) throw new NotFoundException('Item not found');
    return item;
  }

  async getDashboardKPIs(clinicId: string) {
    const now = new Date();
    const in45 = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);
    const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [
      expiringSoon,
      expired,
      criticalItems,
      allItems,
      losses30d,
      reorderSuggestions,
    ] = await Promise.all([
      this.prisma.inventoryItem.count({
        where: { clinic_id: clinicId, deleted_at: null, is_active: true, expiry_date: { gte: now, lte: in45 } },
      }),
      this.prisma.inventoryItem.count({
        where: { clinic_id: clinicId, deleted_at: null, is_active: true, expiry_date: { lt: now } },
      }),
      this.prisma.inventoryItem.count({
        where: { clinic_id: clinicId, deleted_at: null, is_active: true, days_remaining: { lte: 7, not: null } },
      }),
      this.prisma.inventoryItem.findMany({
        where: { clinic_id: clinicId, deleted_at: null, is_active: true },
        select: { quantity: true, unit_cost: true, average_cost: true, consumption_30d: true, ideal_stock: true, minimum_level: true },
      }),
      this.prisma.inventoryLoss.aggregate({
        where: { clinic_id: clinicId, created_at: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } },
        _sum: { estimated_cost: true },
      }),
      this.prisma.purchaseOrder.count({
        where: { clinic_id: clinicId, status: 'SUGGESTED' },
      }),
    ]);

    const totalCost = allItems.reduce((acc, i) => {
      const cost = Number(i.average_cost ?? i.unit_cost ?? 0);
      return acc + cost * i.quantity;
    }, 0);

    const belowHalfIdeal = allItems.filter(i => i.ideal_stock > 0 && i.quantity < i.ideal_stock * 0.5).length;
    const highConsumption = allItems.filter(i => i.consumption_30d > 0 && i.quantity / Math.max(i.consumption_30d, 1) < 7).length;
    const avgDaysRemaining = allItems
      .filter(i => i.consumption_30d > 0)
      .reduce((acc, i, _, arr) => acc + i.quantity / Math.max(i.consumption_30d / 30, 0.01) / arr.length, 0);

    const avgTurnover = allItems.filter(i => i.consumption_30d > 0).length > 0
      ? allItems.filter(i => i.consumption_30d > 0).reduce((acc, i) => {
          const annualConsumption = i.consumption_30d * 12;
          const avgStock = Math.max(i.quantity, 1);
          return acc + annualConsumption / avgStock;
        }, 0) / Math.max(allItems.filter(i => i.consumption_30d > 0).length, 1)
      : 0;

    return {
      expiring_soon: expiringSoon,
      expired,
      below_half_ideal: belowHalfIdeal,
      high_consumption: highConsumption,
      suggested_orders: reorderSuggestions,
      critical_items: criticalItems,
      total_stock_cost: totalCost,
      loss_value_30d: Number(losses30d._sum.estimated_cost ?? 0),
      avg_turnover: Math.round(avgTurnover * 100) / 100,
      avg_days_remaining: Math.round(avgDaysRemaining),
    };
  }

  getExpiringItems(clinicId: string, days = 45) {
    const cutoff = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    return this.prisma.inventoryItem.findMany({
      where: { clinic_id: clinicId, deleted_at: null, is_active: true, expiry_date: { gte: new Date(), lte: cutoff } },
      orderBy: { expiry_date: 'asc' },
    });
  }

  getExpiredItems(clinicId: string) {
    return this.prisma.inventoryItem.findMany({
      where: { clinic_id: clinicId, deleted_at: null, expiry_date: { lt: new Date() } },
      orderBy: { expiry_date: 'asc' },
    });
  }

  getCriticalItems(clinicId: string) {
    return this.prisma.inventoryItem.findMany({
      where: { clinic_id: clinicId, deleted_at: null, is_active: true, days_remaining: { lte: 7, not: null } },
      orderBy: [{ days_remaining: 'asc' }, { risk_score: 'desc' }],
    });
  }

  async getReorderSuggestions(clinicId: string) {
    const items = await this.prisma.inventoryItem.findMany({
      where: { clinic_id: clinicId, deleted_at: null, is_active: true, status: 'ACTIVE' },
      include: { supplier: true },
    });

    return items
      .map(item => {
        const dailyConsumption = item.consumption_30d / 30;
        const leadTimeDays = item.lead_time_days ?? 7;
        const safetyStock = Math.ceil(dailyConsumption * leadTimeDays * 0.5);
        const projectedConsumption = Math.ceil(dailyConsumption * (leadTimeDays + 7));
        const reorderPoint = projectedConsumption + safetyStock;
        const suggestedQty = reorderPoint - item.quantity;

        if (suggestedQty <= 0 || (item.minimum_level > 0 && item.quantity > item.minimum_level * 1.5)) return null;

        const urgency = item.quantity <= 0 ? 'CRITICAL' :
          item.days_remaining != null && item.days_remaining <= 7 ? 'HIGH' :
          item.quantity < item.minimum_level ? 'MEDIUM' : 'LOW';

        return {
          item,
          suggested_quantity: Math.max(suggestedQty, 1),
          reorder_point: reorderPoint,
          daily_consumption: dailyConsumption,
          estimated_cost: Number(item.unit_cost ?? 0) * Math.max(suggestedQty, 1),
          urgency,
          justification: `Consumo diário estimado: ${dailyConsumption.toFixed(2)} ${item.unit}. Lead time: ${leadTimeDays} dias. Estoque atual: ${item.quantity}.`,
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        return (order[a!.urgency] ?? 3) - (order[b!.urgency] ?? 3);
      });
  }

  async calculateABC(clinicId: string) {
    const items = await this.prisma.inventoryItem.findMany({
      where: { clinic_id: clinicId, deleted_at: null, is_active: true },
    });

    const withValue = items.map(i => ({
      ...i,
      annual_value: Number(i.unit_cost ?? 0) * i.consumption_30d * 12,
    })).sort((a, b) => b.annual_value - a.annual_value);

    const total = withValue.reduce((s, i) => s + i.annual_value, 0);
    let cumulative = 0;

    const classified = withValue.map(item => {
      cumulative += item.annual_value;
      const pct = total > 0 ? cumulative / total : 0;
      const abc = pct <= 0.8 ? 'A' : pct <= 0.95 ? 'B' : 'C';
      return { ...item, abc_class: abc, cumulative_pct: pct };
    });

    await Promise.all(classified.map(i =>
      this.prisma.inventoryItem.update({ where: { id: i.id }, data: { abc_class: i.abc_class } })
    ));

    return classified;
  }

  getLosses(clinicId: string, filters?: { from?: string; to?: string; loss_type?: string }) {
    const where: any = { clinic_id: clinicId };
    if (filters?.loss_type) where.loss_type = filters.loss_type;
    if (filters?.from || filters?.to) {
      where.created_at = {};
      if (filters.from) where.created_at.gte = new Date(filters.from);
      if (filters.to) where.created_at.lte = new Date(filters.to);
    }
    return this.prisma.inventoryLoss.findMany({
      where,
      include: { item: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async registerLoss(clinicId: string, dto: any, actorId: string) {
    const item = await this.prisma.inventoryItem.findFirst({ where: { id: dto.item_id, clinic_id: clinicId } });
    if (!item) throw new NotFoundException('Item not found');
    if (!dto.reason?.trim()) throw new BadRequestException('Reason is required for loss registration');
    if (item.quantity < dto.quantity) throw new BadRequestException('Insufficient stock for loss registration');

    const [loss] = await this.prisma.$transaction([
      this.prisma.inventoryLoss.create({
        data: {
          clinic_id: clinicId,
          item_id: dto.item_id,
          quantity: dto.quantity,
          loss_type: dto.loss_type ?? 'OTHER',
          estimated_cost: dto.estimated_cost ?? Number(item.unit_cost ?? 0) * dto.quantity,
          reason: dto.reason,
          photo_url: dto.photo_url,
          registered_by_user_id: actorId,
        },
      }),
      this.prisma.inventoryItem.update({
        where: { id: dto.item_id },
        data: { quantity: { decrement: dto.quantity } },
      }),
    ]);

    await this.prisma.inventoryMovement.create({
      data: {
        item_id: dto.item_id, clinic_id: clinicId, type: 'LOSS',
        quantity: dto.quantity, loss_type: dto.loss_type ?? 'OTHER',
        notes: dto.reason, performed_by: actorId,
      },
    });

    await this.logAudit(clinicId, dto.item_id, 'LOSS', actorId, { quantity: item.quantity }, { quantity: item.quantity - dto.quantity });
    return loss;
  }

  getReservations(clinicId: string, status?: string) {
    const where: any = { clinic_id: clinicId };
    if (status) where.status = status;
    return this.prisma.inventoryReservation.findMany({
      where,
      include: { item: true },
      orderBy: { reserved_at: 'desc' },
    });
  }

  async createReservation(clinicId: string, dto: any, actorId: string) {
    const item = await this.prisma.inventoryItem.findFirst({ where: { id: dto.item_id, clinic_id: clinicId } });
    if (!item) throw new NotFoundException('Item not found');
    if (item.status === 'EXPIRED') throw new BadRequestException('Cannot reserve expired item');

    const activeReservations = await this.prisma.inventoryReservation.aggregate({
      where: { item_id: dto.item_id, status: 'ACTIVE' },
      _sum: { quantity_reserved: true },
    });
    const reserved = Number(activeReservations._sum.quantity_reserved ?? 0);
    const available = item.quantity - reserved;

    if (available < dto.quantity) throw new BadRequestException(`Insufficient available stock. Available: ${available}, requested: ${dto.quantity}`);

    const reservation = await this.prisma.inventoryReservation.create({
      data: { clinic_id: clinicId, item_id: dto.item_id, quantity_reserved: dto.quantity, patient_id: dto.patient_id, appointment_id: dto.appointment_id, protocol_id: dto.protocol_id, created_by_user_id: actorId },
    });

    await this.logAudit(clinicId, dto.item_id, 'RESERVATION', actorId, null, { reservation_id: reservation.id, quantity: dto.quantity });
    return reservation;
  }

  async consumeReservation(clinicId: string, reservationId: string, actorId: string) {
    const res = await this.prisma.inventoryReservation.findFirst({ where: { id: reservationId, clinic_id: clinicId, status: 'ACTIVE' } });
    if (!res) throw new NotFoundException('Active reservation not found');

    await this.prisma.$transaction([
      this.prisma.inventoryReservation.update({ where: { id: reservationId }, data: { status: 'CONSUMED', consumed_at: new Date() } }),
      this.prisma.inventoryItem.update({ where: { id: res.item_id }, data: { quantity: { decrement: res.quantity_reserved } } }),
    ]);

    await this.prisma.inventoryMovement.create({
      data: { item_id: res.item_id, clinic_id: clinicId, type: 'RESERVATION_CONSUME', quantity: res.quantity_reserved, reservation_id: reservationId, appointment_id: res.appointment_id, patient_id: res.patient_id, protocol_id: res.protocol_id, performed_by: actorId },
    });
    return { success: true };
  }

  async cancelReservation(clinicId: string, reservationId: string, actorId: string) {
    const res = await this.prisma.inventoryReservation.findFirst({ where: { id: reservationId, clinic_id: clinicId, status: 'ACTIVE' } });
    if (!res) throw new NotFoundException('Active reservation not found');
    return this.prisma.inventoryReservation.update({ where: { id: reservationId }, data: { status: 'CANCELLED', cancelled_at: new Date() } });
  }

  getPurchaseOrders(clinicId: string, filters?: any) {
    const where: any = { clinic_id: clinicId };
    if (filters?.status) where.status = filters.status;
    if (filters?.urgency) where.urgency = filters.urgency;
    return this.prisma.purchaseOrder.findMany({
      where,
      include: { supplier: true, items: { include: { item: true } } },
      orderBy: { created_at: 'desc' },
    });
  }

  async createPurchaseOrder(clinicId: string, dto: any, actorId: string) {
    const totalAmount = (dto.items ?? []).reduce((acc: number, i: any) => acc + (i.unit_cost_estimated ?? 0) * i.quantity_requested, 0);
    const order = await this.prisma.purchaseOrder.create({
      data: {
        clinic_id: clinicId,
        supplier_id: dto.supplier_id,
        status: dto.status ?? 'PENDING_APPROVAL',
        urgency: dto.urgency ?? 'LOW',
        total_amount: totalAmount,
        justification: dto.justification,
        notes: dto.notes,
        requested_by_user_id: actorId,
        items: {
          create: (dto.items ?? []).map((i: any) => ({
            item_id: i.item_id,
            quantity_requested: i.quantity_requested,
            unit_cost_estimated: i.unit_cost_estimated,
            notes: i.notes,
          })),
        },
      },
      include: { items: true },
    });
    await this.logAudit(clinicId, null, 'PURCHASE', actorId, null, { order_id: order.id });
    return order;
  }

  async approvePurchaseOrder(clinicId: string, orderId: string, actorId: string) {
    const order = await this.prisma.purchaseOrder.findFirst({ where: { id: orderId, clinic_id: clinicId } });
    if (!order) throw new NotFoundException('Purchase order not found');
    if (!['SUGGESTED', 'PENDING_APPROVAL'].includes(order.status)) throw new BadRequestException('Order cannot be approved in current status');
    return this.prisma.purchaseOrder.update({ where: { id: orderId }, data: { status: 'APPROVED', approved_by_user_id: actorId } });
  }

  async receivePurchaseOrder(clinicId: string, orderId: string, dto: { items: { item_id: string; id: string; quantity_received: number; unit_cost_actual?: number }[] }, actorId: string) {
    const order = await this.prisma.purchaseOrder.findFirst({ where: { id: orderId, clinic_id: clinicId }, include: { items: true } });
    if (!order) throw new NotFoundException('Purchase order not found');
    if (!['APPROVED', 'SENT'].includes(order.status)) throw new BadRequestException('Order cannot be received in current status');

    await this.prisma.$transaction(
      dto.items.flatMap(ri => [
        this.prisma.purchaseOrderItem.update({ where: { id: ri.id }, data: { quantity_received: ri.quantity_received, unit_cost_actual: ri.unit_cost_actual } }),
        this.prisma.inventoryItem.update({ where: { id: ri.item_id }, data: { quantity: { increment: ri.quantity_received }, ...(ri.unit_cost_actual ? { unit_cost: ri.unit_cost_actual } : {}) } }),
        this.prisma.inventoryMovement.create({ data: { item_id: ri.item_id, clinic_id: clinicId, type: 'ENTRY', quantity: ri.quantity_received, unit_cost: ri.unit_cost_actual, notes: `Recebimento do pedido ${orderId}`, purchase_order_item_id: ri.id, performed_by: actorId } }),
      ])
    );

    const allReceived = dto.items.every(ri => {
      const ordered = order.items.find(oi => oi.id === ri.id);
      return ordered && ri.quantity_received >= ordered.quantity_requested;
    });

    await this.prisma.purchaseOrder.update({ where: { id: orderId }, data: { status: allReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED', received_at: new Date() } });
    return { success: true };
  }

  async cancelPurchaseOrder(clinicId: string, orderId: string, actorId: string) {
    const order = await this.prisma.purchaseOrder.findFirst({ where: { id: orderId, clinic_id: clinicId } });
    if (!order) throw new NotFoundException('Purchase order not found');
    if (['RECEIVED', 'CANCELLED'].includes(order.status)) throw new BadRequestException('Order cannot be cancelled');
    return this.prisma.purchaseOrder.update({ where: { id: orderId }, data: { status: 'CANCELLED' } });
  }

  getSuppliers(clinicId: string) {
    return this.prisma.supplier.findMany({ where: { clinic_id: clinicId, deleted_at: null, is_active: true }, orderBy: { name: 'asc' } });
  }

  createSupplier(clinicId: string, dto: any, actorId: string) {
    return this.prisma.supplier.create({ data: { ...dto, clinic_id: clinicId } });
  }

  updateSupplier(clinicId: string, id: string, dto: any) {
    return this.prisma.supplier.update({ where: { id }, data: dto });
  }

  deleteSupplier(clinicId: string, id: string) {
    return this.prisma.supplier.update({ where: { id }, data: { deleted_at: new Date(), is_active: false } });
  }

  getLowStockAlerts(clinicId: string) {
    return this.prisma.$queryRaw`
      SELECT * FROM inventory_items
      WHERE clinic_id = ${clinicId}::uuid
        AND deleted_at IS NULL
        AND is_active = true
        AND quantity <= minimum_level
      ORDER BY (quantity::float / NULLIF(minimum_level, 0)) ASC
    `;
  }

  create(clinicId: string, dto: CreateItemDto, actorId: string) {
    const { status, ...rest } = dto as any;
    return this.prisma.inventoryItem.create({
      data: {
        ...rest,
        clinic_id: clinicId,
        ...(status ? { status: status as InventoryItemStatus } : {}),
        expiry_date: dto.expiry_date ? new Date(dto.expiry_date) : undefined,
      },
    });
  }

  async update(clinicId: string, id: string, dto: any, actorId: string) {
    const item = await this.prisma.inventoryItem.findFirst({ where: { id, clinic_id: clinicId } });
    if (!item) throw new NotFoundException('Item not found');
    const before = { ...item };
    const updated = await this.prisma.inventoryItem.update({ where: { id }, data: { ...dto, expiry_date: dto.expiry_date ? new Date(dto.expiry_date) : undefined } });
    await this.logAudit(clinicId, id, 'UPDATE', actorId, before, updated);
    return updated;
  }

  async move(clinicId: string, dto: CreateMovementDto, actorId: string) {
    const item = await this.prisma.inventoryItem.findFirst({ where: { id: dto.item_id, clinic_id: clinicId } });
    if (!item) throw new NotFoundException('Item not found');

    if (item.status === 'EXPIRED' && ['EXIT', 'RESERVATION_CONSUME'].includes(dto.type)) {
      throw new BadRequestException('Cannot use expired item. Block and discard first.');
    }

    const isExit = ['EXIT', 'LOSS'].includes(dto.type);
    if (isExit && item.quantity < dto.quantity) throw new BadRequestException('Insufficient stock — quantity cannot go negative');
    const delta = isExit ? -dto.quantity : dto.quantity;

    const [movement] = await this.prisma.$transaction([
      this.prisma.inventoryMovement.create({
        data: { item_id: dto.item_id, clinic_id: clinicId, type: dto.type, quantity: dto.quantity, unit_cost: dto.unit_cost, notes: dto.notes, ocr_data: dto.ocr_data, performed_by: actorId },
      }),
      this.prisma.inventoryItem.update({ where: { id: dto.item_id }, data: { quantity: { increment: delta } } }),
    ]);

    if (item.quantity + delta <= item.minimum_level) {
      await this.events.emit({ clinic_id: clinicId, event_type: 'inventory.low_detected', entity_type: 'InventoryItem', entity_id: dto.item_id, actor_id: actorId, payload: { new_qty: item.quantity + delta, min: item.minimum_level } });
    }
    return movement;
  }

  async validateOcr(clinicId: string, movementId: string, validatorId: string, isSecond: boolean) {
    const movement = await this.prisma.inventoryMovement.findFirst({ where: { id: movementId, clinic_id: clinicId } });
    if (!movement) throw new NotFoundException('Movement not found');
    const data: any = isSecond
      ? { ocr_validated: true, ocr_validated_by2: validatorId, ocr_validated_at: new Date() }
      : { ocr_validated_by: validatorId };
    return this.prisma.inventoryMovement.update({ where: { id: movementId }, data });
  }

  async getConsumptionReport(clinicId: string, filters?: { from?: string; to?: string }) {
    const where: any = { clinic_id: clinicId, type: { in: ['EXIT', 'LOSS', 'RESERVATION_CONSUME'] } };
    if (filters?.from || filters?.to) {
      where.created_at = {};
      if (filters.from) where.created_at.gte = new Date(filters.from);
      if (filters.to) where.created_at.lte = new Date(filters.to);
    }
    const movements = await this.prisma.inventoryMovement.findMany({
      where,
      include: { item: { select: { name: true, category: true, unit: true, unit_cost: true } } },
    });

    const grouped: Record<string, any> = {};
    for (const m of movements) {
      const key = m.item_id;
      if (!grouped[key]) grouped[key] = { item: m.item, total_quantity: 0, total_cost: 0, movements: 0 };
      grouped[key].total_quantity += m.quantity;
      grouped[key].total_cost += m.quantity * Number(m.unit_cost ?? m.item?.unit_cost ?? 0);
      grouped[key].movements++;
    }

    return Object.values(grouped).sort((a, b) => b.total_quantity - a.total_quantity);
  }

  async getTurnoverReport(clinicId: string) {
    const items = await this.prisma.inventoryItem.findMany({
      where: { clinic_id: clinicId, deleted_at: null, is_active: true },
      select: { id: true, name: true, category: true, quantity: true, consumption_30d: true, unit_cost: true, abc_class: true },
    });

    return items.map(i => {
      const annualConsumption = i.consumption_30d * 12;
      const avgInventory = Math.max(i.quantity, 1);
      const turnover = annualConsumption / avgInventory;
      const daysOnHand = i.consumption_30d > 0 ? (i.quantity / (i.consumption_30d / 30)) : null;
      return { ...i, annual_consumption: annualConsumption, turnover_rate: Math.round(turnover * 100) / 100, days_on_hand: daysOnHand ? Math.round(daysOnHand) : null };
    }).sort((a, b) => b.turnover_rate - a.turnover_rate);
  }

  getAuditLog(clinicId: string, itemId?: string) {
    return this.prisma.inventoryAuditLog.findMany({
      where: { clinic_id: clinicId, ...(itemId ? { item_id: itemId } : {}) },
      include: { item: { select: { name: true } } },
      orderBy: { created_at: 'desc' },
      take: 100,
    });
  }

  private async logAudit(clinicId: string, itemId: string | null, action: any, actorId: string, before: any, after: any) {
    return this.prisma.inventoryAuditLog.create({
      data: { clinic_id: clinicId, item_id: itemId, action, actor_user_id: actorId, before_json: before, after_json: after },
    });
  }

  @Cron('0 */30 * * * *')
  async updateConsumptionMetricsAllClinics() {
    const clinics = await this.prisma.clinic.findMany({ where: { is_active: true }, select: { id: true } });
    for (const clinic of clinics) {
      await this.updateConsumptionMetrics(clinic.id);
    }
  }

  @Cron('0 6 * * *')
  async dailyInventoryCheck() {
    const clinics = await this.prisma.clinic.findMany({ where: { is_active: true }, select: { id: true } });
    for (const clinic of clinics) {
      await this.updateExpiredStatus(clinic.id);
    }
  }

  async updateConsumptionMetrics(clinicId: string) {
    const now = new Date();
    const items = await this.prisma.inventoryItem.findMany({
      where: { clinic_id: clinicId, deleted_at: null, is_active: true },
    });

    for (const item of items) {
      const [c30, c90] = await Promise.all([
        this.prisma.inventoryMovement.aggregate({
          where: { item_id: item.id, type: { in: ['EXIT', 'LOSS', 'RESERVATION_CONSUME'] }, created_at: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } },
          _sum: { quantity: true },
        }),
        this.prisma.inventoryMovement.aggregate({
          where: { item_id: item.id, type: { in: ['EXIT', 'LOSS', 'RESERVATION_CONSUME'] }, created_at: { gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) } },
          _sum: { quantity: true },
        }),
      ]);

      const consumption30 = Number(c30._sum.quantity ?? 0);
      const consumption90 = Number(c90._sum.quantity ?? 0);
      const dailyRate = consumption30 / 30;
      const daysRemaining = dailyRate > 0 ? Math.floor(item.quantity / dailyRate) : null;

      const expiryRisk = item.expiry_date ? Math.max(0, 30 - Math.floor((item.expiry_date.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))) * 2 : 0;
      const stockRisk = item.minimum_level > 0 && item.quantity < item.minimum_level ? 30 : 0;
      const daysRisk = daysRemaining != null && daysRemaining < 7 ? 40 : 0;
      const riskScore = Math.min(100, expiryRisk + stockRisk + daysRisk);

      await this.prisma.inventoryItem.update({
        where: { id: item.id },
        data: { consumption_30d: consumption30, consumption_90d: consumption90, days_remaining: daysRemaining, risk_score: riskScore },
      });
    }
  }

  private async updateExpiredStatus(clinicId: string) {
    await this.prisma.inventoryItem.updateMany({
      where: { clinic_id: clinicId, expiry_date: { lt: new Date() }, status: 'ACTIVE' },
      data: { status: 'EXPIRED' },
    });
  }
}
