import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FinanceFullService } from './finance-full.service';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';

@ApiTags('Finance Full')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('finance')
export class FinanceFullController {
  constructor(private readonly svc: FinanceFullService) {}

  // ── Accounts ──────────────────────────────────────────────────────────────────
  @Get('accounts')
  listAccounts(@CurrentUser() u: RequestUser) {
    return this.svc.listAccounts(u.clinic_id);
  }

  @Post('accounts')
  createAccount(@CurrentUser() u: RequestUser, @Body() dto: { name: string; type?: string; currency?: string }) {
    return this.svc.createAccount(u.clinic_id, dto, u.sub);
  }

  @Patch('accounts/:id')
  updateAccount(@CurrentUser() u: RequestUser, @Param('id') id: string, @Body() dto: { name?: string; is_active?: boolean }) {
    return this.svc.updateAccount(u.clinic_id, id, dto, u.sub);
  }

  // ── Counterparties ────────────────────────────────────────────────────────────
  @Get('counterparties')
  listCounterparties(@CurrentUser() u: RequestUser, @Query('search') search?: string) {
    return this.svc.listCounterparties(u.clinic_id, search);
  }

  @Post('counterparties')
  createCounterparty(@CurrentUser() u: RequestUser, @Body() dto: { type?: string; name: string; patient_id?: string; document_id?: string }) {
    return this.svc.createCounterparty(u.clinic_id, dto, u.sub);
  }

  // ── Receivables ───────────────────────────────────────────────────────────────
  @Get('receivables')
  listReceivables(
    @CurrentUser() u: RequestUser,
    @Query('status') status?: string,
    @Query('patientId') patientId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.listReceivables(u.clinic_id, { status, patientId, from, to, search, page: page ? +page : 1, limit: limit ? +limit : 30 });
  }

  @Post('receivables')
  createReceivable(@CurrentUser() u: RequestUser, @Body() dto: any) {
    return this.svc.createReceivable(u.clinic_id, dto, u.sub);
  }

  @Post('receivables/:id/pay')
  markReceivablePaid(@CurrentUser() u: RequestUser, @Param('id') id: string, @Body() dto: { amount: number; method?: string; account_id?: string; note?: string }) {
    return this.svc.markReceivablePaid(u.clinic_id, id, dto, u.sub);
  }

  @Post('receivables/:id/cancel')
  cancelReceivable(@CurrentUser() u: RequestUser, @Param('id') id: string, @Body() dto: { note: string }) {
    return this.svc.cancelReceivable(u.clinic_id, id, dto.note, u.sub);
  }

  // ── Payables ──────────────────────────────────────────────────────────────────
  @Get('payables')
  listPayables(
    @CurrentUser() u: RequestUser,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.listPayables(u.clinic_id, { status, category, from, to, search, page: page ? +page : 1, limit: limit ? +limit : 30 });
  }

  @Post('payables')
  createPayable(@CurrentUser() u: RequestUser, @Body() dto: any) {
    return this.svc.createPayable(u.clinic_id, dto, u.sub);
  }

  @Post('payables/:id/pay')
  markPayablePaid(@CurrentUser() u: RequestUser, @Param('id') id: string, @Body() dto: { account_id?: string; method?: string; note?: string }) {
    return this.svc.markPayablePaid(u.clinic_id, id, dto, u.sub);
  }

  @Post('payables/:id/cancel')
  cancelPayable(@CurrentUser() u: RequestUser, @Param('id') id: string, @Body() dto: { note: string }) {
    return this.svc.cancelPayable(u.clinic_id, id, dto.note, u.sub);
  }

  // ── Ledger ────────────────────────────────────────────────────────────────────
  @Get('ledger')
  listLedger(
    @CurrentUser() u: RequestUser,
    @Query('type') type?: string,
    @Query('account_id') account_id?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.listLedger(u.clinic_id, { type, account_id, from, to, page: page ? +page : 1, limit: limit ? +limit : 30 });
  }

  @Post('ledger/transfer')
  createTransfer(@CurrentUser() u: RequestUser, @Body() dto: { from_account_id: string; to_account_id: string; amount: number; description?: string }) {
    return this.svc.createTransfer(u.clinic_id, dto, u.sub);
  }

  // ── Budgets ───────────────────────────────────────────────────────────────────
  @Get('budgets')
  listBudgets(
    @CurrentUser() u: RequestUser,
    @Query('patientId') patientId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.listBudgets(u.clinic_id, { patientId, status, search, page: page ? +page : 1, limit: limit ? +limit : 20 });
  }

  @Post('budgets')
  createBudget(@CurrentUser() u: RequestUser, @Body() dto: any) {
    return this.svc.createBudget(u.clinic_id, dto, u.sub);
  }

  @Post('budgets/:id/approve')
  approveBudget(@CurrentUser() u: RequestUser, @Param('id') id: string) {
    return this.svc.approveBudget(u.clinic_id, id, u.sub);
  }

  @Post('budgets/:id/convert')
  convertBudget(@CurrentUser() u: RequestUser, @Param('id') id: string, @Body() dto: { due_date: string }) {
    return this.svc.convertBudgetToReceivable(u.clinic_id, id, dto, u.sub);
  }

  // ── Reports ───────────────────────────────────────────────────────────────────
  @Get('reports/summary')
  getSummary(@CurrentUser() u: RequestUser, @Query('from') from: string, @Query('to') to: string) {
    return this.svc.getSummary(u.clinic_id, from ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), to ?? new Date().toISOString());
  }

  @Get('reports/dre')
  getDRE(@CurrentUser() u: RequestUser, @Query('from') from: string, @Query('to') to: string) {
    return this.svc.getDRE(u.clinic_id, from, to);
  }

  @Get('reports/health')
  getHealth(@CurrentUser() u: RequestUser) {
    return this.svc.getHealthScore(u.clinic_id);
  }

  @Get('reports/audit')
  getAudit(
    @CurrentUser() u: RequestUser,
    @Query('entity_type') entity_type?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
  ) {
    return this.svc.getAuditLog(u.clinic_id, { entity_type, from, to, page: page ? +page : 1 });
  }

  // ── Close Day ─────────────────────────────────────────────────────────────────
  @Get('close-day')
  closeDay(@CurrentUser() u: RequestUser, @Query('date') date: string) {
    return this.svc.closeDay(u.clinic_id, date ?? new Date().toISOString().split('T')[0]);
  }

  // ── Patient Status ────────────────────────────────────────────────────────────
  @Get('patients/:patientId/status')
  getPatientFinancialStatus(@CurrentUser() u: RequestUser, @Param('patientId') patientId: string) {
    return this.svc.getPatientFinancialStatus(u.clinic_id, patientId);
  }
}
