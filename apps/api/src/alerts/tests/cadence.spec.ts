import {
  TaskStatus,
  TaskType,
  TaskPriority,
  TaskSource,
  TaskActionType,
  AlertOwnerRole,
  AppointmentStatus,
  ProtocolStatus,
  TransactionStatus,
  TransactionType,
} from '@prisma/client';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}
function daysFromNow(n: number) {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000);
}

function makeTask(overrides: any = {}) {
  return {
    id: 'task-1',
    rule_key: 'C1_RED_NO_APPT',
    status: TaskStatus.OPEN,
    updated_at: daysAgo(2),
    priority: TaskPriority.HIGH,
    appointment_id: null,
    ...overrides,
  };
}

function makePrisma(overrides: any = {}) {
  return {
    patient: {
      findMany: jest.fn().mockResolvedValue([{ id: 'p1' }]),
      findFirst: jest.fn().mockResolvedValue({ id: 'p1', full_name: 'Test Patient' }),
    },
    patientCognitiveScore: {
      findFirst: jest.fn().mockResolvedValue({ composite_risk_score: 80 }),
    },
    appointment: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
    },
    hormoneImplant: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    treatmentProtocol: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    transaction: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    waitlistEntry: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    document: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    task: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: 'new-task' }),
      update: jest.fn().mockResolvedValue({ id: 'task-1' }),
      count: jest.fn().mockResolvedValue(0),
    },
    taskActionLog: {
      create: jest.fn().mockResolvedValue({}),
    },
    ...overrides,
  };
}

function makeAudit() {
  return { log: jest.fn().mockResolvedValue(undefined) };
}

let CadenceEngine: any;
beforeAll(async () => {
  ({ CadenceEngine } = await import('../cadence.engine'));
});

// ─── C1: RED CRS without future appointment ────────────────────────────────────

describe('CadenceEngine — C1 (RED CRS, no future appt)', () => {
  it('creates SCHEDULE_VISIT task when CRS >= 70 and no future appt', async () => {
    const prisma = makePrisma({
      patientCognitiveScore: {
        findFirst: jest.fn().mockResolvedValue({ composite_risk_score: 85 }),
      },
      appointment: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
    });
    const engine = new CadenceEngine(prisma as any, makeAudit() as any);
    await engine.runForPatient('p1', 'c1');
    expect(prisma.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ rule_key: 'C1_RED_NO_APPT', type: TaskType.SCHEDULE_VISIT }),
      }),
    );
  });

  it('does NOT create task when future appointment exists', async () => {
    const prisma = makePrisma({
      patientCognitiveScore: {
        findFirst: jest.fn().mockResolvedValue({ composite_risk_score: 85 }),
      },
      appointment: {
        findFirst: jest.fn().mockResolvedValue({ id: 'appt-1', status: AppointmentStatus.SCHEDULED }),
        findMany: jest.fn().mockResolvedValue([]),
      },
    });
    const engine = new CadenceEngine(prisma as any, makeAudit() as any);
    await engine.runForPatient('p1', 'c1');
    const c1Call = (prisma.task.create as jest.Mock).mock.calls.find((c: any[]) =>
      c[0]?.data?.rule_key === 'C1_RED_NO_APPT',
    );
    expect(c1Call).toBeUndefined();
  });

  it('does NOT create task when CRS < 70', async () => {
    const prisma = makePrisma({
      patientCognitiveScore: {
        findFirst: jest.fn().mockResolvedValue({ composite_risk_score: 50 }),
      },
    });
    const engine = new CadenceEngine(prisma as any, makeAudit() as any);
    await engine.runForPatient('p1', 'c1');
    const c1Call = (prisma.task.create as jest.Mock).mock.calls.find((c: any[]) =>
      c[0]?.data?.rule_key === 'C1_RED_NO_APPT',
    );
    expect(c1Call).toBeUndefined();
  });
});

// ─── Cooldown (24h idempotency) ────────────────────────────────────────────────

