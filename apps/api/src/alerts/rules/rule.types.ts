import { AlertCategory, AlertOwnerRole, AlertSeverity } from '@prisma/client';

export interface RuleContext {
  clinicId: string;
  params: Record<string, any>;
}

export interface AlertCandidate {
  ruleKey: string;
  category: AlertCategory;
  severity: AlertSeverity;
  ownerRoleTarget: AlertOwnerRole;
  title: string;
  message: string;
  rationale: string[];
  suggestedActions: Array<{ key: string; label: string }>;
  patientId?: string;
  appointmentId?: string;
  dedupWindowDays?: number;
  dueAt?: Date;
  metadata?: Record<string, any>;
}

export const DEFAULT_RULE_PARAMS: Record<string, Record<string, any>> = {
  R1_NO_RETURN: { no_return_days: 30 },
  R2_IMPLANT_DUE: { window_days: 10 },
  R3_MISSING_DOC: {},
  R4_MISSING_BIO: {},
  R5_PENDING_CHARGE: { overdue_days: 7 },
  R6_CHECKOUT_NO_CHARGE: {},
  R7_SLOT_CANDIDATES: { max_candidates: 5 },
};
