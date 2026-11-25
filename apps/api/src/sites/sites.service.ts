import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AddSiteInput } from './add-site.input';
import { LastCheckCache } from '../redis/last-check.cache';

export const MAX_SITES_PER_USER = 10;

@Injectable()
export class SitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lastCheckCache: LastCheckCache,
  ) {}

  async add(ownerId: string, input: AddSiteInput) {
    const count = await this.prisma.site.count({ where: { ownerId } });
    if (count >= MAX_SITES_PER_USER) {
      throw new BadRequestException(
        `You can monitor up to ${MAX_SITES_PER_USER} sites`,
      );
    }
    return this.prisma.site.create({
      data: { ownerId, name: input.name, url: input.url },
    });
  }

  list(ownerId: string) {
    return this.prisma.site.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(ownerId: string, id: string) {
    const site = await this.prisma.site.findFirst({ where: { id, ownerId } });
    if (!site) {
      throw new NotFoundException('Site not found');
    }
    return site;
  }

  async remove(ownerId: string, id: string) {
    await this.get(ownerId, id);
    const removed = await this.prisma.site.delete({ where: { id } });
    await this.lastCheckCache.clear(id);
    return removed;
  }

  async recentChecks(ownerId: string, siteId: string, limit: number) {
    await this.get(ownerId, siteId);
    return this.prisma.check.findMany({
      where: { siteId },
      orderBy: { checkedAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 200),
    });
  }

  async uptime24h(ownerId: string, siteId: string): Promise<number | null> {
    await this.get(ownerId, siteId);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [total, ok] = await Promise.all([
      this.prisma.check.count({
        where: { siteId, checkedAt: { gte: since } },
      }),
      this.prisma.check.count({
        where: { siteId, checkedAt: { gte: since }, ok: true },
      }),
    ]);
    return total === 0 ? null : Math.round((ok / total) * 1000) / 10;
  }
}
