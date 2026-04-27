import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { PatientStatus, ConsentType } from '@prisma/client';

@ApiTags('Patients')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('patients')
export class PatientsController {
  constructor(private readonly service: PatientsService) {}

  @Get()
  findAll(
    @CurrentUser() user: RequestUser,
    @Query('status') status?: PatientStatus,
    @Query('search') search?: string,
    @Query('tag') tag?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll(user.clinic_id, {
      status, search, tag,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('kanban')
  getKanban(@CurrentUser() user: RequestUser) {
    return this.service.getKanban(user.clinic_id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.findOne(user.clinic_id, id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreatePatientDto) {
    return this.service.create(user.clinic_id, dto, user.sub);
  }

  @Patch(':id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdatePatientDto) {
    return this.service.update(user.clinic_id, id, dto, user.sub);
  }

  @Patch(':id/status')
  changeStatus(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: ChangeStatusDto) {
    return this.service.changeStatus(user.clinic_id, id, dto, user.sub);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.remove(user.clinic_id, id, user.sub);
  }

  @Post(':id/consent')
  addConsent(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: { consent_type: ConsentType; accepted: boolean },
  ) {
    const ip = undefined;
    return this.service.addConsent(user.clinic_id, id, { ...body, ip_address: ip }, user.sub);
  }
}
