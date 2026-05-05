import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ClinicalService } from './clinical.service';
import { ProtocolSchedulerService } from './protocol-scheduler.service';
import { BioimpedanciaService } from './bioimpedancia.service';
import { CreateClinicalRecordDto } from './dto/create-clinical-record.dto';
import { CreatePatientMetricsDto } from './dto/create-patient-metrics.dto';
import { CreateProtocolDto, UpdateProtocolDto } from './dto/create-protocol.dto';
import { CreateImplantDto } from './dto/create-implant.dto';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';

@ApiTags('Clinical')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('clinical')
export class ClinicalController {
  constructor(
    private readonly service: ClinicalService,
    private readonly schedulerService: ProtocolSchedulerService,
    private readonly bioimpSvc: BioimpedanciaService,
  ) {}

  // ─── Active appointment for current professional ─────────────────────

  @Get('active')
  getActiveAppointment(@CurrentUser() u: RequestUser) {
    return this.service.getActiveAppointment(u.clinic_id, u.sub);
  }

  // ─── Records ────────────────────────────────────────────────────────

  @Post('records')
  createRecord(@CurrentUser() u: RequestUser, @Body() dto: CreateClinicalRecordDto) {
    return this.service.createRecord(u.clinic_id, dto, u.sub);
  }

  @Get('patients/:patientId/history')
  getPatientHistory(@CurrentUser() u: RequestUser, @Param('patientId') patientId: string) {
    return this.service.getPatientHistory(u.clinic_id, patientId);
  }

  @Get('appointments/:appointmentId')
  getAppointmentRecord(@CurrentUser() u: RequestUser, @Param('appointmentId') appointmentId: string) {
    return this.service.getAppointmentRecord(u.clinic_id, appointmentId);
  }

  // ─── Metrics ────────────────────────────────────────────────────────

  @Post('metrics')
  createMetrics(@CurrentUser() u: RequestUser, @Body() dto: CreatePatientMetricsDto) {
    return this.service.createMetrics(u.clinic_id, dto, u.sub);
  }

  @Get('metrics/patient/:patientId')
  getMetricsHistory(@CurrentUser() u: RequestUser, @Param('patientId') patientId: string) {
    return this.service.getPatientMetricsHistory(u.clinic_id, patientId);
  }

  // ─── Protocols ──────────────────────────────────────────────────────

  @Post('protocols')
  createProtocol(@CurrentUser() u: RequestUser, @Body() dto: CreateProtocolDto) {
    return this.service.createProtocol(u.clinic_id, dto, u.sub);
  }

  @Get('protocols/patient/:patientId')
  getPatientProtocols(@CurrentUser() u: RequestUser, @Param('patientId') patientId: string) {
    return this.service.getPatientProtocols(u.clinic_id, patientId);
  }

  @Patch('protocols/:id')
  updateProtocol(
    @CurrentUser() u: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateProtocolDto,
  ) {
    return this.service.updateProtocol(u.clinic_id, id, dto, u.sub);
  }

  // ─── Implants ───────────────────────────────────────────────────────

  @Post('implants')
  createImplant(@CurrentUser() u: RequestUser, @Body() dto: CreateImplantDto) {
    return this.service.createImplant(u.clinic_id, dto, u.sub);
  }

  @Get('implants/patient/:patientId')
  getPatientImplants(@CurrentUser() u: RequestUser, @Param('patientId') patientId: string) {
    return this.service.getPatientImplants(u.clinic_id, patientId);
  }

  // ─── Protocol Scheduler ─────────────────────────────────────────────

  @Post('protocols/:id/generate-slots')
  generateProtocolSlots(
    @CurrentUser() u: RequestUser,
    @Param('id') id: string,
    @Body() dto: { professional_id: string; service_id?: string; duration_min?: number; start_date?: string },
  ) {
    return this.schedulerService.generateProtocolSlots(u.clinic_id, id, dto, u.sub);
  }

  @Get('protocols/:id/sessions')
  getProtocolSessions(@CurrentUser() u: RequestUser, @Param('id') id: string) {
    return this.schedulerService.getProtocolSessions(u.clinic_id, id);
  }

  // ─── Bioimpedância upload ────────────────────────────────────────────────

  @Post('patients/:patientId/bioimpedance/upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadBioimpedance(
    @CurrentUser() u: RequestUser,
    @Param('patientId') patientId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.bioimpSvc.uploadAndExtract(u.clinic_id, patientId, file, u.sub);
  }

  @Post('patients/:patientId/bioimpedance/confirm')
  confirmBioimpedance(
    @CurrentUser() u: RequestUser,
    @Param('patientId') patientId: string,
    @Body() dto: {
      appointment_id?: string; weight_kg?: number; body_fat_pct?: number;
      visceral_fat?: number; muscle_mass_kg?: number; bmr?: number;
      object_key?: string; notes?: string;
    },
  ) {
    return this.bioimpSvc.confirmBioimpedance(u.clinic_id, patientId, dto.appointment_id, dto, u.sub);
  }

  // ─── Consultation Sessions (Consulta IA) ──────────────────────────────────

  @Post('records/upload-session')
  @UseInterceptors(FileInterceptor('audio'))
  uploadConsultationAudio(
    @CurrentUser() u: RequestUser,
    @Body('patient_id') patientId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.uploadConsultationSession(u.clinic_id, patientId, file, u.sub);
  }

  @Post('records/:id/transcribe')
  transcribeSession(
    @CurrentUser() u: RequestUser,
    @Param('id') id: string,
  ) {
    return this.service.transcribeConsultationSession(u.clinic_id, id, u.sub);
  }

  @Get('records/patient/:patientId/latest-session')
  getLatestSession(
    @CurrentUser() u: RequestUser,
    @Param('patientId') patientId: string,
  ) {
    return this.service.getLatestConsultationSession(u.clinic_id, patientId);
  }

  @Get('records/:id')
  getRecord(
    @CurrentUser() u: RequestUser,
    @Param('id') id: string,
  ) {
    return this.service.getRecordById(u.clinic_id, id);
  }

  // ─── Clinical Audit Log ──────────────────────────────────────────────────────

  @Post('audit')
  logAudit(
    @CurrentUser() u: RequestUser,
    @Body() dto: {
      patient_id: string;
      action: string;
      detail: string;
      data_before?: Record<string, unknown>;
      data_after?: Record<string, unknown>;
    },
  ) {
    return this.service.logClinicalAction(u.clinic_id, dto.patient_id, u.sub, dto);
  }

  @Get('audit')
  getAuditLogs(
    @CurrentUser() u: RequestUser,
    @Query('patientId') patientId: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getClinicalAuditLogs(u.clinic_id, patientId, limit ? parseInt(limit, 10) : 30);
  }
}
