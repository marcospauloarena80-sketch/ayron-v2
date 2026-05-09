import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from './common/prisma/prisma.service';
import { StorageService } from './common/storage/storage.service';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Controller()
export class AppController {
  private readonly bootedAt = Date.now();

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
  ) {}

  @Get('health')
  async health() {
    const [dbStatus, auditTrigger, minioStatus, redisStatus] = await Promise.all([
      this.prisma.$queryRaw`SELECT 1`.then(() => 'connected').catch(() => 'unreachable'),
      this.prisma.$queryRaw<[{ exists: boolean }]>`
        SELECT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname = 'tgr_audit_logs_immutable') AS exists
      `.then(r => r[0]?.exists ? 'active' : 'not_applied').catch(() => 'unknown'),
      this.storage.healthCheck().then(ok => ok ? 'reachable' : 'unreachable').catch(() => 'unreachable'),
      this.checkRedis(),
    ]);

    const critical = dbStatus === 'connected';
    return {
      status: critical ? 'ok' : 'degraded',
      db: dbStatus,
      redis: redisStatus,
      minio: minioStatus,
      rls: auditTrigger === 'active' ? 'active' : 'inactive',
      audit_trigger: auditTrigger,
      ts: new Date().toISOString(),
      version: process.env.npm_package_version ?? process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ?? '1.0.0',
      build_sha: process.env.RAILWAY_GIT_COMMIT_SHA ?? null,
      uptime_seconds: Math.floor((Date.now() - this.bootedAt) / 1000),
      env: process.env.NODE_ENV ?? 'development',
    };
  }

  /** Kubernetes/Railway readiness probe — fails fast if DB unreachable. */
  @Get('ready')
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { ready: true, ts: new Date().toISOString() };
    } catch (e: any) {
      throw new ServiceUnavailableException({ ready: false, reason: e?.message ?? 'db_unreachable' });
    }
  }

  private async checkRedis(): Promise<string> {
    const url = this.config.get<string>('REDIS_URL');
    if (!url) return 'not_configured';
    let client: Redis | null = null;
    try {
      client = new Redis(url, { connectTimeout: 3000, lazyConnect: true });
      await client.connect();
      await client.ping();
      return 'connected';
    } catch {
      return 'unreachable';
    } finally {
      client?.disconnect();
    }
  }
}
