import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AgendaService } from './agenda.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { AppointmentStatus } from '@prisma/client';
import { IsString, IsOptional } from 'class-validator';

class CancelDto { @IsString() reason: string; }

@ApiTags('Agenda')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('agenda')
export class AgendaController {
  constructor(private readonly service: AgendaService) {}

  @Get()
  findAll(
    @CurrentUser() u: RequestUser,
    @Query('date') date?: string,
    @Query('professional_id') professional_id?: string,
    @Query('status') status?: AppointmentStatus,
    @Query('patient_id') patient_id?: string,
    @Query('search') search?: string,
    @Query('kanban_stage') kanban_stage?: string,
  ) {
    return this.service.findAll(u.clinic_id, {
      date, professional_id, status, patient_id, search, kanban_stage,
      actor_role: u.role,
      actor_professional_id: (u as any).professional_id,
    });
  }

  @Get('daily-closing/:date')
  getDailyClosingStatus(@CurrentUser() u: RequestUser, @Param('date') date: string) {
    return this.service.getDailyClosingStatus(u.clinic_id, date);
  }

  @Get('patients/:patientId')
  findByPatient(
    @CurrentUser() u: RequestUser,
    @Param('patientId') patientId: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll(u.clinic_id, { patient_id: patientId }).then((all: any[]) => {
      const limited = limit ? all.slice(0, +limit) : all;
      return { data: limited, total: all.length };
    });
  }

  @Get(':id')
  findOne(@CurrentUser() u: RequestUser, @Param('id') id: string) {
    return this.service.findOne(u.clinic_id, id);
  }

  @Post()
  create(@CurrentUser() u: RequestUser, @Body() dto: CreateAppointmentDto) {
    return this.service.create(u.clinic_id, dto, u.sub);
  }

  @Patch(':id')
  update(@CurrentUser() u: RequestUser, @Param('id') id: string, @Body() dto: UpdateAppointmentDto) {
    return this.service.update(u.clinic_id, id, dto, u.sub);
  }

  @Post(':id/check-in')
  checkIn(@CurrentUser() u: RequestUser, @Param('id') id: string) {
    return this.service.checkIn(u.clinic_id, id, u.sub);
  }

  @Post(':id/check-out')
  checkOut(@CurrentUser() u: RequestUser, @Param('id') id: string) {
    return this.service.checkOut(u.clinic_id, id, u.sub);
  }

  @Post(':id/cancel')
  cancel(@CurrentUser() u: RequestUser, @Param('id') id: string, @Body() dto: CancelDto) {
    return this.service.cancel(u.clinic_id, id, dto.reason, u.sub);
  }

  @Post(':id/daily-closing')
  performDailyClosing(@CurrentUser() u: RequestUser, @Param('id') id: string) {
    return this.service.performDailyClosing(u.clinic_id, id, u.sub);
  }

  @Post(':id/start')
  startConsulta(@CurrentUser() u: RequestUser, @Param('id') id: string) {
    return this.service.startConsulta(u.clinic_id, id, u.sub);
  }

  @Post(':id/finalize')
  finalizeConsulta(
    @CurrentUser() u: RequestUser,
    @Param('id') id: string,
    @Body() dto: { finalization_note?: string; return_scheduled: boolean; return_exception_note?: string; skip_charge?: boolean },
  ) {
    return this.service.finalizeConsulta(u.clinic_id, id, dto, u.sub);
  }

  @Post(':id/kanban-stage')
  updateKanbanStage(
    @CurrentUser() u: RequestUser,
    @Param('id') id: string,
    @Body() dto: { stage: string; skipped_reason?: string },
  ) {
    return this.service.updateKanbanStage(u.clinic_id, id, dto, u.sub);
  }
}
