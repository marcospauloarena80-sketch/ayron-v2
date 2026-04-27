import { AlertSeverity, AlertStatus, AppointmentStatus, ProtocolStatus, TransactionStatus, TransactionType } from '@prisma/client';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function days(n: number) {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000);
}

function makePrisma(overrides: any = {}) {
  return {
    clinic: { findMany: jest.fn().mockResolvedValue([]) },
    patient: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue({ clinic_id: 'c1' }),
    },
    patientCognitiveScore: {
      upsert: jest.fn().mockResolvedValue({}),
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
    },
    treatmentProtocol: { findFirst: jest.fn().mockResolvedValue(null) },
    appointment: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    hormoneImplant: { findFirst: jest.fn().mockResolvedValue(null) },
    patientMetrics: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    transaction: {
      findFirst: jest.fn().mockResolvedValue(null),
      aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
    },
    alert: {
      count: jest.fn().mockResolvedValue(0),
    },
    ...overrides,
  };
}

let CognitiveEngine: any;
beforeAll(async () => {
  ({ CognitiveEngine } = await import('../cognitive.engine'));
});

// ─── CSS tests ─────────────────────────────────────────────────────────────────

describe('CognitiveEngine — CSS', () => {
  it('CSS = 0 when patient is stable', async () => {
    const prisma = makePrisma();
    const engine = new CognitiveEngine(prisma as any);
    const result = await engine.runPatientScore('p1', 'c1');
    expect(result.css.score).toBe(0);
  });

  it('CSS += 20 when active protocol and no return in 30 days', async () => {
    const prisma = makePrisma({
      treatmentProtocol: {
        findFirst: jest.fn().mockResolvedValue({ id: 'pr1', patient_id: 'p1', status: ProtocolStatus.ATIVO }),
      },
      appointment: {
        findFirst: jest.fn().mockResolvedValue(null), // no recent appt
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    });
    const engine = new CognitiveEngine(prisma as any);
    const result = await engine.runPatientScore('p1', 'c1');
    expect(result.css.score).toBeGreaterThanOrEqual(20);
    expect(result.css.components['no_return_active_protocol']).toBe(20);
  });

  it('CSS += 20 when implant due within 10 days', async () => {
    const prisma = makePrisma({
      hormoneImplant: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'imp1',
          patient_id: 'p1',
          next_change_date: days(5),
          hormone_type: 'T',
          application_date: days(-30),
        }),
      },
    });
    const engine = new CognitiveEngine(prisma as any);
    const result = await engine.runPatientScore('p1', 'c1');
    expect(result.css.components['implant_due_soon']).toBe(20);
  });

  it('CSS += 10 for missing bioimpedance (first consult)', async () => {
    const prisma = makePrisma({
      appointment: {
        findFirst: jest.fn().mockResolvedValue({ id: 'a1', start_time: new Date() }),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      patientMetrics: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null), // no bio
      },
    });
    const engine = new CognitiveEngine(prisma as any);
    const result = await engine.runPatientScore('p1', 'c1');
    expect(result.css.components['missing_bioimpedance']).toBe(10);
  });

  it('CSS capped at 100 with all components', async () => {
    const prisma = makePrisma({
      treatmentProtocol: {
        findFirst: jest.fn().mockResolvedValue({ id: 'pr1', patient_id: 'p1', status: ProtocolStatus.ATIVO }),
      },
      hormoneImplant: {
        findFirst: jest.fn().mockResolvedValue({ id: 'imp1', next_change_date: days(3) }),
      },
      appointment: {
        findFirst: jest.fn().mockResolvedValue({ id: 'a1', start_time: new Date() }),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      patientMetrics: {
        findMany: jest.fn().mockResolvedValue([
          { weight_kg: 60, created_at: days(-90) },
          { weight_kg: 55, created_at: days(-0) }, // -8.3%
        ]),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      alert: { count: jest.fn().mockResolvedValue(3) }, // HIGH alerts
    });
    const engine = new CognitiveEngine(prisma as any);
    const result = await engine.runPatientScore('p1', 'c1');
    expect(result.css.score).toBeLessThanOrEqual(100);
  });
});

