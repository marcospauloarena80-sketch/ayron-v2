import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
  ) {}

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
