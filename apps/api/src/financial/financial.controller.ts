import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FinancialService } from './financial.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';

@ApiTags('Financial')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('financial')
export class FinancialController {
  constructor(private readonly service: FinancialService) {}

  @Get()
  findAll(
    @CurrentUser() u: RequestUser,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll(u.clinic_id, { type, status, from, to, page: page ? +page : 1, limit: limit ? +limit : 30 });
  }

  @Get('dre')
  getDRE(@CurrentUser() u: RequestUser, @Query('from') from: string, @Query('to') to: string) {
    return this.service.getDRE(u.clinic_id, from, to);
  }

  @Get('health-score')
  getHealthScore(@CurrentUser() u: RequestUser) {
    return this.service.getHealthScore(u.clinic_id);
  }

  @Get('patients/:patientId')
  findByPatient(
    @CurrentUser() u: RequestUser,
    @Param('patientId') patientId: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findByPatient(u.clinic_id, patientId, { status, type, page: page ? +page : 1, limit: limit ? +limit : 20 });
  }

  @Get('patients/:patientId/balance')
  getPatientBalance(@CurrentUser() u: RequestUser, @Param('patientId') patientId: string) {
    return this.service.getPatientBalance(u.clinic_id, patientId);
  }

  @Post()
  create(@CurrentUser() u: RequestUser, @Body() dto: CreateTransactionDto) {
    return this.service.create(u.clinic_id, dto, u.sub);
  }

  @Patch(':id/pay')
  markPaid(
    @CurrentUser() u: RequestUser,
    @Param('id') id: string,
    @Query('method') method?: string,
  ) {
    return this.service.markPaid(u.clinic_id, id, u.sub, method);
  }
}