describe('CadenceEngine — Cooldown (24h dedup)', () => {
  it('does NOT create new task if existing OPEN task updated within 24h', async () => {
    const recentTask = makeTask({ updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000) }); // 1h ago
    const prisma = makePrisma({
      patientCognitiveScore: {
        findFirst: jest.fn().mockResolvedValue({ composite_risk_score: 85 }),
      },
      appointment: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
      task: {
        findFirst: jest.fn().mockResolvedValue(recentTask),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      taskActionLog: { create: jest.fn().mockResolvedValue({}) },
    });
    const engine = new CadenceEngine(prisma as any, makeAudit() as any);
    await engine.runForPatient('p1', 'c1');
    expect(prisma.task.create).not.toHaveBeenCalled();
  });

  it('updates existing task if cooldown expired (>24h)', async () => {
    const staleTask = makeTask({ updated_at: daysAgo(2) });
    const prisma = makePrisma({
      patientCognitiveScore: {
        findFirst: jest.fn().mockResolvedValue({ composite_risk_score: 85 }),
      },
      appointment: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
      task: {
        findFirst: jest.fn().mockResolvedValue(staleTask),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      taskActionLog: { create: jest.fn().mockResolvedValue({}) },
    });
    const engine = new CadenceEngine(prisma as any, makeAudit() as any);
    await engine.runForPatient('p1', 'c1');
    expect(prisma.task.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'task-1' } }),
    );
  });
});

// ─── C4: Pending charge auto-resolve ──────────────────────────────────────────

describe('CadenceEngine — C4 (Pending charge) + auto-resolve', () => {
  it('creates COLLECT_PAYMENT task when charge pending > 7 days', async () => {
    const prisma = makePrisma({
      patientCognitiveScore: {
        findFirst: jest.fn().mockResolvedValue({ composite_risk_score: 30 }),
      },
      transaction: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'tx-1',
          type: TransactionType.REVENUE,
          status: TransactionStatus.PENDING,
          created_at: daysAgo(10),
        }),
      },
      task: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'new-task' }),
        update: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      taskActionLog: { create: jest.fn().mockResolvedValue({}) },
    });
    const engine = new CadenceEngine(prisma as any, makeAudit() as any);
    await engine.runForPatient('p1', 'c1');
    expect(prisma.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ rule_key: 'C4_PENDING_CHARGE', type: TaskType.COLLECT_PAYMENT }),
      }),
    );
  });

  it('auto-resolves C4 task when payment is registered', async () => {
    const openTask = makeTask({ rule_key: 'C4_PENDING_CHARGE', status: TaskStatus.OPEN });
    const prisma = makePrisma({
      patientCognitiveScore: {
        findFirst: jest.fn().mockResolvedValue({ composite_risk_score: 30 }),
      },
      transaction: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'tx-paid',
          type: TransactionType.REVENUE,
          status: TransactionStatus.COMPLETED,
          created_at: daysAgo(1),
        }),
      },
      task: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([openTask]),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
        count: jest.fn().mockResolvedValue(0),
      },
      taskActionLog: { create: jest.fn().mockResolvedValue({}) },
    });
    const engine = new CadenceEngine(prisma as any, makeAudit() as any);
    await engine.runForPatient('p1', 'c1');
    expect(prisma.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'task-1' },
        data: expect.objectContaining({ status: TaskStatus.DONE }),
      }),
    );
  });
});

// ─── C6: Missing document auto-resolve ────────────────────────────────────────

describe('CadenceEngine — C6 (Missing doc) + auto-resolve', () => {
  it('auto-resolves C6 task when document is now present', async () => {
    const openTask = makeTask({ rule_key: 'C6_MISSING_DOC', status: TaskStatus.OPEN, appointment_id: 'appt-1' });
    const prisma = makePrisma({
      patientCognitiveScore: {
        findFirst: jest.fn().mockResolvedValue({ composite_risk_score: 20 }),
      },
      task: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([openTask]),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
        count: jest.fn().mockResolvedValue(0),
      },
      document: {
        findFirst: jest.fn().mockResolvedValue({ id: 'doc-1' }), // doc exists
      },
      taskActionLog: { create: jest.fn().mockResolvedValue({}) },
    });
    const engine = new CadenceEngine(prisma as any, makeAudit() as any);
    await engine.runForPatient('p1', 'c1');
    expect(prisma.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'task-1' },
        data: expect.objectContaining({ status: TaskStatus.DONE }),
      }),
    );
  });
});
