import { Module } from '@nestjs/common';
import { FinancialController } from './financial.controller';
import { FinancialService } from './financial.service';
import { FinanceFullController } from './finance-full.controller';
import { FinanceFullService } from './finance-full.service';
import { AuditModule } from '../common/audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [FinancialController, FinanceFullController],
  providers: [FinancialService, FinanceFullService],
  exports: [FinancialService, FinanceFullService],
})
export class FinancialModule {}
