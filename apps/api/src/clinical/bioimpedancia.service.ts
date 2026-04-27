import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { StorageService } from '../common/storage/storage.service';

@Injectable()
export class BioimpedanciaService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private storage: StorageService,
  ) {}

  async uploadAndExtract(
    clinicId: string,
    patientId: string,
    file: Express.Multer.File,
    actorId: string,
  ) {
    const objectKey = `${clinicId}/bioimpedance/${patientId}/${Date.now()}_${file.originalname}`;
    let uploadFailed = false;
    try {
      await this.storage.uploadBuffer(objectKey, file.buffer, file.mimetype);
    } catch {
      uploadFailed = true;
    }

    const extracted = this.extractFromFilename(file.originalname, file.buffer);

    return {
      object_key: uploadFailed ? null : objectKey,
      upload_failed: uploadFailed,
      extracted_fields: extracted.fields,
      confidence: extracted.confidence,
      preview_message: 'Revise os campos sugeridos antes de confirmar',
    };
  }

  async confirmBioimpedance(
    clinicId: string,
    patientId: string,
    appointmentId: string | undefined,
    data: {
      weight_kg?: number; body_fat_pct?: number; visceral_fat?: number;
      muscle_mass_kg?: number; bmr?: number; object_key?: string; notes?: string;
    },
    actorId: string,
  ) {
    const record = await this.prisma.patientMetrics.create({
      data: {
        clinic_id: clinicId,
        patient_id: patientId,
        appointment_id: appointmentId ?? null,
        recorded_by: actorId,
        weight_kg: data.weight_kg,
        body_fat_pct: data.body_fat_pct,
        visceral_fat: data.visceral_fat,
        muscle_mass_kg: data.muscle_mass_kg,
        bmr: data.bmr,
        is_bioimpedance: true,
        attachment_key: data.object_key,
        notes: data.notes,
      },
    });
    await this.audit.log({
      clinic_id: clinicId, actor_id: actorId, action: 'CREATE' as any,
      entity_type: 'PatientMetrics', entity_id: record.id,
      metadata: { source: 'bioimpedance_upload' },
    });
    return record;
  }

  private extractFromFilename(filename: string, buffer: Buffer): { fields: Record<string, any>; confidence: number } {
    const text = buffer.toString('utf-8', 0, Math.min(buffer.length, 4096));
    const fields: Record<string, any> = {};
    let matched = 0;

    const weightMatch = text.match(/peso[:\s]+(\d+[.,]\d+)/i) ?? text.match(/weight[:\s]+(\d+[.,]\d+)/i);
    if (weightMatch) { fields.weight_kg = parseFloat(weightMatch[1].replace(',', '.')); matched++; }

    const fatMatch = text.match(/gordura[:\s]+(\d+[.,]\d+)/i) ?? text.match(/body fat[:\s]+(\d+[.,]\d+)/i);
    if (fatMatch) { fields.body_fat_pct = parseFloat(fatMatch[1].replace(',', '.')); matched++; }

    const visceralMatch = text.match(/visceral[:\s]+(\d+)/i);
    if (visceralMatch) { fields.visceral_fat = parseInt(visceralMatch[1]); matched++; }

    const muscleMatch = text.match(/músculo[:\s]+(\d+[.,]\d+)/i) ?? text.match(/muscle[:\s]+(\d+[.,]\d+)/i);
    if (muscleMatch) { fields.muscle_mass_kg = parseFloat(muscleMatch[1].replace(',', '.')); matched++; }

    const bmrMatch = text.match(/metabolismo[:\s]+(\d+)/i) ?? text.match(/bmr[:\s]+(\d+)/i);
    if (bmrMatch) { fields.bmr = parseInt(bmrMatch[1]); matched++; }

    const confidence = Math.min(Math.round((matched / 5) * 100), 100);
    return { fields, confidence };
  }
}
