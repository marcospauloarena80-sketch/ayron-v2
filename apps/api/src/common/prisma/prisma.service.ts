import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
    await this.applySqlSetup();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async setClinicContext(clinicId: string): Promise<void> {
    if (!UUID_REGEX.test(clinicId)) return;
    await this.$executeRaw`SELECT set_config('app.current_clinic_id', ${clinicId}, true)`;
  }

  private async applySqlSetup(): Promise<void> {
    try {
      const [triggerExists] = await this.$queryRaw<[{ exists: boolean }]>`
        SELECT EXISTS (
          SELECT 1 FROM pg_trigger WHERE tgname = 'tgr_audit_logs_immutable'
        ) AS exists
      `;

      if (!triggerExists?.exists) {
        await this.$executeRaw`
          CREATE OR REPLACE FUNCTION fn_audit_logs_immutable()
          RETURNS TRIGGER AS $$
          BEGIN
            RAISE EXCEPTION 'audit_logs is append-only. UPDATE and DELETE are not permitted. (operation=%, row_id=%)', TG_OP, OLD.id;
          END;
          $$ LANGUAGE plpgsql
        `;
        await this.$executeRaw`
          DROP TRIGGER IF EXISTS tgr_audit_logs_immutable ON audit_logs
        `;
        await this.$executeRaw`
          CREATE TRIGGER tgr_audit_logs_immutable
            BEFORE UPDATE OR DELETE ON audit_logs
            FOR EACH ROW EXECUTE FUNCTION fn_audit_logs_immutable()
        `;
      }
    } catch {
      // Ignore — triggers will be applied manually in production via migrations
    }
  }
}
