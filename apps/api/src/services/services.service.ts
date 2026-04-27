import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';

@Injectable()
export class ServicesService {
  constructor(private prisma: PrismaService) {}

  findAll(clinicId: string) {
    return this.prisma.service.findMany({
      where: { clinic_id: clinicId, is_active: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(clinicId: string, id: string) {
    const svc = await this.prisma.service.findFirst({ where: { id, clinic_id: clinicId } });
    if (!svc) throw new NotFoundException('Service not found');
    return svc;
  }

  create(clinicId: string, dto: CreateServiceDto) {
    return this.prisma.service.create({ data: { ...dto, clinic_id: clinicId } });
  }

  async update(clinicId: string, id: string, dto: Partial<CreateServiceDto>) {
    await this.findOne(clinicId, id);
    return this.prisma.service.update({ where: { id }, data: dto });
  }

  async remove(clinicId: string, id: string) {
    await this.findOne(clinicId, id);
    return this.prisma.service.update({ where: { id }, data: { is_active: false } });
  }
}
