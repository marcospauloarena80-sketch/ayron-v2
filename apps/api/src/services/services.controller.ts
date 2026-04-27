import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';

@ApiTags('Services')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('services')
export class ServicesController {
  constructor(private readonly service: ServicesService) {}

  @Get() findAll(@CurrentUser() u: RequestUser) { return this.service.findAll(u.clinic_id); }
  @Get(':id') findOne(@CurrentUser() u: RequestUser, @Param('id') id: string) { return this.service.findOne(u.clinic_id, id); }
  @Post() create(@CurrentUser() u: RequestUser, @Body() dto: CreateServiceDto) { return this.service.create(u.clinic_id, dto); }
  @Patch(':id') update(@CurrentUser() u: RequestUser, @Param('id') id: string, @Body() dto: Partial<CreateServiceDto>) { return this.service.update(u.clinic_id, id, dto); }
  @Delete(':id') remove(@CurrentUser() u: RequestUser, @Param('id') id: string) { return this.service.remove(u.clinic_id, id); }
}
