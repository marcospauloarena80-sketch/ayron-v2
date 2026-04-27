import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateProfessionalDto } from './dto/create-professional.dto';

@Injectable()
export class ProfessionalsService {
  constructor(private prisma: PrismaService) {}

  findAll(clinicId: string) {
    return this.prisma.professional.findMany({
      where: { clinic_id: clinicId, deleted_at: null, is_active: true },
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(clinicId: string, id: string) {
    const pro = await this.prisma.professional.findFirst({
      where: { id, clinic_id: clinicId, deleted_at: null },
      include: { schedules: true, user: { select: { id: true, name: true, email: true } } },
    });
    if (!pro) throw new NotFoundException('Professional not found');
    return pro;
  }

  create(clinicId: string, dto: CreateProfessionalDto) {
    return this.prisma.professional.create({ data: { ...dto, clinic_id: clinicId } });
  }

  async update(clinicId: string, id: string, dto: Partial<CreateProfessionalDto>) {
    await this.findOne(clinicId, id);
    return this.prisma.professional.update({ where: { id }, data: dto });
  }

  async remove(clinicId: string, id: string) {
    await this.findOne(clinicId, id);
    return this.prisma.professional.update({ where: { id }, data: { deleted_at: new Date(), is_active: false } });
  }
}
