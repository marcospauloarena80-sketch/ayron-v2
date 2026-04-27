import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { CreateItemDto } from './dto/create-item.dto';
import { CreateMovementDto } from './dto/create-movement.dto';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('inventory')
export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  @Get('dashboard')
  getDashboard(@CurrentUser() u: RequestUser) { return this.service.getDashboardKPIs(u.clinic_id); }

  @Get('alerts')
  getAlerts(@CurrentUser() u: RequestUser) { return this.service.getLowStockAlerts(u.clinic_id); }

  @Get('expiring')
  getExpiring(@CurrentUser() u: RequestUser, @Query('days') days?: string) { return this.service.getExpiringItems(u.clinic_id, days ? Number(days) : 45); }

  @Get('expired')
  getExpired(@CurrentUser() u: RequestUser) { return this.service.getExpiredItems(u.clinic_id); }

  @Get('critical')
  getCritical(@CurrentUser() u: RequestUser) { return this.service.getCriticalItems(u.clinic_id); }

  @Get('reorder-suggestions')
  getReorder(@CurrentUser() u: RequestUser) { return this.service.getReorderSuggestions(u.clinic_id); }

  @Get('abc')
  getABC(@CurrentUser() u: RequestUser) { return this.service.calculateABC(u.clinic_id); }

  @Get('losses')
  getLosses(@CurrentUser() u: RequestUser, @Query() q: any) { return this.service.getLosses(u.clinic_id, q); }

  @Post('losses')
  registerLoss(@CurrentUser() u: RequestUser, @Body() dto: any) { return this.service.registerLoss(u.clinic_id, dto, u.sub); }

  @Get('reservations')
  getReservations(@CurrentUser() u: RequestUser, @Query('status') status?: string) { return this.service.getReservations(u.clinic_id, status); }

  @Post('reservations')
  createReservation(@CurrentUser() u: RequestUser, @Body() dto: any) { return this.service.createReservation(u.clinic_id, dto, u.sub); }

  @Patch('reservations/:id/consume')
  consumeReservation(@CurrentUser() u: RequestUser, @Param('id') id: string) { return this.service.consumeReservation(u.clinic_id, id, u.sub); }

  @Patch('reservations/:id/cancel')
  cancelReservation(@CurrentUser() u: RequestUser, @Param('id') id: string) { return this.service.cancelReservation(u.clinic_id, id, u.sub); }

  @Get('purchase-orders')
  getPurchaseOrders(@CurrentUser() u: RequestUser, @Query() q: any) { return this.service.getPurchaseOrders(u.clinic_id, q); }

  @Post('purchase-orders')
  createPurchaseOrder(@CurrentUser() u: RequestUser, @Body() dto: any) { return this.service.createPurchaseOrder(u.clinic_id, dto, u.sub); }

  @Patch('purchase-orders/:id/approve')
  approvePurchaseOrder(@CurrentUser() u: RequestUser, @Param('id') id: string) { return this.service.approvePurchaseOrder(u.clinic_id, id, u.sub); }

  @Patch('purchase-orders/:id/receive')
  receivePurchaseOrder(@CurrentUser() u: RequestUser, @Param('id') id: string, @Body() dto: any) { return this.service.receivePurchaseOrder(u.clinic_id, id, dto, u.sub); }

  @Patch('purchase-orders/:id/cancel')
  cancelPurchaseOrder(@CurrentUser() u: RequestUser, @Param('id') id: string) { return this.service.cancelPurchaseOrder(u.clinic_id, id, u.sub); }

  @Get('suppliers')
  getSuppliers(@CurrentUser() u: RequestUser) { return this.service.getSuppliers(u.clinic_id); }

  @Post('suppliers')
  createSupplier(@CurrentUser() u: RequestUser, @Body() dto: any) { return this.service.createSupplier(u.clinic_id, dto, u.sub); }

  @Patch('suppliers/:id')
  updateSupplier(@CurrentUser() u: RequestUser, @Param('id') id: string, @Body() dto: any) { return this.service.updateSupplier(u.clinic_id, id, dto); }

  @Delete('suppliers/:id')
  deleteSupplier(@CurrentUser() u: RequestUser, @Param('id') id: string) { return this.service.deleteSupplier(u.clinic_id, id); }

  @Get('reports/consumption')
  getConsumptionReport(@CurrentUser() u: RequestUser, @Query() q: any) { return this.service.getConsumptionReport(u.clinic_id, q); }

  @Get('reports/losses')
  getLossesReport(@CurrentUser() u: RequestUser, @Query() q: any) { return this.service.getLosses(u.clinic_id, q); }

  @Get('reports/turnover')
  getTurnoverReport(@CurrentUser() u: RequestUser) { return this.service.getTurnoverReport(u.clinic_id); }

  @Get('audit')
  getAuditLog(@CurrentUser() u: RequestUser, @Query('item_id') itemId?: string) { return this.service.getAuditLog(u.clinic_id, itemId); }

  @Get()
  findAll(@CurrentUser() u: RequestUser, @Query() q: any) { return this.service.findAll(u.clinic_id, q); }

  @Get(':id')
  findOne(@CurrentUser() u: RequestUser, @Param('id') id: string) { return this.service.findOne(u.clinic_id, id); }

  @Post()
  create(@CurrentUser() u: RequestUser, @Body() dto: CreateItemDto) { return this.service.create(u.clinic_id, dto, u.sub); }

  @Patch(':id')
  update(@CurrentUser() u: RequestUser, @Param('id') id: string, @Body() dto: any) { return this.service.update(u.clinic_id, id, dto, u.sub); }

  @Post('movement')
  move(@CurrentUser() u: RequestUser, @Body() dto: CreateMovementDto) { return this.service.move(u.clinic_id, dto, u.sub); }

  @Patch('movement/:id/validate')
  validateOcr(@CurrentUser() u: RequestUser, @Param('id') id: string) { return this.service.validateOcr(u.clinic_id, id, u.sub, false); }

  @Patch('movement/:id/validate2')
  validateOcr2(@CurrentUser() u: RequestUser, @Param('id') id: string) { return this.service.validateOcr(u.clinic_id, id, u.sub, true); }
}
