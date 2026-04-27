import * as fs from 'fs';
import * as path from 'path';
import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { StorageService } from '../common/storage/storage.service';
import { PdfService } from '../common/pdf/pdf.service';
import { RequestUser } from '../common/decorators/current-user.decorator';
import { CreateDocumentDto, UpdateDocumentDto } from './dto/document.dto';
import { DocumentStatus, DocumentType, UserRole } from '@prisma/client';

const SIGN_ROLES: UserRole[] = [UserRole.MEDICO, UserRole.MASTER];
const VALIDATE_ROLES: UserRole[] = [UserRole.GERENTE, UserRole.MASTER];
const TMP_DIR = '/tmp/ayron-docs';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly storage: StorageService,
    private readonly pdf: PdfService,
  ) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
  }

  private async findOwned(id: string, clinicId: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id, clinic_id: clinicId, deleted_at: null },
      include: {
        patient: { select: { full_name: true, cpf: true } },
        creator: { select: { name: true } },
        signer: { select: { name: true } },
      },
    });
    if (!doc) throw new NotFoundException('Documento não encontrado');
    return doc;
  }

  async create(dto: CreateDocumentDto, user: RequestUser) {
    const doc = await this.prisma.document.create({
      data: {
        clinic_id: user.clinic_id,
        patient_id: dto.patientId,
        appointment_id: dto.appointmentId ?? null,
        created_by: user.sub,
        type: dto.type,
        title: dto.title,
        content: dto.content,
        metadata: (dto.metadata ?? {}) as any,
        status: DocumentStatus.DRAFT,
      },
    });
    await this.audit.log({
      clinic_id: user.clinic_id,
      actor_id: user.sub,
      actor_role: user.role as UserRole,
      action: 'CREATE',
      entity_type: 'Document',
      entity_id: doc.id,
    });
    return doc;
  }

  async update(id: string, dto: UpdateDocumentDto, user: RequestUser) {
    const doc = await this.findOwned(id, user.clinic_id);
    if (doc.locked_at) {
      throw new ForbiddenException('Documento já assinado. Edição bloqueada.');
    }
    const updated = await this.prisma.document.update({
      where: { id },
      data: {
        title: dto.title ?? doc.title,
        content: dto.content ?? doc.content,
        metadata: (dto.metadata ?? doc.metadata) as any,
      },
    });
    await this.audit.log({
      clinic_id: user.clinic_id,
      actor_id: user.sub,
      actor_role: user.role as UserRole,
      action: 'UPDATE',
      entity_type: 'Document',
      entity_id: id,
    });
    return updated;
  }

  async findOne(id: string, user: RequestUser) {
    return this.findOwned(id, user.clinic_id);
  }

  async findByPatient(
    patientId: string,
    user: RequestUser,
    params: { type?: DocumentType; status?: DocumentStatus; page?: number; limit?: number },
  ) {
    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 20, 100);
    const skip = (page - 1) * limit;
    const where = {
      clinic_id: user.clinic_id,
      patient_id: patientId,
      deleted_at: null,
      ...(params.type ? { type: params.type } : {}),
      ...(params.status ? { status: params.status } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        include: {
          creator: { select: { name: true } },
          signer: { select: { name: true } },
        },
      }),
      this.prisma.document.count({ where }),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async sign(id: string, user: RequestUser) {
    if (!SIGN_ROLES.includes(user.role as UserRole)) {
      throw new ForbiddenException('Apenas médicos e administradores podem assinar documentos');
    }
    const doc = await this.findOwned(id, user.clinic_id);
    if (doc.status !== DocumentStatus.DRAFT) {
      throw new BadRequestException('Apenas documentos em rascunho podem ser assinados');
    }
    if (doc.locked_at) {
      throw new ForbiddenException('Documento já assinado. Edição bloqueada.');
    }

    const hash = createHash('sha256').update(doc.content).digest('hex');
    const now = new Date();
    const isControlled = doc.type === DocumentType.PRESCRIPTION_CONTROLLED;
    const newStatus = isControlled ? DocumentStatus.PENDING_CFM_VALIDATION : DocumentStatus.SIGNED;

    const [signerInfo, clinicInfo] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: user.sub }, select: { name: true } }),
      this.prisma.clinic.findUnique({ where: { id: user.clinic_id }, select: { name: true } }),
    ]);

    const objectKey = `docs/${user.clinic_id}/${id}/original.pdf`;
    let pdfObjectKey: string | null = null;
    let pdfUploadFailed = false;

    let pdfBuffer: Buffer | null = null;
    try {
      pdfBuffer = await this.pdf.generateDocument({
        type: doc.type,
        title: doc.title,
        content: doc.content,
        patientName: (doc as any).patient?.full_name ?? 'Paciente',
        patientDocument: (doc as any).patient?.cpf ?? '',
        doctorName: signerInfo?.name ?? user.sub,
        doctorCrm: '',
        clinicName: clinicInfo?.name ?? 'AYRON Clinic',
        documentHash: hash,
        status: newStatus,
        signedAt: now,
        isValidatedVersion: false,
      });
    } catch (pdfErr) {
      this.logger.error(`PDF generation failed for doc ${id}: ${(pdfErr as Error).message}`);
      pdfUploadFailed = true;
    }

    if (pdfBuffer) {
      try {
        await this.storage.uploadBuffer(objectKey, pdfBuffer, 'application/pdf');
        pdfObjectKey = objectKey;
      } catch (uploadErr) {
        this.logger.error(`MinIO upload failed for doc ${id}: ${(uploadErr as Error).message}`);
        const tmpPath = path.join(TMP_DIR, `${id}.pdf`);
        fs.writeFileSync(tmpPath, pdfBuffer);
        this.logger.warn(`PDF saved to fallback: ${tmpPath}`);
        pdfUploadFailed = true;
      }
    }

    const existingMeta = (doc.metadata as Record<string, any>) ?? {};
    const updated = await this.prisma.document.update({
      where: { id },
      data: {
        status: newStatus,
        signed_at: now,
        signed_by: user.sub,
        locked_at: now,
        document_hash: hash,
        pdf_object_key: pdfObjectKey,
        metadata: {
          ...existingMeta,
          pdf_upload_failed: pdfUploadFailed,
        } as any,
      },
      include: {
        patient: { select: { full_name: true, cpf: true } },
        creator: { select: { name: true } },
        signer: { select: { name: true } },
      },
    });

    await this.prisma.documentSignature.create({
      data: {
        document_id: id,
        signed_by: user.sub,
        signature: hash,
      },
    });

    await this.audit.log({
      clinic_id: user.clinic_id,
      actor_id: user.sub,
      actor_role: user.role as UserRole,
      action: 'SIGN',
      entity_type: 'Document',
      entity_id: id,
      data_after: { status: newStatus, hash, pdf_upload_failed: pdfUploadFailed },
    });

    return {
      ...updated,
      pdf_available: !pdfUploadFailed,
      pdf_upload_failed: pdfUploadFailed,
    };
  }

  async retryPdfUpload(id: string, user: RequestUser) {
    const doc = await this.findOwned(id, user.clinic_id);

    const allowedStatuses: DocumentStatus[] = [DocumentStatus.SIGNED, DocumentStatus.PENDING_CFM_VALIDATION];
    if (!allowedStatuses.includes(doc.status)) {
      throw new BadRequestException('Documento não está em estado que permite retry de upload');
    }

    const meta = (doc.metadata as Record<string, any>) ?? {};
    if (!meta.pdf_upload_failed) {
      throw new BadRequestException('Upload de PDF já foi realizado com sucesso');
    }

    if (!doc.document_hash) {
      throw new BadRequestException('Documento não possui hash — impossível re-gerar PDF');
    }

    const tmpPath = path.join(TMP_DIR, `${id}.pdf`);
    let pdfBuffer: Buffer;

    if (fs.existsSync(tmpPath)) {
      pdfBuffer = fs.readFileSync(tmpPath);
    } else {
      const [signerInfo, clinicInfo] = await Promise.all([
        this.prisma.user.findUnique({ where: { id: user.sub }, select: { name: true } }),
        this.prisma.clinic.findUnique({ where: { id: user.clinic_id }, select: { name: true } }),
      ]);

      pdfBuffer = await this.pdf.generateDocument({
        type: doc.type,
        title: doc.title,
        content: doc.content,
        patientName: (doc as any).patient?.full_name ?? 'Paciente',
        patientDocument: (doc as any).patient?.cpf ?? '',
        doctorName: signerInfo?.name ?? user.sub,
        doctorCrm: '',
        clinicName: clinicInfo?.name ?? 'AYRON Clinic',
        documentHash: doc.document_hash,
        status: doc.status,
        signedAt: doc.signed_at ?? new Date(),
        isValidatedVersion: false,
      });
    }

    const objectKey = `docs/${user.clinic_id}/${id}/original.pdf`;
    try {
      await this.storage.uploadBuffer(objectKey, pdfBuffer, 'application/pdf');
    } catch (retryUploadErr) {
      throw new ServiceUnavailableException(
        'MinIO ainda indisponível. O arquivo continua salvo localmente. Tente novamente quando o serviço de armazenamento estiver disponível.',
      );
    }

    if (fs.existsSync(tmpPath)) {
      fs.unlinkSync(tmpPath);
    }

    const { pdf_upload_failed: _removed, ...restMeta } = meta;
    const updated = await this.prisma.document.update({
      where: { id },
      data: {
        pdf_object_key: objectKey,
        metadata: restMeta as any,
      },
    });

    await this.audit.log({
      clinic_id: user.clinic_id,
      actor_id: user.sub,
      actor_role: user.role as UserRole,
      action: 'UPLOAD',
      entity_type: 'Document',
      entity_id: id,
      metadata: { retry: true },
    });

    return { ...updated, pdf_available: true, pdf_upload_failed: false };
  }

  async uploadValidated(id: string, file: Express.Multer.File, user: RequestUser) {
    if (!VALIDATE_ROLES.includes(user.role as UserRole)) {
      throw new ForbiddenException('Apenas gerentes e administradores podem enviar PDF validado');
    }
    const doc = await this.findOwned(id, user.clinic_id);
    if (doc.status !== DocumentStatus.PENDING_CFM_VALIDATION) {
      throw new BadRequestException('Este documento não está aguardando validação CFM');
    }
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Arquivo PDF inválido ou vazio');
    }
    if (!file.mimetype.includes('pdf')) {
      throw new BadRequestException('Apenas arquivos PDF são aceitos');
    }

    const objectKey = `docs/${user.clinic_id}/${id}/validated.pdf`;
    let validatedObjectKey: string | null = null;
    let validatedUploadFailed = false;

    try {
      await this.storage.uploadBuffer(objectKey, file.buffer, 'application/pdf');
      validatedObjectKey = objectKey;
    } catch (uploadErr) {
      this.logger.error(`MinIO upload failed for validated doc ${id}: ${(uploadErr as Error).message}`);
      const tmpPath = path.join(TMP_DIR, `${id}_validated.pdf`);
      fs.writeFileSync(tmpPath, file.buffer);
      this.logger.warn(`Validated PDF saved to fallback: ${tmpPath}`);
      validatedUploadFailed = true;
    }

    const existingMeta = (doc.metadata as Record<string, any>) ?? {};
    const updated = await this.prisma.document.update({
      where: { id },
      data: {
        validated_pdf_object_key: validatedObjectKey,
        status: DocumentStatus.SIGNED_VALIDATED,
        metadata: {
          ...existingMeta,
          validated_upload_failed: validatedUploadFailed,
        } as any,
      },
    });

    await this.audit.log({
      clinic_id: user.clinic_id,
      actor_id: user.sub,
      actor_role: user.role as UserRole,
      action: 'UPLOAD',
      entity_type: 'Document',
      entity_id: id,
      data_after: { validated_pdf_object_key: validatedObjectKey, validated_upload_failed: validatedUploadFailed },
    });

    return { ...updated, validated_upload_failed: validatedUploadFailed };
  }

  async download(
    id: string,
    variant: 'original' | 'validated',
    user: RequestUser,
  ): Promise<{ url?: string; fallback?: boolean; localPath?: string }> {
    const doc = await this.findOwned(id, user.clinic_id);

    await this.audit.log({
      clinic_id: user.clinic_id,
      actor_id: user.sub,
      actor_role: user.role as UserRole,
      action: 'DOWNLOAD',
      entity_type: 'Document',
      entity_id: id,
      metadata: { variant },
    });

    if (variant === 'validated') {
      if (doc.validated_pdf_object_key) {
        const url = await this.storage.getPresignedDownloadUrl(doc.validated_pdf_object_key, 120);
        return { url, fallback: false };
      }
      const tmpValidated = path.join(TMP_DIR, `${id}_validated.pdf`);
      if (fs.existsSync(tmpValidated)) {
        return { fallback: true, localPath: tmpValidated };
      }
      throw new NotFoundException('PDF validado ainda não disponível');
    }

    if (doc.pdf_object_key) {
      const url = await this.storage.getPresignedDownloadUrl(doc.pdf_object_key, 120);
      return { url, fallback: false };
    }

    const tmpPath = path.join(TMP_DIR, `${id}.pdf`);
    if (fs.existsSync(tmpPath)) {
      return { fallback: true, localPath: tmpPath };
    }

    throw new NotFoundException('PDF ainda não foi gerado ou upload está pendente');
  }

  async cancel(id: string, user: RequestUser) {
    const doc = await this.findOwned(id, user.clinic_id);
    const cancellable: DocumentStatus[] = [
      DocumentStatus.DRAFT,
      DocumentStatus.PENDING_CFM_VALIDATION,
    ];
    if (!cancellable.includes(doc.status)) {
      throw new BadRequestException(
        'Somente documentos em rascunho ou aguardando validação podem ser cancelados',
      );
    }
    const updated = await this.prisma.document.update({
      where: { id },
      data: { status: DocumentStatus.CANCELLED, deleted_at: new Date() },
    });
    await this.audit.log({
      clinic_id: user.clinic_id,
      actor_id: user.sub,
      actor_role: user.role as UserRole,
      action: 'DELETE_SOFT',
      entity_type: 'Document',
      entity_id: id,
    });
    return updated;
  }
}
