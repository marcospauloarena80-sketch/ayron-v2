import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { EventsService } from '../events/events.service';
import { CreateClinicalRecordDto } from './dto/create-clinical-record.dto';
import { CreatePatientMetricsDto } from './dto/create-patient-metrics.dto';
import { CreateProtocolDto, UpdateProtocolDto } from './dto/create-protocol.dto';
import { CreateImplantDto } from './dto/create-implant.dto';
import { StorageService } from '../common/storage/storage.service';
import { AiTranscriptionService } from './ai-transcription.service';
import { AuditAction } from '@prisma/client';

@Injectable()
export class ClinicalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly events: EventsService,
    private readonly storage: StorageService,
    private readonly aiTranscription: AiTranscriptionService,
  ) {}

  // ─── Clinical Records ────────────────────────────────────────────────

  /** Guard: throws ForbiddenException if the appointment is no longer writable */
  private async assertAppointmentEditable(clinicId: string, appointmentId: string | undefined, actorId: string) {
    if (!appointmentId) return;
    const appt = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, clinic_id: clinicId, deleted_at: null },
    });
    if (!appt) return; // appointment not found — let the FK constraint handle it
    const FINALIZED = ['COMPLETED', 'CANCELLED', 'MISSED'];
    if (FINALIZED.includes(appt.status)) {
      await this.audit.log({
        actor_id: actorId, clinic_id: clinicId, action: 'UPDATE' as any,
        entity_type: 'Appointment', entity_id: appointmentId,
        data_after: { reason: 'write_blocked_finalized', status: appt.status },
      });
      throw new ForbiddenException(
        `Consulta finalizada — edição bloqueada. Status atual: ${appt.status}`,
      );
    }
  }

  // ─── Active appointment for current professional ──────────────────────
  async getActiveAppointment(clinicId: string, userId: string) {
    const professional = await this.prisma.professional.findFirst({
      where: { clinic_id: clinicId, user_id: userId, deleted_at: null },
    });
    if (!professional) return { hasActive: false };

    const appt = await this.prisma.appointment.findFirst({
      where: {
        clinic_id: clinicId,
        professional_id: professional.id,
        status: { in: ['CHECKED_IN', 'IN_PROGRESS'] },
        deleted_at: null,
      },
      orderBy: { start_time: 'desc' },
      include: { patient: { select: { id: true, full_name: true } } },
    });
    if (!appt) return { hasActive: false };

    return {
      hasActive: true,
      appointmentId: appt.id,
      patientId: appt.patient_id,
      patientName: (appt.patient as any)?.full_name ?? '',
      startTime: appt.start_time,
    };
  }

  async createRecord(clinicId: string, dto: CreateClinicalRecordDto, actorId: string) {
    await this.assertAppointmentEditable(clinicId, dto.appointment_id, actorId);
    const professional = await this.prisma.professional.findFirst({
      where: { clinic_id: clinicId, user_id: actorId, deleted_at: null },
    });
    if (!professional) {
      throw new NotFoundException('Profissional não encontrado para este usuário');
    }

    const record = await this.prisma.clinicalRecord.create({
      data: {
        clinic_id: clinicId,
        patient_id: dto.patient_id,
        appointment_id: dto.appointment_id,
        professional_id: professional.id,
        transcription: dto.transcription,
        structured_data: (dto.structured_data ?? {}) as any,
        summary_ai: dto.summary_ai,
        voice_file_url: dto.voice_file_url,
      },
      include: { patient: { select: { full_name: true } }, professional: { select: { name: true } } },
    });

    await Promise.all([
      this.audit.log({
        actor_id: actorId, clinic_id: clinicId, action: 'CREATE',
        entity_type: 'ClinicalRecord', entity_id: record.id,
        data_after: { patient_id: record.patient_id, appointment_id: record.appointment_id },
      }),
      this.events.emit({
        clinic_id: clinicId, entity_type: 'ClinicalRecord', entity_id: record.id,
        event_type: 'clinical.record_created', actor_id: actorId,
        payload: { patient_id: record.patient_id, appointment_id: record.appointment_id },
      }),
    ]);

    return record;
  }

  async getPatientHistory(clinicId: string, patientId: string) {
    const [records, metrics, protocols, implants] = await Promise.all([
      this.prisma.clinicalRecord.findMany({
        where: { clinic_id: clinicId, patient_id: patientId, deleted_at: null },
        orderBy: { created_at: 'desc' },
        include: {
          professional: { select: { name: true, specialty: true } },
          appointment: { select: { start_time: true, type: true, service: { select: { name: true } } } },
        },
      }),
      this.prisma.patientMetrics.findMany({
        where: { clinic_id: clinicId, patient_id: patientId, deleted_at: null },
        orderBy: { created_at: 'desc' },
        take: 20,
      }),
      this.prisma.treatmentProtocol.findMany({
        where: { clinic_id: clinicId, patient_id: patientId, deleted_at: null },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.hormoneImplant.findMany({
        where: { clinic_id: clinicId, patient_id: patientId, deleted_at: null },
        orderBy: { application_date: 'desc' },
      }),
    ]);
    return { records, metrics, protocols, implants };
  }

  async getAppointmentRecord(clinicId: string, appointmentId: string) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, clinic_id: clinicId, deleted_at: null },
      include: {
        patient: { select: { id: true, full_name: true, birth_date: true, sex: true, current_status: true, tags: true, risk_level: true } },
        professional: { select: { id: true, name: true, specialty: true } },
        service: { select: { name: true, duration_min: true } },
        clinical_records: {
          where: { deleted_at: null },
          orderBy: { created_at: 'desc' },
          include: { professional: { select: { name: true } } },
        },
        patient_metrics: {
          where: { deleted_at: null },
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
    });
    if (!appointment) throw new NotFoundException('Agendamento não encontrado');
    return appointment;
  }

  // ─── Patient Metrics ─────────────────────────────────────────────────

  async createMetrics(clinicId: string, dto: CreatePatientMetricsDto, actorId: string) {
    await this.assertAppointmentEditable(clinicId, dto.appointment_id, actorId);
    const bmi =
      dto.weight_kg && dto.height_cm
        ? parseFloat((dto.weight_kg / ((dto.height_cm / 100) ** 2)).toFixed(2))
        : undefined;

    const metrics = await this.prisma.patientMetrics.create({
      data: {
        clinic_id: clinicId,
        patient_id: dto.patient_id,
        appointment_id: dto.appointment_id,
        recorded_by: actorId,
        weight_kg: dto.weight_kg,
        height_cm: dto.height_cm,
        bmi,
        body_fat_pct: dto.body_fat_pct,
        lean_mass_kg: dto.lean_mass_kg,
        waist_cm: dto.waist_cm,
        bp_systolic: dto.bp_systolic,
        bp_diastolic: dto.bp_diastolic,
        heart_rate: dto.heart_rate,
        notes: dto.notes,
      },
    });

    await this.audit.log({
      actor_id: actorId, clinic_id: clinicId, action: 'CREATE',
      entity_type: 'PatientMetrics', entity_id: metrics.id,
      data_after: { patient_id: dto.patient_id, bmi },
    });

    return metrics;
  }

  async getPatientMetricsHistory(clinicId: string, patientId: string) {
    return this.prisma.patientMetrics.findMany({
      where: { clinic_id: clinicId, patient_id: patientId, deleted_at: null },
      orderBy: { created_at: 'desc' },
      take: 50,
    });
  }

  // ─── Treatment Protocols ─────────────────────────────────────────────

  async createProtocol(clinicId: string, dto: CreateProtocolDto, actorId: string) {
    const protocol = await this.prisma.treatmentProtocol.create({
      data: {
        clinic_id: clinicId,
        patient_id: dto.patient_id,
        type: dto.type,
        name: dto.name,
        description: dto.description,
        start_date: new Date(dto.start_date),
        end_date: dto.end_date ? new Date(dto.end_date) : undefined,
        status: dto.status ?? 'ATIVO',
        notes: dto.notes,
        created_by: actorId,
      },
    });

    await this.audit.log({
      actor_id: actorId, clinic_id: clinicId, action: 'CREATE',
      entity_type: 'TreatmentProtocol', entity_id: protocol.id,
      data_after: { patient_id: dto.patient_id, type: dto.type, name: dto.name },
    });

    return protocol;
  }

  async getAllProtocols(clinicId: string, params?: { status?: string; limit?: number; page?: number }) {
    const limit = params?.limit ?? 50;
    const page = params?.page ?? 1;
    const where: any = { clinic_id: clinicId, deleted_at: null };
    if (params?.status) where.status = params.status;
    const [protocols, total] = await Promise.all([
      this.prisma.treatmentProtocol.findMany({
        where,
        include: { patient: { select: { id: true, full_name: true, avatar_url: true } } },
        orderBy: { start_date: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      this.prisma.treatmentProtocol.count({ where }),
    ]);
    return { data: protocols, total, page, limit };
  }

  async getPatientProtocols(clinicId: string, patientId: string) {
    return this.prisma.treatmentProtocol.findMany({
      where: { clinic_id: clinicId, patient_id: patientId, deleted_at: null },
      orderBy: { start_date: 'desc' },
    });
  }

  async updateProtocol(clinicId: string, id: string, dto: UpdateProtocolDto, actorId: string) {
    const existing = await this.prisma.treatmentProtocol.findFirst({
      where: { id, clinic_id: clinicId, deleted_at: null },
    });
    if (!existing) throw new NotFoundException('Protocolo não encontrado');

    const updated = await this.prisma.treatmentProtocol.update({
      where: { id },
      data: {
        status: dto.status,
        notes: dto.notes,
        end_date: dto.end_date ? new Date(dto.end_date) : undefined,
      },
    });

    await this.audit.log({
      actor_id: actorId, clinic_id: clinicId, action: 'UPDATE',
      entity_type: 'TreatmentProtocol', entity_id: id,
      data_before: { status: existing.status },
      data_after: { status: dto.status },
    });

    return updated;
  }

  // ─── Hormone Implants ─────────────────────────────────────────────────

  async createImplant(clinicId: string, dto: CreateImplantDto, actorId: string) {
    const implant = await this.prisma.hormoneImplant.create({
      data: {
        clinic_id: clinicId,
        patient_id: dto.patient_id,
        appointment_id: dto.appointment_id,
        applied_by: actorId,
        hormone_type: dto.hormone_type,
        dosage_mg: dto.dosage_mg,
        application_date: new Date(dto.application_date),
        lot_number: dto.lot_number,
        next_change_date: dto.next_change_date ? new Date(dto.next_change_date) : undefined,
        site: dto.site,
        observations: dto.observations,
      },
    });

    await Promise.all([
      this.audit.log({
        actor_id: actorId, clinic_id: clinicId, action: 'CREATE',
        entity_type: 'HormoneImplant', entity_id: implant.id,
        data_after: { patient_id: dto.patient_id, hormone_type: dto.hormone_type, dosage_mg: dto.dosage_mg },
      }),
      this.events.emit({
        clinic_id: clinicId, entity_type: 'HormoneImplant', entity_id: implant.id,
        event_type: 'clinical.implant_applied', actor_id: actorId,
        payload: { patient_id: dto.patient_id, hormone_type: dto.hormone_type },
      }),
    ]);

    return implant;
  }

  async getPatientImplants(clinicId: string, patientId: string) {
    return this.prisma.hormoneImplant.findMany({
      where: { clinic_id: clinicId, patient_id: patientId, deleted_at: null },
      orderBy: { application_date: 'desc' },
    });
  }

  // ─── Consultation Sessions (Consulta IA) ────────────────────────────────────

  async uploadConsultationSession(
    clinicId: string,
    patientId: string,
    file: Express.Multer.File,
    actorId: string,
  ) {
    const key = `clinical/${clinicId}/${patientId}/sessions/${Date.now()}-${file.originalname}`;
    await this.storage.uploadBuffer(key, file.buffer, file.mimetype);

    const endpoint = process.env.MINIO_ENDPOINT ?? 'http://localhost:9000';
    const bucket = process.env.MINIO_BUCKET ?? 'ayron-docs';
    const audioUrl = `${endpoint}/${bucket}/${key}`;

    const record = await this.prisma.clinicalRecord.create({
      data: {
        clinic_id: clinicId,
        patient_id: patientId,
        professional_id: actorId,
        voice_file_url: audioUrl,
        transcription: null,
        structured_data: {},
        summary_ai: null,
      },
    });

    await this.audit.log({
      clinic_id: clinicId,
      actor_id: actorId,
      action: 'CREATE',
      entity_type: 'ClinicalRecord',
      entity_id: record.id,
    });

    return { id: record.id, voice_file_url: audioUrl };
  }

  async transcribeConsultationSession(clinicId: string, id: string, actorId: string) {
    const record = await this.prisma.clinicalRecord.findFirst({
      where: { id, clinic_id: clinicId, deleted_at: null },
    });
    if (!record) throw new NotFoundException('Session not found');
    if (!record.voice_file_url) throw new BadRequestException('No audio file associated with this session');

    const audioBuffer = await this.storage.download(record.voice_file_url);
    const rawText = await this.aiTranscription.transcribeAudio(audioBuffer, 'consulta.webm');
    const { segments } = await this.aiTranscription.diarizeAndClassify(rawText);
    const extraction = await this.aiTranscription.extractClinicalData(segments);

    await this.prisma.clinicalRecord.update({
      where: { id },
      data: {
        transcription: rawText,
        structured_data: { segments, ...extraction } as object,
        summary_ai: extraction.queixa_principal,
      },
    });

    await this.audit.log({
      clinic_id: clinicId,
      actor_id: actorId,
      action: 'UPDATE',
      entity_type: 'ClinicalRecord',
      entity_id: id,
    });

    return { id, transcription: rawText, segments, extraction };
  }

  async getLatestConsultationSession(clinicId: string, patientId: string) {
    const record = await this.prisma.clinicalRecord.findFirst({
      where: { clinic_id: clinicId, patient_id: patientId, deleted_at: null },
      orderBy: { created_at: 'desc' },
    });
    if (!record) return null;
    const data = record.structured_data as Record<string, unknown> | null;
    return {
      id: record.id,
      voice_file_url: record.voice_file_url,
      transcript: data?.segments ? { segments: data.segments } : null,
      structured_data: data?.queixa_principal ? data : null,
      summary_ai: record.summary_ai,
    };
  }

  async getRecordById(clinicId: string, id: string) {
    const record = await this.prisma.clinicalRecord.findFirst({
      where: { id, clinic_id: clinicId, deleted_at: null },
    });
    if (!record) throw new NotFoundException('Record not found');
    const data = record.structured_data as Record<string, unknown> | null;
    return {
      id: record.id,
      voice_file_url: record.voice_file_url,
      transcript: data?.segments ? { segments: data.segments } : null,
      structured_data: data?.queixa_principal ? data : null,
      summary_ai: record.summary_ai,
    };
  }

  // ─── Clinical Audit Log ──────────────────────────────────────────────────────

  async logClinicalAction(
    clinicId: string,
    patientId: string,
    actorId: string,
    dto: { action: string; detail: string; data_before?: Record<string, unknown>; data_after?: Record<string, unknown> },
  ) {
    // Map frontend action strings to AuditAction enum values
    const ACTION_MAP: Record<string, AuditAction> = {
      EVOLUÇÃO_REGISTRADA: 'CREATE' as AuditAction,
      CID_ALTERADO: 'UPDATE' as AuditAction,
      EVOLUÇÃO_PRÉ_PREENCHIDA: 'AI_GENERATE' as AuditAction,
      ANAMNESE_PRÉ_PREENCHIDA: 'AI_GENERATE' as AuditAction,
      RECEITA_PRÉ_PREENCHIDA: 'AI_GENERATE' as AuditAction,
      EXAME_PRÉ_PREENCHIDO: 'AI_GENERATE' as AuditAction,
      KANBAN_OVERRIDE: 'STAGE_CHANGE' as AuditAction,
    };
    const auditAction: AuditAction = ACTION_MAP[dto.action] ?? ('UPDATE' as AuditAction);

    await this.audit.log({
      clinic_id: clinicId,
      actor_id: actorId,
      action: auditAction,
      entity_type: 'Patient',
      entity_id: patientId,
      metadata: { action_label: dto.action, detail: dto.detail },
      data_before: dto.data_before,
      data_after: dto.data_after,
    });

    return { ok: true };
  }

  async getClinicalAuditLogs(clinicId: string, patientId: string, limit = 30) {
    const logs = await this.prisma.auditLog.findMany({
      where: {
        clinic_id: clinicId,
        entity_type: 'Patient',
        entity_id: patientId,
      },
      orderBy: { created_at: 'desc' },
      take: limit,
      select: {
        id: true,
        action: true,
        metadata: true,
        data_before: true,
        data_after: true,
        created_at: true,
        actor: { select: { name: true } },
      },
    });

    return logs.map(l => ({
      id: l.id,
      action: (l.metadata as Record<string, string>)?.action_label ?? l.action,
      detail: (l.metadata as Record<string, string>)?.detail ?? '',
      actor: l.actor?.name ?? 'Sistema',
      ts: l.created_at.toISOString(),
      data_before: l.data_before,
      data_after: l.data_after,
    }));
  }
}
