import { AlertStatus } from '@prisma/client';

// Minimal mock setup
function makePrisma(overrides: any = {}) {
  return {
    alert: {
      count: jest.fn().mockImplementation(({ where }: any) => {
        const status = where?.status;
        if (status === AlertStatus.RESOLVED) return Promise.resolve(3);
        if (status === AlertStatus.DISMISSED) return Promise.resolve(2);
        if (status === AlertStatus.SNOOZED) return Promise.resolve(1);
        return Promise.resolve(10); // total
      }),
      findMany: jest.fn().mockResolvedValue([
        {
          created_at: new Date('2026-01-01T09:00:00Z'),
          resolved_at: new Date('2026-01-01T11:00:00Z'), // 2h
        },
        {
          created_at: new Date('2026-01-02T09:00:00Z'),
          resolved_at: new Date('2026-01-02T13:00:00Z'), // 4h
        },
      ]),
      groupBy: jest.fn().mockResolvedValue([
        { rule_key: 'R1_NO_RETURN', _count: { id: 5 } },
        { rule_key: 'R6_CHECKOUT_NO_CHARGE', _count: { id: 3 } },
      ]),
    },
    ...overrides,
  };
}

describe('AlertsService.getMetrics', () => {
  let AlertsService: any;
  let service: any;

  beforeAll(async () => {
    ({ AlertsService } = await import('../alerts.service'));
    service = new AlertsService(makePrisma() as any, { log: jest.fn() } as any);
  });

  it('returns correct counts', async () => {
    const result = await service.getMetrics('clinic-1');

    expect(result.total_created).toBe(10);
    expect(result.total_resolved).toBe(3);
    expect(result.total_dismissed).toBe(2);
    expect(result.total_snoozed).toBe(1);
  });

  it('calculates avg_time_to_resolve_hours correctly', async () => {
    const result = await service.getMetrics('clinic-1');
    // (2h + 4h) / 2 = 3h
    expect(result.avg_time_to_resolve_hours).toBe(3);
  });

  it('returns top_rules_by_volume sorted', async () => {
    const result = await service.getMetrics('clinic-1');
    expect(result.top_rules_by_volume).toHaveLength(2);
    expect(result.top_rules_by_volume[0].rule_key).toBe('R1_NO_RETURN');
    expect(result.top_rules_by_volume[0].count).toBe(5);
  });
});
