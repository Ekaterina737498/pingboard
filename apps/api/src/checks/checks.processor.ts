import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { PrismaService } from '../prisma.service';
import {
  CHECK_RETENTION_MS,
  CHECK_SITE_JOB,
  DISPATCH_JOB,
  SITE_CHECKS_QUEUE,
} from './checks.constants';
import { SiteCheckerService } from './site-checker.service';
import { LastCheckCache } from '../redis/last-check.cache';

@Processor(SITE_CHECKS_QUEUE, { concurrency: 5 })
export class ChecksProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly checker: SiteCheckerService,
    private readonly lastCheckCache: LastCheckCache,
    @InjectQueue(SITE_CHECKS_QUEUE) private readonly queue: Queue,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === DISPATCH_JOB) {
      await this.dispatch();
    } else if (job.name === CHECK_SITE_JOB) {
      await this.checkSite((job.data as { siteId: string }).siteId);
    }
  }

  private async dispatch() {
    const sites = await this.prisma.site.findMany({
      where: { isActive: true, owner: { isBlocked: false } },
      select: { id: true },
    });
    await this.queue.addBulk(
      sites.map((site) => ({
        name: CHECK_SITE_JOB,
        data: { siteId: site.id },
        opts: { removeOnComplete: true, removeOnFail: 100 },
      })),
    );
    await this.prisma.check.deleteMany({
      where: { checkedAt: { lt: new Date(Date.now() - CHECK_RETENTION_MS) } },
    });
  }

  private async checkSite(siteId: string) {
    const site = await this.prisma.site.findUnique({ where: { id: siteId } });
    if (!site || !site.isActive) return;
    const result = await this.checker.check(site.url);
    const check = await this.prisma.check.create({
      data: { siteId, ...result },
    });
    await this.lastCheckCache.set(siteId, check);
  }
}
