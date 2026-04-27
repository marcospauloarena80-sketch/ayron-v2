import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ProfessionalsService } from './professionals.service';
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';

@ApiTags('Professionals')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('professionals')
export class ProfessionalsController {
  constructor(private readonly service: ProfessionalsService) {}

  @Get() findAll(@CurrentUser() u: RequestUser) { return this.service.findAll(u.clinic_id); }
  @Get(':id') findOne(@CurrentUser() u: RequestUser, @Param('id') id: string) { return this.service.findOne(u.clinic_id, id); }
  @Post() create(@CurrentUser() u: RequestUser, @Body() dto: CreateProfessionalDto) { return this.service.create(u.clinic_id, dto); }
  @Patch(':id') update(@CurrentUser() u: RequestUser, @Param('id') id: string, @Body() dto: Partial<CreateProfessionalDto>) { return this.service.update(u.clinic_id, id, dto); }
  @Delete(':id') remove(@CurrentUser() u: RequestUser, @Param('id') id: string) { return this.service.remove(u.clinic_id, id); }
}
