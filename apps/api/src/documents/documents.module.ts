import { Module } from '@nestjs/common';
import { DocumentsController, PatientDocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { AuditModule } from '../common/audit/audit.module';
import { StorageModule } from '../common/storage/storage.module';
import { PdfModule } from '../common/pdf/pdf.module';

@Module({
  imports: [PrismaModule, AuditModule, StorageModule, PdfModule],
  controllers: [DocumentsController, PatientDocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
