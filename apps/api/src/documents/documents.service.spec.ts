import { Test } from '@nestjs/testing';
import { DocumentsService } from './documents.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { EventsService } from '../events/events.service';
import { StorageService } from '../common/storage/storage.service';
import { PdfService } from '../common/pdf/pdf.service';
import { ForbiddenException, BadRequestException } from '@nestjs/common';

const mockPrisma = {
  document: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  documentSignature: {
    create: jest.fn().mockResolvedValue({}),
  },
  user: {
    findUnique: jest.fn().mockResolvedValue({ name: 'Dr. Test' }),
  },
  clinic: {
    findUnique: jest.fn().mockResolvedValue({ name: 'Test Clinic' }),
  },
  $transaction: jest.fn((ops) => Promise.all(ops)),
};
const mockAudit = { log: jest.fn().mockResolvedValue(undefined) };
const mockEvents = { emit: jest.fn().mockResolvedValue(undefined) };
const mockStorage = {
  uploadBuffer: jest.fn().mockResolvedValue('object-key-123'),
  getSignedUrl: jest.fn().mockResolvedValue('https://minio/signed-url'),
};
const mockPdf = { generateDocument: jest.fn().mockResolvedValue(Buffer.from('PDF_CONTENT')) };

describe('DocumentsService', () => {
  let service: DocumentsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
        { provide: EventsService, useValue: mockEvents },
        { provide: StorageService, useValue: mockStorage },
        { provide: PdfService, useValue: mockPdf },
      ],
    }).compile();
    service = module.get(DocumentsService);
    jest.clearAllMocks();
  });

  describe('sign', () => {
    it('throws ForbiddenException when role is CONCIERGE', async () => {
      const doc = { id: 'doc1', status: 'DRAFT', clinic_id: 'c1' };
      mockPrisma.document.findFirst.mockResolvedValue(doc);
      await expect(service.sign('doc1', { sub: 'user1', clinic_id: 'c1', role: 'CONCIERGE' } as any)).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException when doc is not DRAFT', async () => {
      const doc = { id: 'doc1', status: 'SIGNED', clinic_id: 'c1' };
      mockPrisma.document.findFirst.mockResolvedValue(doc);
      await expect(service.sign('doc1', { sub: 'user1', clinic_id: 'c1', role: 'MEDICO' } as any)).rejects.toThrow(BadRequestException);
    });

    it('signs document and returns pdf_available: true when MinIO succeeds', async () => {
      const doc = { id: 'doc1', status: 'DRAFT', clinic_id: 'c1', patient_id: 'p1', type: 'PRESCRIPTION', content: 'test', metadata: {} };
      mockPrisma.document.findFirst.mockResolvedValue(doc);
      mockPrisma.document.update.mockResolvedValue({ ...doc, status: 'SIGNED', document_hash: 'abc123', pdf_object_key: 'object-key-123', metadata: {} });
      const result = await service.sign('doc1', { sub: 'user1', clinic_id: 'c1', role: 'MEDICO' } as any);
      expect(result.pdf_available).toBe(true);
      expect(mockPdf.generateDocument).toHaveBeenCalled();
      expect(mockStorage.uploadBuffer).toHaveBeenCalled();
    });

    it('sets pdf_upload_failed when MinIO fails', async () => {
      const doc = { id: 'doc1', status: 'DRAFT', clinic_id: 'c1', patient_id: 'p1', type: 'PRESCRIPTION', content: 'test', metadata: {} };
      mockPrisma.document.findFirst.mockResolvedValue(doc);
      mockStorage.uploadBuffer.mockRejectedValueOnce(new Error('MinIO offline'));
      mockPrisma.document.update.mockResolvedValue({ ...doc, status: 'SIGNED', document_hash: 'abc123', pdf_object_key: null, metadata: { pdf_upload_failed: true } });
      const result = await service.sign('doc1', { sub: 'user1', clinic_id: 'c1', role: 'MEDICO' } as any);
      expect(result.pdf_upload_failed).toBe(true);
      expect(result.pdf_available).toBe(false);
    });
  });
});
