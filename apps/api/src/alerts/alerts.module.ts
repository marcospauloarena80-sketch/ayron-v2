import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { AlertsEngine } from './alerts.engine';
import { AlertsScheduler } from './alerts.scheduler';
import { ClinicalRules } from './rules/clinical.rules';
import { FinancialRules } from './rules/financial.rules';
import { SchedulingRules } from './rules/scheduling.rules';
import { CognitiveEngine } from './cognitive.engine';
import { TasksService } from './tasks.service';
import { CadenceEngine } from './cadence.engine';
import { AuditModule } from '../common/audit/audit.module';

@Module({
  imports: [ScheduleModule.forRoot(), AuditModule],
  controllers: [AlertsController],
  providers: [
    AlertsService,
    AlertsEngine,
    AlertsScheduler,
    ClinicalRules,
    FinancialRules,
    SchedulingRules,
    CognitiveEngine,
    TasksService,
    CadenceEngine,
  ],
  exports: [AlertsService, AlertsEngine, CognitiveEngine, TasksService, CadenceEngine],
})
export class AlertsModule {}
