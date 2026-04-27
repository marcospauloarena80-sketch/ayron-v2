import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { EventsService } from '../events/events.service';
import { CryptoService } from '../common/crypto/crypto.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { PatientStatus, ConsentType, ConsentStatus } from '@prisma/client';

@Injectable()
export class PatientsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private events: EventsService,
    private crypto: CryptoService,
  ) {}

  private decryptPatient<T extends { cpf?: string | null; phone?: string }>(p: T): T {
    return {
      ...p,
      cpf: p.cpf ? this.crypto.decrypt(p.cpf) : p.cpf,
      phone: p.phone ? this.crypto.decrypt(p.phone) : p.phone,
    };
  }

  async findAll(
    clinicId: string,
    filters?: { status?: PatientStatus; search?: string; tag?: string; page?: number; limit?: number },
  ) {
    const page = Math.max(1, filters?.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters?.limit ?? 30));
    const skip = (page - 1) * limit;

    const where: any = { clinic_id: clinicId, deleted_at: null };
    if (filters?.status) where.current_status = filters.status;
    if (filters?.tag) where.tags = { has: filters.tag };
    if (filters?.search) {
      const searchHash = this.crypto.hashForSearch(filters.search);
      where.OR = [
        { full_name: { contains: filters.search, mode: 'insensitive' } },
        { cpf_search_hash: searchHash },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [raw, total] = await this.prisma.$transaction([
      this.prisma.patient.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        select: {
          id: true, full_name: true, birth_date: true, sex: true, cpf: true,
          phone: true, email: true, current_status: true, risk_level: true,
          risk_score: true, tags: true, insurance: true, created_at: true,
        },
      }),
      this.prisma.patient.count({ where }),
    ]);

    const data = raw.map((p) => this.decryptPatient(p));
    return { data, total, page, totalPages: Math.ceil(total / limit), limit };
  }

  async findOne(clinicId: string, id: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id, clinic_id: clinicId, deleted_at: null },
      include: {
        appointments: { orderBy: { start_time: 'desc' }, take: 5 },
        status_history: { orderBy: { created_at: 'desc' }, take: 10 },
        consent_records: true,
      },
    });
    if (!patient) throw new NotFoundException('Patient not found');
    return this.decryptPatient(patient);
  }

  async create(clinicId: string, dto: CreatePatientDto, actorId: string) {
    if (dto.cpf) {
      const searchHash = this.crypto.hashForSearch(dto.cpf);
      const exists = await this.prisma.patient.findFirst({
        where: { cpf_search_hash: searchHash, clinic_id: clinicId, deleted_at: null },
      });
      if (exists) throw new ConflictException('CPF already registered for this clinic');
    }

    const encryptedCpf = dto.cpf ? this.crypto.encrypt(dto.cpf) : undefined;
    const cpfSearchHash = dto.cpf ? this.crypto.hashForSearch(dto.cpf) : undefined;
    const encryptedPhone = dto.phone ? this.crypto.encrypt(dto.phone) : undefined;

    const patient = await this.prisma.patient.create({
      data: {
        ...dto,
        clinic_id: clinicId,
        birth_date: new Date(dto.birth_date),
        cpf: encryptedCpf,
        cpf_search_hash: cpfSearchHash,
        phone: encryptedPhone ?? dto.phone,
      },
    });
    await Promise.all([
      this.audit.log({ clinic_id: clinicId, actor_id: actorId, action: 'CREATE', entity_type: 'Patient', entity_id: patient.id }),
      this.events.emit({ clinic_id: clinicId, event_type: 'patient.created', entity_type: 'Patient', entity_id: patient.id, actor_id: actorId, payload: { name: patient.full_name } }),
    ]);
    return this.decryptPatient(patient);
  }

  async update(clinicId: string, id: string, dto: UpdatePatientDto, actorId: string) {
    const patient = await this.findOne(clinicId, id);
    const data: any = { ...dto };
    if (dto.birth_date) data.birth_date = new Date(dto.birth_date);
    if (dto.cpf) {
      data.cpf = this.crypto.encrypt(dto.cpf);
      data.cpf_search_hash = this.crypto.hashForSearch(dto.cpf);
    }
    if (dto.phone) {
      data.phone = this.crypto.encrypt(dto.phone);
    }
    const updated = await this.prisma.patient.update({ where: { id }, data });
    await Promise.all([
      this.audit.log({ clinic_id: clinicId, actor_id: actorId, action: 'UPDATE', entity_type: 'Patient', entity_id: id, data_before: { id: patient.id, name: patient.full_name }, data_after: { id: updated.id, name: updated.full_name } }),
      this.events.emit({ clinic_id: clinicId, event_type: 'patient.updated', entity_type: 'Patient', entity_id: id, actor_id: actorId }),
    ]);
    return this.decryptPatient(updated);
  }

  async changeStatus(clinicId: string, id: string, dto: ChangeStatusDto, actorId: string) {
    const patient = await this.findOne(clinicId, id);
    const [updated] = await this.prisma.$transaction([
      this.prisma.patient.update({ where: { id }, data: { current_status: dto.status } }),
      this.prisma.patientStatusHistory.create({
        data: { patient_id: id, clinic_id: clinicId, from_status: patient.current_status, to_status: dto.status, changed_by: actorId, reason: dto.reason },
      }),
    ]);
    await this.events.emit({ clinic_id: clinicId, event_type: 'patient.status_changed', entity_type: 'Patient', entity_id: id, actor_id: actorId, payload: { from: patient.current_status, to: dto.status } });
    return updated;
  }

  async remove(clinicId: string, id: string, actorId: string) {
    await this.findOne(clinicId, id);
    const deleted = await this.prisma.patient.update({ where: { id }, data: { deleted_at: new Date(), is_active: false } });
    await this.audit.log({ clinic_id: clinicId, actor_id: actorId, action: 'DELETE_SOFT', entity_type: 'Patient', entity_id: id });
    return deleted;
  }

  async getKanban(clinicId: string) {
    const patients = await this.prisma.patient.findMany({
      where: { clinic_id: clinicId, deleted_at: null, is_active: true },
      select: { id: true, full_name: true, current_status: true, risk_level: true, tags: true, phone: true },
      orderBy: { updated_at: 'desc' },
    });
    const grouped: Record<string, any[]> = {};
    for (const p of patients) {
      if (!grouped[p.current_status]) grouped[p.current_status] = [];
      grouped[p.current_status].push({ ...p, phone: this.crypto.decrypt(p.phone) });
    }
    return grouped;
  }

  async addConsent(
    clinicId: string,
    patientId: string,
    dto: { consent_type: ConsentType; accepted: boolean; ip_address?: string },
    actorId: string,
  ) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, clinic_id: clinicId, deleted_at: null },
    });
    if (!patient) throw new NotFoundException('Patient not found');

    const record = await this.prisma.patientConsentRecord.upsert({
      where: {
        patient_id_consent_type_clinic_id: {
          patient_id: patientId,
          consent_type: dto.consent_type,
          clinic_id: clinicId,
        },
      },
      create: {
        patient_id: patientId,
        clinic_id: clinicId,
        consent_type: dto.consent_type,
        status: dto.accepted ? ConsentStatus.GRANTED : ConsentStatus.REVOKED,
        granted_at: dto.accepted ? new Date() : new Date(),
        revoked_at: dto.accepted ? null : new Date(),
        ip_address: dto.ip_address,
        channel: 'WEB',
      },
      update: {
        status: dto.accepted ? ConsentStatus.GRANTED : ConsentStatus.REVOKED,
        granted_at: dto.accepted ? new Date() : undefined,
        revoked_at: dto.accepted ? null : new Date(),
        ip_address: dto.ip_address,
      },
    });

    await this.audit.log({
      clinic_id: clinicId,
      actor_id: actorId,
      action: 'UPDATE',
      entity_type: 'PatientConsent',
      entity_id: record.id,
      data_after: { consent_type: dto.consent_type, accepted: dto.accepted },
    });

    return record;
  }
}
