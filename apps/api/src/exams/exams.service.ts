import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { EventsService } from '../events/events.service';
import { CreateExamDto } from './dto/create-exam.dto';

@Injectable()
export class ExamsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private events: EventsService,
  ) {}

  findByPatient(clinicId: string, patientId: string) {
    return this.prisma.exam.findMany({
      where: { clinic_id: clinicId, patient_id: patientId, deleted_at: null },
      include: { markers: { orderBy: { marker_name: 'asc' } } },
      orderBy: { exam_date: 'desc' },
    });
  }

  async findOne(clinicId: string, id: string) {
    const exam = await this.prisma.exam.findFirst({
      where: { id, clinic_id: clinicId, deleted_at: null },
      include: { markers: true, patient: { select: { id: true, full_name: true } } },
    });
    if (!exam) throw new NotFoundException('Exam not found');
    return exam;
  }

  async create(clinicId: string, dto: CreateExamDto, actorId: string) {
    const exam = await this.prisma.exam.create({
      data: {
        clinic_id: clinicId,
        patient_id: dto.patient_id,
        exam_date: new Date(dto.exam_date),
        laboratory: dto.laboratory,
        file_url: dto.file_url,
        processing_status: dto.markers?.length ? 'PROCESSED' : 'PENDING',
        markers: dto.markers
          ? { create: dto.markers.map(m => ({ ...m, patient_id: dto.patient_id })) }
          : undefined,
      },
      include: { markers: true },
    });
    await Promise.all([
      this.audit.log({ clinic_id: clinicId, actor_id: actorId, action: 'CREATE', entity_type: 'Exam', entity_id: exam.id }),
      this.events.emit({ clinic_id: clinicId, event_type: 'exam.uploaded', entity_type: 'Exam', entity_id: exam.id, actor_id: actorId }),
    ]);
    return exam;
  }

  async getMarkerTrend(clinicId: string, patientId: string, markerName: string) {
    return this.prisma.examMarker.findMany({
      where: { patient_id: patientId, standardized_name: markerName },
      orderBy: { created_at: 'asc' },
      select: { value: true, unit: true, status: true, trend: true, created_at: true, ideal_min: true, ideal_max: true },
    });
  }
}
