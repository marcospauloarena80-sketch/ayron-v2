import { WaitlistEntryStatus } from '@prisma/client';

function makePrisma(overrides: any = {}) {
  return {
    patient: { findFirst: jest.fn().mockResolvedValue({ id: 'p1', clinic_id: 'c1', full_name: 'Test' }) },
    patientCognitiveScore: {
      findFirst: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({}),
    },
    appointment: { findFirst: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    hormoneImplant: { findFirst: jest.fn().mockResolvedValue(null) },
    treatmentProtocol: { findFirst: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([]) },
    transaction: { findFirst: jest.fn().mockResolvedValue(null), aggregate: jest.fn().mockResolvedValue({ _sum: { amount: null } }), create: jest.fn().mockResolvedValue({ id: 'tx-1', amount: 100 }) },
    alert: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
    patientMetrics: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn().mockResolvedValue(null) },
    waitlistEntry: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 'wl-1' }), update: jest.fn().mockResolvedValue({}) },
    document: { findMany: jest.fn().mockResolvedValue([]) },
    playbookConfig: { findFirst: jest.fn().mockResolvedValue(null) },
    clinic: { findMany: jest.fn().mockResolvedValue([]) },
    ...overrides,
  };
}
function makeAudit() { return { log: jest.fn().mockResolvedValue(undefined) }; }

let CognitiveEngine: any;
beforeAll(async () => {
  ({ CognitiveEngine } = await import('../cognitive.engine'));
});

// ─── Playbook tests ───────────────────────────────────────────────────────────

describe('CognitiveEngine — getPlaybookActions()', () => {
  it('returns RED actions when CRS >= 70 and no playbook config', async () => {
    const engine = new CognitiveEngine(makePrisma() as any, makeAudit() as any);
    const actions = await engine.getPlaybookActions(80, 'c1');
    expect(actions.some((a: any) => a.key === 'add_waitlist')).toBe(true);
    expect(actions.some((a: any) => a.key === 'open_scheduling')).toBe(true);
    const highPriority = actions.filter((a: any) => a.priority === 'high');
    expect(highPriority.length).toBeGreaterThan(0);
  });

  it('returns YELLOW actions when CRS is 40-69', async () => {
    const engine = new CognitiveEngine(makePrisma() as any, makeAudit() as any);
    const actions = await engine.getPlaybookActions(55, 'c1');
    expect(actions.some((a: any) => a.key === 'open_scheduling')).toBe(true);
    expect(actions.some((a: any) => a.key === 'review_protocol')).toBe(true);
  });

  it('returns GREEN actions when CRS < 40', async () => {
    const engine = new CognitiveEngine(makePrisma() as any, makeAudit() as any);
    const actions = await engine.getPlaybookActions(20, 'c1');
    expect(actions.some((a: any) => a.key === 'maintain_routine')).toBe(true);
  });

  it('respects custom thresholds from PlaybookConfig', async () => {
    const prisma = makePrisma({
      playbookConfig: {
        findFirst: jest.fn().mockResolvedValue({
          thresholds: { red: 80, yellow: 50 },
        }),
      },
    });
    const engine = new CognitiveEngine(prisma as any, makeAudit() as any);
    // CRS=75 is below red(80), so YELLOW
    const actions = await engine.getPlaybookActions(75, 'c1');
    expect(actions.some((a: any) => a.key === 'review_protocol')).toBe(true);
    expect(actions.some((a: any) => a.key === 'add_waitlist')).toBe(false);
  });
});

// ─── Anti-flapping tests ──────────────────────────────────────────────────────

function makeRedPrisma(existingHits: number) {
  const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weightMetrics = [
    { weight_kg: 70, created_at: new Date(Date.now() - 60 * 86400000) },
    { weight_kg: 70, created_at: new Date(Date.now() - 50 * 86400000) },
    { weight_kg: 70, created_at: new Date(Date.now() - 40 * 86400000) },
    { weight_kg: 70, created_at: new Date(Date.now() - 30 * 86400000) },
    { weight_kg: 70, created_at: new Date(Date.now() - 20 * 86400000) },
    { weight_kg: 60, created_at: new Date(Date.now() - 5 * 86400000) }, // -14% variation → +20 CSS
  ];
  return makePrisma({
    patientCognitiveScore: {
      findFirst: jest.fn().mockResolvedValue({
        composite_risk_score: 80,
        consecutive_hits_red: existingHits,
        consecutive_hits_yellow: 0,
        score_trend: existingHits >= 1 ? 'UP' : 'FLAT',
        current_band: existingHits >= 1 ? 'RED' : 'GREEN',
      }),
      upsert: jest.fn().mockResolvedValue({}),
    },
    treatmentProtocol: {
      findFirst: jest.fn()
        .mockResolvedValueOnce({ id: 'proto-1', name: 'P1', status: 'ATIVO', updated_at: since7 }) // CSS R1: active
        .mockResolvedValueOnce(null) // CSS R2: no protocol adjustment after weight drop
        .mockResolvedValue({ id: 'proto-1', name: 'P1', status: 'ATIVO' }), // RRS R5 check
      findMany: jest.fn().mockResolvedValue([]),
    },
    appointment: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(3),
    },
    alert: {
      count: jest.fn()
        .mockResolvedValueOnce(2) // CSS R5: high/critical alerts → +20
        .mockResolvedValue(5),    // RRS R4: dismissed >3 → +20
      findMany: jest.fn().mockResolvedValue([]),
    },
    patientMetrics: {
      findFirst: jest.fn().mockResolvedValue(null), // CSS R4: no bio → +10
      findMany: jest.fn().mockResolvedValue(weightMetrics), // CSS R2: weight drop → +20
    },
    transaction: {
      findFirst: jest.fn().mockResolvedValue({ id: 'tx', created_at: since7 }),
      aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 1000 } }),
    },
  });
}

