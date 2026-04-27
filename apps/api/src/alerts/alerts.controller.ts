import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { WaitlistEntryStatus, WaitlistReason } from '@prisma/client';
import { AlertsService } from './alerts.service';
import { AlertsEngine } from './alerts.engine';
import { CognitiveEngine } from './cognitive.engine';
import { TasksService } from './tasks.service';
import { CadenceEngine } from './cadence.engine';
import { QueryAlertsDto } from './dto/query-alerts.dto';
import { SnoozeAlertDto } from './dto/snooze-alert.dto';
import { ResolveAlertDto } from './dto/resolve-alert.dto';
import { AddWaitlistActionDto } from './dto/add-waitlist-action.dto';
import { CreateChargeActionDto } from './dto/create-charge-action.dto';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { AuditAction } from '@prisma/client';

class CreateWaitlistDto {
  @IsString()
  patientId: string;

  @IsOptional()
  @IsString()
  reason?: WaitlistReason;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  priority?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

class ScheduleWaitlistDto {
  @IsOptional()
  @IsString()
  appointmentId?: string;
}

@ApiTags('Alerts')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller()
export class AlertsController {
  constructor(
    private readonly alertsService: AlertsService,
    private readonly alertsEngine: AlertsEngine,
    private readonly cognitiveEngine: CognitiveEngine,
    private readonly tasksService: TasksService,
    private readonly cadenceEngine: CadenceEngine,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ── Alerts ──────────────────────────────────────────────────────────────────

  @Get('alerts')
  findAll(@CurrentUser() u: RequestUser, @Query() query: QueryAlertsDto) {
    return this.alertsService.findAll(u.clinic_id, query);
  }

  @Get('alerts/count')
  getOpenCount(@CurrentUser() u: RequestUser) {
    return this.alertsService.getOpenCount(u.clinic_id);
  }

  @Get('alerts/metrics')
  getMetrics(@CurrentUser() u: RequestUser) {
    return this.alertsService.getMetrics(u.clinic_id);
  }

  @Get('alerts/:id')
  findOne(@CurrentUser() u: RequestUser, @Param('id') id: string) {
    return this.alertsService.findOne(u.clinic_id, id);
  }

  @Post('alerts/:id/ack')
  @HttpCode(HttpStatus.OK)
  ack(@CurrentUser() u: RequestUser, @Param('id') id: string) {
    return this.alertsService.ack(u.clinic_id, id, u.sub);
  }

  @Post('alerts/:id/snooze')
  @HttpCode(HttpStatus.OK)
  snooze(@CurrentUser() u: RequestUser, @Param('id') id: string, @Body() dto: SnoozeAlertDto) {
    return this.alertsService.snooze(u.clinic_id, id, u.sub, dto.days);
  }

  @Post('alerts/:id/resolve')
  @HttpCode(HttpStatus.OK)
  resolve(@CurrentUser() u: RequestUser, @Param('id') id: string, @Body() dto: ResolveAlertDto) {
    return this.alertsService.resolve(u.clinic_id, id, u.sub, dto.note);
  }

  @Post('alerts/:id/dismiss')
  @HttpCode(HttpStatus.OK)
  dismiss(@CurrentUser() u: RequestUser, @Param('id') id: string, @Body() dto: ResolveAlertDto) {
    return this.alertsService.dismiss(u.clinic_id, id, u.sub, dto.note);
  }

  @Get('patients/:patientId/alerts')
  findByPatient(@CurrentUser() u: RequestUser, @Param('patientId') patientId: string) {
    return this.alertsService.findByPatient(u.clinic_id, patientId);
  }

  @Post('engine/run')
  @HttpCode(HttpStatus.OK)
  async runEngine(@CurrentUser() u: RequestUser) {
    return this.alertsEngine.runRulesForClinic(u.clinic_id);
  }

  @Post('engine/scores')
  @HttpCode(HttpStatus.OK)
  async runScores(@CurrentUser() u: RequestUser) {
    return this.cognitiveEngine.runClinicScores(u.clinic_id);
  }

  @Post('engine/scores/patient/:patientId')
  @HttpCode(HttpStatus.OK)
  async runPatientScore(@CurrentUser() u: RequestUser, @Param('patientId') patientId: string) {
    return this.cognitiveEngine.runPatientScore(patientId, u.clinic_id);
  }

  @Get('cognitive/patients/:patientId/score')
  async getPatientScore(@CurrentUser() u: RequestUser, @Param('patientId') patientId: string) {
    const score = await this.prisma.patientCognitiveScore.findFirst({
      where: { patient_id: patientId, clinic_id: u.clinic_id },
    });
    return score;
  }

  @Get('cognitive/top-risk')
  async getTopRisk(@CurrentUser() u: RequestUser, @Query('limit') limit = '10') {
    return this.prisma.patientCognitiveScore.findMany({
      where: { clinic_id: u.clinic_id },
      orderBy: [{ composite_risk_score: 'desc' }, { dropout_risk_30d: 'desc' }],
      take: parseInt(limit, 10),
      select: {
        id: true,
        patient_id: true,
        clinical_stability_score: true,
        retention_risk_score: true,
        composite_risk_score: true,
        score_trend: true,
        current_band: true,
        no_show_probability: true,
        dropout_risk_30d: true,
        clinical_trend: true,
        calculated_at: true,
        patient: { select: { id: true, full_name: true, current_status: true } },
      },
    });
  }

  // ── Waitlist ─────────────────────────────────────────────────────────────────

  @Post('waitlist')
  async createWaitlistEntry(@CurrentUser() u: RequestUser, @Body() dto: CreateWaitlistDto) {
    const entry = await this.prisma.waitlistEntry.create({
      data: {
        clinic_id: u.clinic_id,
        patient_id: dto.patientId,
        reason: (dto.reason as WaitlistReason) ?? WaitlistReason.NEW_VISIT,
        priority: dto.priority ?? 0,
        notes: dto.notes ?? null,
        status: WaitlistEntryStatus.OPEN,
      },
      include: { patient: { select: { id: true, full_name: true } } },
    });
    await this.audit.log({
      clinic_id: u.clinic_id,
      actor_id: u.sub,
      action: AuditAction.CREATE,
      entity_type: 'WaitlistEntry',
      entity_id: entry.id,
    });
    return entry;
  }

  @Get('waitlist')
  async getWaitlist(
    @CurrentUser() u: RequestUser,
    @Query('status') status?: WaitlistEntryStatus,
  ) {
    const where: any = { clinic_id: u.clinic_id };
    if (status) where.status = status;
    return this.prisma.waitlistEntry.findMany({
      where,
      include: { patient: { select: { id: true, full_name: true, phone: true } } },
      orderBy: [{ priority_score: 'desc' }, { created_at: 'asc' }],
    });
  }

  @Post('waitlist/:id/contacted')
  @HttpCode(HttpStatus.OK)
  async markContacted(@CurrentUser() u: RequestUser, @Param('id') id: string) {
    const entry = await this.prisma.waitlistEntry.findFirst({
      where: { id, clinic_id: u.clinic_id },
    });
    if (!entry) throw new Error('WaitlistEntry not found');

    const updated = await this.prisma.waitlistEntry.update({
      where: { id },
      data: { status: WaitlistEntryStatus.CONTACTED },
    });
    await this.audit.log({
      clinic_id: u.clinic_id,
      actor_id: u.sub,
      action: AuditAction.WAITLIST_CONTACTED,
      entity_type: 'WaitlistEntry',
      entity_id: id,
    });
    return updated;
  }

  @Post('waitlist/:id/scheduled')
  @HttpCode(HttpStatus.OK)
  async markScheduled(
    @CurrentUser() u: RequestUser,
    @Param('id') id: string,
    @Body() dto: ScheduleWaitlistDto,
  ) {
    const entry = await this.prisma.waitlistEntry.findFirst({
      where: { id, clinic_id: u.clinic_id },
    });
    if (!entry) throw new Error('WaitlistEntry not found');

    const updated = await this.prisma.waitlistEntry.update({
      where: { id },
      data: {
        status: WaitlistEntryStatus.SCHEDULED,
        resolved_at: new Date(),
      },
    });
    await this.audit.log({
      clinic_id: u.clinic_id,
      actor_id: u.sub,
      action: AuditAction.WAITLIST_SCHEDULED,
      entity_type: 'WaitlistEntry',
      entity_id: id,
      metadata: { appointment_id: dto.appointmentId },
    });
    return updated;
  }

  // ── Tasks ─────────────────────────────────────────────────────────────────────

  @Get('tasks')
  getTasks(@CurrentUser() u: RequestUser, @Query() q: any) {
    return this.tasksService.findAll(u.clinic_id, {
      status: q.status,
      priority: q.priority,
      type: q.type,
      ownerRole: q.owner_role,
      due: q.due,
      page: q.page ? parseInt(q.page) : 1,
      limit: q.limit ? parseInt(q.limit) : 20,
    });
  }

  @Get('tasks/count')
  getTaskCount(@CurrentUser() u: RequestUser) {
    return this.tasksService.getCount(u.clinic_id);
  }

  @Get('tasks/:id')
  getTask(@CurrentUser() u: RequestUser, @Param('id') id: string) {
    return this.tasksService.findOne(u.clinic_id, id);
  }

  @Post('tasks/:id/start')
  @HttpCode(HttpStatus.OK)
  startTask(@CurrentUser() u: RequestUser, @Param('id') id: string) {
    return this.tasksService.start(u.clinic_id, id, u.sub);
  }

  @Post('tasks/:id/snooze')
  @HttpCode(HttpStatus.OK)
  snoozeTask(@CurrentUser() u: RequestUser, @Param('id') id: string, @Body() body: { days: number }) {
    return this.tasksService.snooze(u.clinic_id, id, u.sub, body.days ?? 1);
  }

  @Post('tasks/:id/complete')
  @HttpCode(HttpStatus.OK)
  completeTask(@CurrentUser() u: RequestUser, @Param('id') id: string, @Body() body: { note?: string }) {
    return this.tasksService.complete(u.clinic_id, id, u.sub, body.note);
  }

  @Post('tasks/:id/cancel')
  @HttpCode(HttpStatus.OK)
  cancelTask(@CurrentUser() u: RequestUser, @Param('id') id: string, @Body() body: { note?: string }) {
    return this.tasksService.cancel(u.clinic_id, id, u.sub, body.note);
  }

  @Get('patients/:patientId/tasks')
  getPatientTasks(@CurrentUser() u: RequestUser, @Param('patientId') patientId: string) {
    return this.tasksService.findByPatient(u.clinic_id, patientId);
  }

  @Post('engine/cadence/run')
  @HttpCode(HttpStatus.OK)
  runCadence(@CurrentUser() u: RequestUser) {
    return this.cadenceEngine.runForClinic(u.clinic_id);
  }

  // ── Cognitive Brief & Actions ────────────────────────────────────────────────

  @Get('cognitive/patients/:patientId/brief')
  async getPatientBrief(@CurrentUser() u: RequestUser, @Param('patientId') patientId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, clinic_id: u.clinic_id, deleted_at: null },
      select: { id: true },
    });
    if (!patient) throw new NotFoundException('Patient not found');
    return this.cognitiveEngine.getPatientBrief(patientId, u.clinic_id);
  }

  @Get('cognitive/playbook')
  async getPlaybookConfig(@CurrentUser() u: RequestUser) {
    const config = await this.prisma.playbookConfig.findFirst({
      where: { clinic_id: u.clinic_id },
    });
    return config ?? { clinic_id: u.clinic_id, enabled: true, thresholds: { red: 70, yellow: 40 }, actions: {} };
  }

  @Post('cognitive/patients/:patientId/actions/add-waitlist')
  @HttpCode(HttpStatus.OK)
  async actionAddWaitlist(
    @CurrentUser() u: RequestUser,
    @Param('patientId') patientId: string,
    @Body() body: AddWaitlistActionDto,
  ) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, clinic_id: u.clinic_id, deleted_at: null },
      select: { id: true },
    });
    if (!patient) throw new NotFoundException('Patient not found');
    return this.cognitiveEngine.executeAction(patientId, u.clinic_id, 'add_waitlist', u.sub, body);
  }

  @Post('cognitive/patients/:patientId/actions/mark-contacted')
  @HttpCode(HttpStatus.OK)
  async actionMarkContacted(
    @CurrentUser() u: RequestUser,
    @Param('patientId') patientId: string,
  ) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, clinic_id: u.clinic_id, deleted_at: null },
      select: { id: true },
    });
    if (!patient) throw new NotFoundException('Patient not found');
    return this.cognitiveEngine.executeAction(patientId, u.clinic_id, 'mark_contacted', u.sub);
  }

  @Post('cognitive/patients/:patientId/actions/create-financial-charge')
  @HttpCode(HttpStatus.OK)
  async actionCreateCharge(
    @CurrentUser() u: RequestUser,
    @Param('patientId') patientId: string,
    @Body() body: CreateChargeActionDto,
  ) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, clinic_id: u.clinic_id, deleted_at: null },
      select: { id: true },
    });
    if (!patient) throw new NotFoundException('Patient not found');
    const result = await this.cognitiveEngine.executeAction(
      patientId,
      u.clinic_id,
      'create_financial_charge',
      u.sub,
      body,
    );
    if (!result.ok && result.result?.conflict) {
      throw new ConflictException('Pending charge already exists for today');
    }
    return result;
  }
}
