import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ClinicalController } from './clinical.controller';
import { ClinicalService } from './clinical.service';
import { ProtocolSchedulerService } from './protocol-scheduler.service';
import { BioimpedanciaService } from './bioimpedancia.service';
import { AuditModule } from '../common/audit/audit.module';
import { StorageModule } from '../common/storage/storage.module';

@Module({
  imports: [
    AuditModule,
    StorageModule,
    MulterModule.register({ limits: { fileSize: 20 * 1024 * 1024 } }),
  ],
  controllers: [ClinicalController],
  providers: [ClinicalService, ProtocolSchedulerService, BioimpedanciaService],
  exports: [ClinicalService, ProtocolSchedulerService, BioimpedanciaService],
})
export class ClinicalModule {}
