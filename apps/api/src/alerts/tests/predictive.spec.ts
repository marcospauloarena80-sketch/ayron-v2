import { AlertSeverity, AlertStatus, TransactionStatus, TransactionType } from '@prisma/client';

function days(n: number) {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000);
}

function makePrisma(overrides: any = {}) {
  return {
    appointment: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null), groupBy: jest.fn().mockResolvedValue([]) },
    patientCognitiveScore: { findFirst: jest.fn().mockResolvedValue(null), upsert: jest.fn().mockResolvedValue({}), count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
    patientMetrics: { findMany: jest.fn().mockResolvedValue([]) },
    alert: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    task: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    transaction: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      aggregate: jest.fn().mockResolvedValue({ _sum: { amount: null }, _count: { id: 0 } }),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    treatmentProtocol: { findFirst: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([]) },
    hormoneImplant: { findFirst: jest.fn().mockResolvedValue(null) },
    patient: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn().mockResolvedValue(null) },
    ...overrides,
  };
}

const CLINIC = 'clinic-x';
const PATIENT = 'patient-x';

let CognitiveEngine: any;
let DashboardService: any;

beforeAll(async () => {
  ({ CognitiveEngine } = await import('../cognitive.engine'));
  ({ DashboardService } = await import('../../dashboard/dashboard.service'));
});

// ─── NSP Tests ────────────────────────────────────────────────────────────────

describe('calcNSP', () => {
  it('NSP cap 100 — multiple conditions fire, result <= 100', async () => {
    const past95 = days(-95);
    const past20 = days(-20);
    const appts = [
      { id: 'a1', status: 'MISSED', start_time: past95, updated_at: past95 },
      { id: 'a2', status: 'CANCELLED', start_time: past95, updated_at: past95 },
      { id: 'a3', status: 'CANCELLED', start_time: past20, updated_at: new Date(past20.getTime() + 3 * 60 * 60 * 1000) },
      { id: 'a4', status: 'COMPLETED', start_time: days(-10), updated_at: days(-10) },
      { id: 'a5', status: 'COMPLETED', start_time: days(-50), updated_at: days(-50) },
    ];
    const engine = new CognitiveEngine(makePrisma({
      appointment: { findMany: jest.fn().mockResolvedValue(appts), count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
    }));
    const result = await engine['calcNSP'](PATIENT, CLINIC, 65, 75);
    expect(result).toBeLessThanOrEqual(100);
    expect(result).toBeGreaterThanOrEqual(40);
  });

  it('NSP zero — no conditions fire', async () => {
    const engine = new CognitiveEngine(makePrisma());
    const result = await engine['calcNSP'](PATIENT, CLINIC, 20, 20);
    expect(result).toBe(0);
  });
});

// ─── DR30 Tests ───────────────────────────────────────────────────────────────

describe('calcDR30', () => {
  it('DR30 charge >14d contributes +20', async () => {
    const oldCharge = { id: 't1', created_at: days(-20), status: TransactionStatus.PENDING };
    const engine = new CognitiveEngine(makePrisma({
      transaction: {
        findMany: jest.fn().mockResolvedValue([oldCharge]),
        findFirst: jest.fn().mockResolvedValue(oldCharge),
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: null }, _count: { id: 0 } }),
        groupBy: jest.fn().mockResolvedValue([]),
      },
    }));
    const result = await engine['calcDR30'](PATIENT, CLINIC, 30, 30, 0);
    expect(result).toBeGreaterThanOrEqual(20);
  });

  it('DR30 no future appointment + CRS>70 + consecutiveHitsRed>=2 => >= 40', async () => {
    const engine = new CognitiveEngine(makePrisma({
      appointment: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn().mockResolvedValue(null),
      },
    }));
    const result = await engine['calcDR30'](PATIENT, CLINIC, 30, 75, 2);
    expect(result).toBeGreaterThanOrEqual(40);
  });
});

// ─── CDT Tests ────────────────────────────────────────────────────────────────

describe('calcCDT', () => {
  it('CDT DOWN — weight drops 6% + HIGH alert active', async () => {
    const engine = new CognitiveEngine(makePrisma({
      patientMetrics: {
        findMany: jest.fn().mockResolvedValue([
          { weight_kg: 94 },
          { weight_kg: 95 },
          { weight_kg: 96 },
          { weight_kg: 97 },
          { weight_kg: 98 },
          { weight_kg: 100 },
        ]),
      },
      alert: {
        findMany: jest.fn().mockResolvedValue([{ id: 'al1', severity: AlertSeverity.HIGH, status: AlertStatus.OPEN }]),
        count: jest.fn().mockResolvedValue(1),
      },
    }));
    const result = await engine['calcCDT'](PATIENT, CLINIC, 70, 80);
    expect(result).toBe('DOWN');
  });

  it('CDT STABLE — no metrics available', async () => {
    const engine = new CognitiveEngine(makePrisma());
    const result = await engine['calcCDT'](PATIENT, CLINIC, 50);
    expect(result).toBe('STABLE');
  });
});

// ─── Dashboard Executive Metrics ──────────────────────────────────────────────

describe('getExecutiveMetrics', () => {
  it('retention rate = (3 patients with consult / 5 active) * 100 = 60', async () => {
    const patientsWithAppt = [{ patient_id: 'p1' }, { patient_id: 'p2' }, { patient_id: 'p3' }];
    const service = new DashboardService(makePrisma({
      appointment: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn().mockResolvedValue(null),
        groupBy: jest.fn().mockResolvedValue(patientsWithAppt),
      },
      patient: {
        count: jest.fn().mockResolvedValue(5),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      patientCognitiveScore: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
    }));
    const result = await service['getExecutiveMetrics'](CLINIC);
    expect(result.retention_rate).toBe(60);
  });

  it('projected_revenue_30d >= 0 (baseline)', async () => {
    const service = new DashboardService(makePrisma({
      transaction: {
        findMany: jest.fn().mockResolvedValue([
          { amount: 500, created_at: new Date(), status: TransactionStatus.PENDING, type: TransactionType.REVENUE },
        ]),
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 500 }, _count: { id: 1 } }),
        groupBy: jest.fn().mockResolvedValue([]),
      },
    }));
    const result = await service['getExecutiveMetrics'](CLINIC);
    expect(result.projected_revenue_30d).toBeGreaterThanOrEqual(0);
  });
});
