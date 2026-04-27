import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuditModule } from './common/audit/audit.module';
import { StorageModule } from './common/storage/storage.module';
import { PdfModule } from './common/pdf/pdf.module';
import { CryptoModule } from './common/crypto/crypto.module';
import { EventsModule } from './events/events.module';
import { AuthModule } from './auth/auth.module';
import { PatientsModule } from './patients/patients.module';
import { ProfessionalsModule } from './professionals/professionals.module';
import { ServicesModule } from './services/services.module';
import { AgendaModule } from './agenda/agenda.module';
import { ClinicalModule } from './clinical/clinical.module';
import { ExamsModule } from './exams/exams.module';
import { FinancialModule } from './financial/financial.module';
import { InventoryModule } from './inventory/inventory.module';
import { CommunicationModule } from './communication/communication.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DocumentsModule } from './documents/documents.module';
import { AlertsModule } from './alerts/alerts.module';
import { AppController } from './app.controller';
import { RlsInterceptor } from './common/interceptors/rls.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { PrismaService } from './common/prisma/prisma.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    AuditModule,
    StorageModule,
    PdfModule,
    CryptoModule,
    EventsModule,
    AuthModule,
    PatientsModule,
    ProfessionalsModule,
    ServicesModule,
    AgendaModule,
    ClinicalModule,
    ExamsModule,
    FinancialModule,
    InventoryModule,
    CommunicationModule,
    DashboardModule,
    DocumentsModule,
    AlertsModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useFactory: (prisma: PrismaService) => new RlsInterceptor(prisma), inject: [PrismaService] },
  ],
})
export class AppModule {}
