import { calculateScore } from '../alerts.engine';
import { AlertCandidate } from '../rules/rule.types';
import { AlertCategory, AlertOwnerRole, AlertSeverity } from '@prisma/client';

function makeCandidate(overrides: Partial<AlertCandidate> = {}): AlertCandidate {
  return {
    ruleKey: 'R1_NO_RETURN',
    category: AlertCategory.CLINICAL_OPS,
    severity: AlertSeverity.MEDIUM,
    ownerRoleTarget: AlertOwnerRole.MEDICO,
    title: 'Test',
    message: 'Test message',
    rationale: ['c1', 'c2', 'c3'],
    suggestedActions: [{ key: 'act', label: 'Do it' }],
    ...overrides,
  };
}

describe('calculateScore', () => {
  it('returns base score for MEDIUM severity', () => {
    expect(calculateScore(makeCandidate())).toBe(50);
  });

  it('returns base score for CRITICAL severity', () => {
    expect(calculateScore(makeCandidate({ severity: AlertSeverity.CRITICAL }))).toBe(95);
  });

  it('adds +10 for active protocol', () => {
    const score = calculateScore(makeCandidate({ metadata: { protocol_id: 'abc' } }));
    expect(score).toBe(60);
  });

  it('adds +15 for implant', () => {
    const score = calculateScore(makeCandidate({ metadata: { implant_id: 'xyz' } }));
    expect(score).toBe(65);
  });

  it('adds +10 for R5_PENDING_CHARGE rule', () => {
    const score = calculateScore(makeCandidate({ ruleKey: 'R5_PENDING_CHARGE' }));
    expect(score).toBe(60);
  });

  it('adds up to +20 for due_at within 7 days', () => {
    const dueAt = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000); // 1 day from now
    const score = calculateScore(makeCandidate({ dueAt }));
    // daysLeft ≈ 1, bonus = round((1 - 1/7) * 20) = round(17.14) = 17
    expect(score).toBeGreaterThan(60);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('does not add due_at bonus when due_at is in past', () => {
    const dueAt = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
    const score = calculateScore(makeCandidate({ dueAt }));
    expect(score).toBe(50); // no bonus
  });

  it('caps score at 100', () => {
    const score = calculateScore(
      makeCandidate({
        severity: AlertSeverity.CRITICAL,
        metadata: { protocol_id: 'a', implant_id: 'b' },
        ruleKey: 'R5_PENDING_CHARGE',
        dueAt: new Date(Date.now() + 1000),
      }),
    );
    expect(score).toBe(100);
  });
});

describe('calculateScore — severity levels', () => {
  const cases: [AlertSeverity, number][] = [
    [AlertSeverity.INFO, 10],
    [AlertSeverity.LOW, 25],
    [AlertSeverity.MEDIUM, 50],
    [AlertSeverity.HIGH, 75],
    [AlertSeverity.CRITICAL, 95],
  ];

  test.each(cases)('severity %s → base score %d', (severity, expected) => {
    expect(calculateScore(makeCandidate({ severity }))).toBe(expected);
  });
});
