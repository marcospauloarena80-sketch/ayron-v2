import { Test } from '@nestjs/testing';
import { FinancialService } from './financial.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { EventsService } from '../events/events.service';
import { NotFoundException } from '@nestjs/common';

const mockPrisma = {
  transaction: {
    findMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 }, _count: 0 }),
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn((ops) => Promise.all(ops)),
};

const mockAudit = { log: jest.fn().mockResolvedValue(undefined) };
const mockEvents = { emit: jest.fn().mockResolvedValue(undefined) };

describe('FinancialService', () => {
  let service: FinancialService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        FinancialService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
        { provide: EventsService, useValue: mockEvents },
      ],
    }).compile();
    service = module.get(FinancialService);
    jest.clearAllMocks();
  });

  describe('getPatientBalance', () => {
    it('returns DEVENDO when pending > 0', async () => {
      mockPrisma.transaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 150 }, _count: 2 })
        .mockResolvedValueOnce({ _sum: { amount: 0 }, _count: 0 })
        .mockResolvedValueOnce({ _sum: { amount: 0 }, _count: 0 });
      const result = await service.getPatientBalance('clinic1', 'patient1');
      expect(result.status).toBe('DEVENDO');
      expect(result.pending_amount).toBe(150);
    });

    it('returns EM_DIA when no pending or credit', async () => {
      mockPrisma.transaction.aggregate.mockResolvedValue({ _sum: { amount: 0 }, _count: 0 });
      const result = await service.getPatientBalance('clinic1', 'patient1');
      expect(result.status).toBe('EM_DIA');
    });

    it('returns CREDITO when paid > pending', async () => {
      mockPrisma.transaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 0 }, _count: 0 })
        .mockResolvedValueOnce({ _sum: { amount: 300 }, _count: 3 })
        .mockResolvedValueOnce({ _sum: { amount: 0 }, _count: 0 });
      const result = await service.getPatientBalance('clinic1', 'patient1');
      expect(result.status).toBe('CREDITO');
      expect(result.credit_available).toBe(300);
    });
  });

  describe('markPaid', () => {
    it('throws NotFoundException when transaction not found', async () => {
      mockPrisma.transaction.findFirst.mockResolvedValue(null);
      await expect(service.markPaid('clinic1', 'tx-not-exists', 'user1')).rejects.toThrow(NotFoundException);
    });

    it('updates status to COMPLETED and sets paid_at', async () => {
      const fakeTx = { id: 'tx1', clinic_id: 'clinic1', status: 'PENDING', amount: 100 };
      mockPrisma.transaction.findFirst.mockResolvedValue(fakeTx);
      mockPrisma.transaction.update.mockResolvedValue({ ...fakeTx, status: 'COMPLETED', paid_at: new Date() });
      const result = await service.markPaid('clinic1', 'tx1', 'user1', 'PIX');
      expect(mockPrisma.transaction.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'tx1' },
        data: expect.objectContaining({ status: 'COMPLETED', payment_method: 'PIX' }),
      }));
      expect(mockAudit.log).toHaveBeenCalledTimes(1);
      expect(mockEvents.emit).toHaveBeenCalledTimes(1);
    });
  });

  describe('create', () => {
    it('creates transaction with PENDING status', async () => {
      const dto: any = { patient_id: 'p1', type: 'REVENUE', amount: 200, description: 'Consulta', category: 'CONSULTATION' };
      mockPrisma.transaction.create.mockResolvedValue({ id: 'tx-new', ...dto, status: 'PENDING' });
      const result = await service.create('clinic1', dto, 'user1');
      expect(result.status).toBe('PENDING');
      expect(mockAudit.log).toHaveBeenCalled();
    });
  });
});
