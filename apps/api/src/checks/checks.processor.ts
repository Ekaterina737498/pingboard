import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { PrismaService } from '../prisma.service';
import {
  CHECK_RETENTION_MS,
  CHECK_SITE_JOB,
  DISPATCH_JOB,
  SEND_ALERT_JOB,
  SITE_CHECKS_QUEUE,
} from './checks.constants';
import { SiteCheckerService } from './site-checker.service';
import { LastCheckCache } from '../redis/last-check.cache';
import { MailService } from '../mail/mail.service';

@Processor(SITE_CHECKS_QUEUE, { concurrency: 5 })
export class ChecksProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly checker: SiteCheckerService,
    private readonly lastCheckCache: LastCheckCache,
    private readonly mail: MailService,
    @InjectQueue(SITE_CHECKS_QUEUE) private readonly queue: Queue,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === DISPATCH_JOB) {
      await this.dispatch();
    } else if (job.name === CHECK_SITE_JOB) {
      await this.checkSite((job.data as { siteId: string }).siteId);
    } else if (job.name === SEND_ALERT_JOB) {
      await this.sendAlert((job.data as { checkId: string }).checkId);
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
    const previous = await this.prisma.check.findFirst({
      where: { siteId },
      orderBy: { checkedAt: 'desc' },
      select: { ok: true },
    });
    const check = await this.prisma.check.create({
      data: { siteId, ...result },
    });
    await this.lastCheckCache.set(siteId, check);

    // Письмо только в момент падения, а не на каждой неудачной проверке.
    const wentDown = !check.ok && (previous?.ok ?? true);
    if (wentDown) {
      await this.queue.add(
        SEND_ALERT_JOB,
        { checkId: check.id },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 30_000 },
          removeOnComplete: true,
          removeOnFail: 100,
        },
      );
    }
  }

  private async sendAlert(checkId: string) {
    const check = await this.prisma.check.findUnique({
      where: { id: checkId },
      include: { site: { include: { owner: true } } },
    });
    if (!check || !check.site.isActive) return;

    // На неподтверждённый адрес не пишем: он может принадлежать постороннему.
    const { owner } = check.site;
    if (owner.isBlocked || !owner.emailVerifiedAt) return;

    await this.mail.sendSiteDown(check.site.owner.email, {
      siteName: check.site.name,
      siteUrl: check.site.url,
      statusCode: check.statusCode,
      error: check.error,
      checkedAt: check.checkedAt,
    });
  }
}
