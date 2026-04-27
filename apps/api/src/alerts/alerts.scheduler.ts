import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { AlertsEngine } from './alerts.engine';

@Injectable()
export class AlertsScheduler {
  private readonly logger = new Logger(AlertsScheduler.name);

  constructor(private prisma: PrismaService, private engine: AlertsEngine) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async runAlertRules() {
    const clinics = await this.prisma.clinic.findMany({
      where: { deleted_at: null },
      select: { id: true },
    });
    for (const clinic of clinics) {
      await this.engine.runRulesForClinic(clinic.id);
    }
  }
}
