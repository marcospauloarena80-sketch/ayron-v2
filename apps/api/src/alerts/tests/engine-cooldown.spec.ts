import { AlertSeverity, AlertStatus, AlertCategory, AlertOwnerRole } from '@prisma/client';
import { AlertCandidate } from '../rules/rule.types';

// Minimal mock for PrismaService
function makePrisma(existingAlert: any = null) {
  return {
    alertRuleConfig: { findMany: jest.fn().mockResolvedValue([]) },
    alert: {
      findFirst: jest.fn().mockResolvedValue(existingAlert),
      create: jest.fn().mockResolvedValue({ id: 'new-id' }),
      update: jest.fn().mockResolvedValue({ id: existingAlert?.id ?? 'upd-id' }),
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    alertActionLog: { create: jest.fn().mockResolvedValue({}) },
    treatmentProtocol: { findMany: jest.fn().mockResolvedValue([]) },
    hormoneImplant: { findMany: jest.fn().mockResolvedValue([]) },
    appointment: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn().mockResolvedValue(null), count: jest.fn().mockResolvedValue(0) },
    transaction: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn().mockResolvedValue(null) },
    patientMetrics: { findFirst: jest.fn().mockResolvedValue(null) },
    clinic: { findMany: jest.fn().mockResolvedValue([]) },
  };
}

function makeAudit() {
  return { log: jest.fn().mockResolvedValue(undefined) };
}

function makeCandidate(overrides: Partial<AlertCandidate> = {}): AlertCandidate {
  return {
    ruleKey: 'R1_NO_RETURN',
    category: AlertCategory.CLINICAL_OPS,
    severity: AlertSeverity.MEDIUM,
    ownerRoleTarget: AlertOwnerRole.MEDICO,
    title: 'Test Alert',
    message: 'Test message',
    rationale: ['Condition', 'Reference data', 'Operational risk'],
    suggestedActions: [{ key: 'act', label: 'Action' }],
    patientId: 'patient-1',
    dedupWindowDays: 7,
    ...overrides,
  };
}

// Import engine after mocks are set up
let AlertsEngine: any;
beforeAll(async () => {
  ({ AlertsEngine } = await import('../alerts.engine'));
});

describe('AlertsEngine — dedup + cooldown', () => {
  it('creates new alert when no existing alert found', async () => {
    const prisma = makePrisma(null);
    const engine = new AlertsEngine(prisma as any, makeAudit() as any, { checkNoReturn: jest.fn().mockResolvedValue([makeCandidate()]), checkImplantDue: jest.fn().mockResolvedValue([]), checkMissingDocument: jest.fn().mockResolvedValue([]), checkMissingBioimpedance: jest.fn().mockResolvedValue([]) } as any, { checkPendingCharge: jest.fn().mockResolvedValue([]), checkCheckoutNoCharge: jest.fn().mockResolvedValue([]) } as any, {} as any);

    const result = await engine.runRulesForClinic('clinic-1');
    expect(result.created).toBe(1);
    expect(result.skipped).toBe(0);
    expect(prisma.alert.create).toHaveBeenCalledTimes(1);
  });

  it('skips alert when existing is found within cooldown window', async () => {
    const recentTrigger = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1h ago (within 12h)
    const existing = {
      id: 'existing-id',
      status: AlertStatus.OPEN,
      severity: AlertSeverity.MEDIUM,
      last_triggered_at: recentTrigger,
    };
    const prisma = makePrisma(existing);
    const engine = new AlertsEngine(prisma as any, makeAudit() as any, { checkNoReturn: jest.fn().mockResolvedValue([makeCandidate()]), checkImplantDue: jest.fn().mockResolvedValue([]), checkMissingDocument: jest.fn().mockResolvedValue([]), checkMissingBioimpedance: jest.fn().mockResolvedValue([]) } as any, { checkPendingCharge: jest.fn().mockResolvedValue([]), checkCheckoutNoCharge: jest.fn().mockResolvedValue([]) } as any, {} as any);

    const result = await engine.runRulesForClinic('clinic-1');
    expect(result.skipped).toBe(1);
    expect(prisma.alert.create).not.toHaveBeenCalled();
    expect(prisma.alert.update).not.toHaveBeenCalled();
  });

  it('updates alert when cooldown has expired (>12h)', async () => {
    const oldTrigger = new Date(Date.now() - 13 * 60 * 60 * 1000); // 13h ago
    const existing = {
      id: 'existing-id',
      status: AlertStatus.OPEN,
      severity: AlertSeverity.MEDIUM,
      last_triggered_at: oldTrigger,
    };
    const prisma = makePrisma(existing);
    const engine = new AlertsEngine(prisma as any, makeAudit() as any, { checkNoReturn: jest.fn().mockResolvedValue([makeCandidate()]), checkImplantDue: jest.fn().mockResolvedValue([]), checkMissingDocument: jest.fn().mockResolvedValue([]), checkMissingBioimpedance: jest.fn().mockResolvedValue([]) } as any, { checkPendingCharge: jest.fn().mockResolvedValue([]), checkCheckoutNoCharge: jest.fn().mockResolvedValue([]) } as any, {} as any);

    const result = await engine.runRulesForClinic('clinic-1');
    expect(result.updated).toBe(1);
    expect(prisma.alert.update).toHaveBeenCalledTimes(1);
    expect(prisma.alert.create).not.toHaveBeenCalled();
  });

  it('escalates even within cooldown if severity increases', async () => {
    const recentTrigger = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1h ago
    const existing = {
      id: 'existing-id',
      status: AlertStatus.OPEN,
      severity: AlertSeverity.LOW,       // lower severity than candidate
      last_triggered_at: recentTrigger,
    };
    const prisma = makePrisma(existing);
    const engine = new AlertsEngine(prisma as any, makeAudit() as any, { checkNoReturn: jest.fn().mockResolvedValue([makeCandidate({ severity: AlertSeverity.HIGH })]), checkImplantDue: jest.fn().mockResolvedValue([]), checkMissingDocument: jest.fn().mockResolvedValue([]), checkMissingBioimpedance: jest.fn().mockResolvedValue([]) } as any, { checkPendingCharge: jest.fn().mockResolvedValue([]), checkCheckoutNoCharge: jest.fn().mockResolvedValue([]) } as any, {} as any);

    const result = await engine.runRulesForClinic('clinic-1');
    expect(result.updated).toBe(1);
    expect(prisma.alert.update).toHaveBeenCalledTimes(1);
  });
});