// ─── RRS tests ─────────────────────────────────────────────────────────────────

describe('CognitiveEngine — RRS', () => {
  it('RRS += 20 when pending charge >7 days', async () => {
    const prisma = makePrisma({
      transaction: {
        findFirst: jest.fn().mockResolvedValue({ id: 't1', type: TransactionType.REVENUE, status: TransactionStatus.PENDING }),
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
      },
    });
    const engine = new CognitiveEngine(prisma as any);
    const result = await engine.runPatientScore('p1', 'c1');
    expect(result.rrs.components['pending_charge_7d']).toBe(20);
  });

  it('RRS += 20 when 2+ misses in 90 days', async () => {
    const prisma = makePrisma({
      appointment: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockImplementation(({ where }: any) => {
          const statusIn = where?.status?.in;
          if (statusIn?.includes(AppointmentStatus.MISSED)) return Promise.resolve(2);
          return Promise.resolve(0);
        }),
      },
    });
    const engine = new CognitiveEngine(prisma as any);
    const result = await engine.runPatientScore('p1', 'c1');
    expect(result.rrs.components['multiple_misses_90d']).toBe(20);
  });

  it('RRS capped at 100', async () => {
    const prisma = makePrisma({
      transaction: {
        findFirst: jest.fn().mockResolvedValue({ id: 't1' }),
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
      },
      appointment: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(3), // >2 misses, >3 dismissed
      },
      treatmentProtocol: {
        findFirst: jest.fn().mockResolvedValue({ id: 'pr1', status: ProtocolStatus.ATIVO }),
      },
      alert: { count: jest.fn().mockResolvedValue(5) }, // >3 dismissed
    });
    const engine = new CognitiveEngine(prisma as any);
    const result = await engine.runPatientScore('p1', 'c1');
    expect(result.rrs.score).toBeLessThanOrEqual(100);
  });
});

// ─── CRS formula tests ─────────────────────────────────────────────────────────

describe('CognitiveEngine — CRS formula', () => {
  it('CRS = 50%*CSS + 30%*RRS + 20%*financial', async () => {
    // CSS = 20 (no_return), RRS = 20 (pending_charge), financial ~0
    const prisma = makePrisma({
      treatmentProtocol: {
        findFirst: jest.fn().mockResolvedValue({ id: 'pr1', status: ProtocolStatus.ATIVO }),
      },
      transaction: {
        findFirst: jest.fn().mockResolvedValue({ id: 't1' }),
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
      },
    });
    const engine = new CognitiveEngine(prisma as any);
    const result = await engine.runPatientScore('p1', 'c1');
    const expected = Math.round(0.5 * result.css.score + 0.3 * result.rrs.score + 0.2 * result.financial_priority);
    expect(result.crs).toBe(expected);
  });

  it('explanation_json contains all sections', async () => {
    const prisma = makePrisma();
    const engine = new CognitiveEngine(prisma as any);
    const result = await engine.runPatientScore('p1', 'c1');
    expect(result).toHaveProperty('css');
    expect(result).toHaveProperty('rrs');
    expect(result).toHaveProperty('crs');
    expect(result).toHaveProperty('financial_priority');
    expect(result).toHaveProperty('calculated_at');
    expect(result.css).toHaveProperty('components');
    expect(result.rrs).toHaveProperty('components');
  });

  it('upserts PatientCognitiveScore on every run', async () => {
    const prisma = makePrisma();
    const engine = new CognitiveEngine(prisma as any);
    await engine.runPatientScore('p1', 'c1');
    expect(prisma.patientCognitiveScore.upsert).toHaveBeenCalledTimes(1);
    const call = (prisma.patientCognitiveScore.upsert as jest.Mock).mock.calls[0][0];
    expect(call.where).toEqual({ patient_id: 'p1' });
  });
});
