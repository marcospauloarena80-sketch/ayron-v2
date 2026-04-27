import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get() getOverview(@CurrentUser() u: RequestUser) { return this.service.getOverview(u.clinic_id); }
  @Get('weekly') getWeeklyChart(@CurrentUser() u: RequestUser) { return this.service.getWeeklyChart(u.clinic_id); }
}
