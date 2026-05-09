import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';

const BOOTSTRAP_ORG_ID = '00000000-0000-0000-0000-000000000001';
const BOOTSTRAP_CLINIC_ID = '00000000-0000-0000-0000-000000000002';
const BOOTSTRAP_USER_ID = '00000000-0000-0000-0000-000000000003';
const BOOTSTRAP_PROFESSIONAL_ID = '00000000-0000-0000-0000-000000000010';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
  ) {}

  /** One-shot, idempotent: creates demo org/clinic + MASTER user if absent. */
  async bootstrap(input?: { email?: string; password?: string; secret?: string }) {
    const expectedSecret = process.env.BOOTSTRAP_SECRET;
    if (expectedSecret && input?.secret !== expectedSecret) {
      throw new UnauthorizedException('Invalid bootstrap secret');
    }

    const email = (input?.email ?? 'master@ayron.health').toLowerCase().trim();
    const password = input?.password ?? 'Ayron@Master2025!';
    if (password.length < 8) throw new BadRequestException('Password must be at least 8 chars');

    const existingUser = await this.prisma.user.findFirst({
      where: { email, deleted_at: null },
      select: { id: true, email: true, role: true, clinic_id: true },
    });
    if (existingUser) {
      return {
        already_initialized: true,
        user: existingUser,
        login_url: '/auth/login',
        message: 'MASTER user already exists. Use the existing credentials or reset via DB.',
      };
    }

    const org = await this.prisma.organization.upsert({
      where: { id: BOOTSTRAP_ORG_ID },
      create: { id: BOOTSTRAP_ORG_ID, name: 'AYRON Health Group', plan_tier: 'COGNITIVE', is_active: true },
      update: {},
    });
    const clinic = await this.prisma.clinic.upsert({
      where: { id: BOOTSTRAP_CLINIC_ID },
      create: {
        id: BOOTSTRAP_CLINIC_ID,
        organization_id: org.id,
        name: 'Clínica Piloto AYRON — Endocrinologia',
        specialty: 'endocrinologia',
        timezone: 'America/Sao_Paulo',
        is_active: true,
      },
      update: {},
    });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await this.prisma.user.create({
      data: {
        id: BOOTSTRAP_USER_ID,
        organization_id: org.id,
        clinic_id: clinic.id,
        name: 'MASTER Admin',
        email,
        password_hash: passwordHash,
        role: UserRole.MASTER,
        is_active: true,
      },
      select: { id: true, email: true, role: true, clinic_id: true },
    });

    await this.prisma.professional.upsert({
      where: { id: BOOTSTRAP_PROFESSIONAL_ID },
      create: {
        id: BOOTSTRAP_PROFESSIONAL_ID,
        clinic_id: clinic.id,
        user_id: user.id,
        name: 'Dr(a). Admin Piloto',
        specialty: 'Endocrinologia & Alta Performance',
        crm: 'CRM/SP 000000',
        is_active: true,
      },
      update: {},
    });

    return {
      already_initialized: false,
      user,
      credentials: { email, password },
      login_url: '/auth/login',
      message: 'MASTER user created. Save these credentials NOW — password will not be shown again.',
    };
  }

  async login(email: string, password: string, ip?: string) {
    const user = await this.prisma.user.findFirst({
      where: { email, is_active: true, deleted_at: null },
    });

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const session = await this.prisma.session.create({
      data: {
        user_id: user.id,
        clinic_id: user.clinic_id,
        token_hash: crypto.randomUUID(),
        ip_address: ip,
        expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000),
      },
    });

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      clinic_id: user.clinic_id,
      organization_id: user.organization_id,
      session_id: session.id,
    };

    const access_token = this.jwt.sign(payload);

    await this.audit.log({
      clinic_id: user.clinic_id,
      organization_id: user.organization_id,
      actor_id: user.id,
      actor_role: user.role,
      action: 'LOGIN',
      entity_type: 'User',
      entity_id: user.id,
      ip_address: ip,
      session_id: session.id,
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    });

    return { access_token, user: { id: user.id, name: user.name, email: user.email, role: user.role, clinic_id: user.clinic_id } };
  }

  async logout(userId: string, sessionId: string, clinicId: string) {
    await this.prisma.session.deleteMany({ where: { id: sessionId, user_id: userId } });

    await this.audit.log({
      clinic_id: clinicId,
      actor_id: userId,
      action: 'LOGOUT',
      entity_type: 'User',
      entity_id: userId,
      session_id: sessionId,
    });
  }
}
