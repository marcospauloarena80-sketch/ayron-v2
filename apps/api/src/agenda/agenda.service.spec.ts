import { Test } from '@nestjs/testing';
import { AgendaService } from './agenda.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { EventsService } from '../events/events.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

const baseAppt = {
  id: 'appt1', clinic_id: 'c1', patient_id: 'p1', professional_id: 'prof1',
  status: 'SCHEDULED', start_time: new Date(), end_time: new Date(), type: 'CONSULTA',
  service: { id: 'svc1', name: 'Consulta', price: 250, category: 'CONSULTA' },
  patient: { full_name: 'Test Patient' },
  professional: { name: 'Dr Test' },
  deleted_at: null, locked_at: null,
};

const mockPrisma = {
  appointment: {
    findFirst: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
  },
  transaction: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  patient: {
    update: jest.fn().mockResolvedValue({}),
    findFirst: jest.fn(),
  },
  clinicalRecord: { count: jest.fn().mockResolvedValue(0) },
  service: { findFirst: jest.fn() },
  $transaction: jest.fn((ops) => Promise.all(ops)),
};
const mockAudit = { log: jest.fn().mockResolvedValue(undefined) };
const mockEvents = { emit: jest.fn().mockResolvedValue(undefined) };

describe('AgendaService', () => {
  let service: AgendaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AgendaService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
        { provide: EventsService, useValue: mockEvents },
      ],
    }).compile();
    service = module.get(AgendaService);
    jest.clearAllMocks();
  });

  describe('checkOut', () => {
    it('creates auto-CHARGE transaction when service has price > 0', async () => {
      const checkedInAppt = { ...baseAppt, status: 'CHECKED_IN' };
      mockPrisma.appointment.findFirst.mockResolvedValue(checkedInAppt);
      mockPrisma.appointment.update.mockResolvedValue({ ...checkedInAppt, status: 'COMPLETED' });
      mockPrisma.transaction.findFirst.mockResolvedValue(null);
      mockPrisma.transaction.create.mockResolvedValue({ id: 'tx1', amount: 250 });

      await service.checkOut('c1', 'appt1', 'actor1');

      expect(mockPrisma.transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: 'REVENUE', status: 'PENDING', amount: 250 }),
        }),
      );
    });

    it('does not create duplicate CHARGE if one already exists', async () => {
      const checkedInAppt = { ...baseAppt, status: 'CHECKED_IN' };
      mockPrisma.appointment.findFirst.mockResolvedValue(checkedInAppt);
      mockPrisma.appointment.update.mockResolvedValue({ ...checkedInAppt, status: 'COMPLETED' });
      mockPrisma.transaction.findFirst.mockResolvedValue({ id: 'existing-tx' });

      await service.checkOut('c1', 'appt1', 'actor1');

      expect(mockPrisma.transaction.create).not.toHaveBeenCalled();
    });

    it('throws BadRequestException if appointment is not CHECKED_IN', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue({ ...baseAppt, status: 'SCHEDULED' });
      await expect(service.checkOut('c1', 'appt1', 'actor1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('checkIn', () => {
    it('creates check-in successfully for SCHEDULED appointment', async () => {
      const scheduledAppt = { ...baseAppt, status: 'SCHEDULED' };
      mockPrisma.appointment.findFirst.mockResolvedValue(scheduledAppt);
      mockPrisma.appointment.update.mockResolvedValue({ ...scheduledAppt, status: 'CHECKED_IN' });

      const result = await service.checkIn('c1', 'appt1', 'actor1');

      expect(mockPrisma.appointment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'CHECKED_IN' }) }),
      );
      expect(result.status).toBe('CHECKED_IN');
    });
  });
});
