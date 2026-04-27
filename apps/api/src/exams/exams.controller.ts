import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ExamsService } from './exams.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';

@ApiTags('Exams')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('exams')
export class ExamsController {
  constructor(private readonly service: ExamsService) {}

  @Get('patient/:patientId')
  findByPatient(@CurrentUser() u: RequestUser, @Param('patientId') patientId: string) {
    return this.service.findByPatient(u.clinic_id, patientId);
  }

  @Get('patient/:patientId/trend/:marker')
  getMarkerTrend(@CurrentUser() u: RequestUser, @Param('patientId') pId: string, @Param('marker') marker: string) {
    return this.service.getMarkerTrend(u.clinic_id, pId, marker);
  }

  @Get(':id')
  findOne(@CurrentUser() u: RequestUser, @Param('id') id: string) {
    return this.service.findOne(u.clinic_id, id);
  }

  @Post()
  create(@CurrentUser() u: RequestUser, @Body() dto: CreateExamDto) {
    return this.service.create(u.clinic_id, dto, u.sub);
  }
}
