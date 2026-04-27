import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module';
import { AuditModule } from '../common/audit/audit.module';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

@Module({
  imports: [EventsModule, AuditModule],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
