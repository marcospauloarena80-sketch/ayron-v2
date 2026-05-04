import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ClinicalController } from './clinical.controller';
import { ClinicalService } from './clinical.service';
import { ProtocolSchedulerService } from './protocol-scheduler.service';
import { BioimpedanciaService } from './bioimpedancia.service';
import { AiTranscriptionService } from './ai-transcription.service';
import { AuditModule } from '../common/audit/audit.module';
import { StorageModule } from '../common/storage/storage.module';

@Module({
  imports: [
    AuditModule,
    StorageModule,
    MulterModule.register({ limits: { fileSize: 50 * 1024 * 1024 } }), // 50 MB for audio
  ],
  controllers: [ClinicalController],
  providers: [ClinicalService, ProtocolSchedulerService, BioimpedanciaService, AiTranscriptionService],
  exports: [ClinicalService, ProtocolSchedulerService, BioimpedanciaService, AiTranscriptionService],
})
export class ClinicalModule {}
