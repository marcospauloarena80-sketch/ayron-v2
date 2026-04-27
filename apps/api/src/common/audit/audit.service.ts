import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction, UserRole } from '@prisma/client';

export interface AuditParams {
  clinic_id?: string;
  organization_id?: string;
  actor_id?: string;
  actor_role?: UserRole;
  action: AuditAction;
  entity_type?: string;
  entity_id?: string;
  proposal_id?: string;
  metadata?: Record<string, unknown>;
  data_before?: Record<string, unknown>;
  data_after?: Record<string, unknown>;
  ip_address?: string;
  session_id?: string;
  ai_model_version?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: AuditParams): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        clinic_id: params.clinic_id,
        organization_id: params.organization_id,
        actor_id: params.actor_id,
        actor_role: params.actor_role,
        action: params.action,
        entity_type: params.entity_type,
        entity_id: params.entity_id,
        proposal_id: params.proposal_id,
        metadata: (params.metadata ?? {}) as any,
        data_before: params.data_before as any,
        data_after: params.data_after as any,
        ip_address: params.ip_address,
        session_id: params.session_id,
        ai_model_version: params.ai_model_version,
      },
    });
  }
}