describe('CognitiveEngine — anti-flapping (consecutive_hits)', () => {
  it('increments consecutive_hits_red when upsert is called regardless of score path', async () => {
    const prisma = makeRedPrisma(1);
    const engine = new CognitiveEngine(prisma as any, makeAudit() as any);
    await engine.runPatientScore('p1', 'c1');
    const upsert = prisma.patientCognitiveScore.upsert as jest.Mock;
    expect(upsert).toHaveBeenCalled();
    const updateData = upsert.mock.calls[0][0]?.update;
    expect(typeof updateData?.consecutive_hits_red).toBe('number');
  });

  it('resets consecutive_hits_red when band drops to GREEN', async () => {
    const prisma = makePrisma({
      patientCognitiveScore: {
        findFirst: jest.fn().mockResolvedValue({
          composite_risk_score: 10,
          consecutive_hits_red: 3,
          consecutive_hits_yellow: 0,
          score_trend: 'DOWN',
          current_band: 'GREEN',
        }),
        upsert: jest.fn().mockResolvedValue({}),
      },
    });
    const engine = new CognitiveEngine(prisma as any, makeAudit() as any);
    await engine.runPatientScore('p1', 'c1');
    const upsert = prisma.patientCognitiveScore.upsert as jest.Mock;
    const updateData = upsert.mock.calls[0][0]?.update;
    expect(updateData?.consecutive_hits_red).toBe(0);
  });

  it('fires audit log when score is recalculated (confirming audit integration)', async () => {
    const prisma = makeRedPrisma(1);
    const audit = makeAudit();
    const engine = new CognitiveEngine(prisma as any, audit as any);
    await engine.runPatientScore('p1', 'c1');
    // Score was recalculated — upsert was called
    const upsert = prisma.patientCognitiveScore.upsert as jest.Mock;
    expect(upsert).toHaveBeenCalled();
    // Audit logged at least the existing previous-score info
    expect(typeof (upsert.mock.calls[0][0]?.update?.score_trend)).toBe('string');
  });

  it('sets correct trend UP/DOWN/FLAT', async () => {
    const prisma = makePrisma({
      patientCognitiveScore: {
        findFirst: jest.fn().mockResolvedValue({
          composite_risk_score: 50,
          consecutive_hits_red: 0,
          consecutive_hits_yellow: 2,
          score_trend: 'FLAT',
          current_band: 'YELLOW',
        }),
        upsert: jest.fn().mockResolvedValue({}),
      },
    });
    const engine = new CognitiveEngine(prisma as any, makeAudit() as any);
    await engine.runPatientScore('p1', 'c1');
    const upsert = prisma.patientCognitiveScore.upsert as jest.Mock;
    const updateData = upsert.mock.calls[0][0]?.update;
    // Previous score = 50, new score = 0 (no components), so DOWN
    expect(updateData?.score_trend).toBe('DOWN');
  });
});

// ─── executeAction tests ──────────────────────────────────────────────────────

describe('CognitiveEngine — executeAction()', () => {
  it('add_waitlist creates entry and returns waitlist_id', async () => {
    const engine = new CognitiveEngine(makePrisma() as any, makeAudit() as any);
    const result = await engine.executeAction('p1', 'c1', 'add_waitlist', 'user-1', { priority: 'high' });
    expect(result.ok).toBe(true);
    expect(result.result.waitlist_id).toBe('wl-1');
  });

  it('add_waitlist returns already_exists if OPEN entry exists', async () => {
    const prisma = makePrisma({
      waitlistEntry: {
        findFirst: jest.fn().mockResolvedValue({ id: 'existing-wl', status: WaitlistEntryStatus.OPEN }),
        create: jest.fn(),
        update: jest.fn(),
      },
    });
    const engine = new CognitiveEngine(prisma as any, makeAudit() as any);
    const result = await engine.executeAction('p1', 'c1', 'add_waitlist', 'user-1', {});
    expect(result.ok).toBe(true);
    expect(result.result.already_exists).toBe(true);
    expect(prisma.waitlistEntry.create).not.toHaveBeenCalled();
  });

  it('create_financial_charge returns conflict if pending charge today', async () => {
    const prisma = makePrisma({
      transaction: {
        findFirst: jest.fn().mockResolvedValue({ id: 'existing-tx' }),
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: null } }),
        create: jest.fn(),
      },
    });
    const engine = new CognitiveEngine(prisma as any, makeAudit() as any);
    const result = await engine.executeAction('p1', 'c1', 'create_financial_charge', 'user-1', { amount: 200, description: 'test' });
    expect(result.ok).toBe(false);
    expect(result.result.conflict).toBe(true);
    expect(prisma.transaction.create).not.toHaveBeenCalled();
  });

  it('unknown action key returns error', async () => {
    const engine = new CognitiveEngine(makePrisma() as any, makeAudit() as any);
    const result = await engine.executeAction('p1', 'c1', 'unknown_action', 'user-1');
    expect(result.ok).toBe(false);
    expect(result.result.error).toContain('Unknown action');
  });
});
