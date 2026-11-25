import { Injectable } from '@nestjs/common';
import { RedisService } from './redis.service';
import { PrismaService } from '../prisma.service';

export type LastCheck = {
  ok: boolean;
  statusCode: number | null;
  responseTimeMs: number | null;
  error: string | null;
  checkedAt: Date;
};

const TTL_SECONDS = 600;
const keyFor = (siteId: string) => `site:${siteId}:last-check`;

@Injectable()
export class LastCheckCache {
  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  async set(siteId: string, check: LastCheck) {
    const { ok, statusCode, responseTimeMs, error, checkedAt } = check;
    await this.redis.set(
      keyFor(siteId),
      JSON.stringify({ ok, statusCode, responseTimeMs, error, checkedAt }),
      'EX',
      TTL_SECONDS,
    );
  }

  async get(siteId: string): Promise<LastCheck | null> {
    const raw = await this.redis.get(keyFor(siteId));
    if (raw) {
      const parsed = JSON.parse(raw) as Omit<LastCheck, 'checkedAt'> & {
        checkedAt: string;
      };
      return { ...parsed, checkedAt: new Date(parsed.checkedAt) };
    }

    const fromDb = await this.prisma.check.findFirst({
      where: { siteId },
      orderBy: { checkedAt: 'desc' },
    });
    if (!fromDb) {
      return null;
    }
    await this.set(siteId, fromDb);
    return fromDb;
  }

  async clear(siteId: string) {
    await this.redis.del(keyFor(siteId));
  }
}
