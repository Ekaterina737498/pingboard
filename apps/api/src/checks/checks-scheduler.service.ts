import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { Queue } from 'bullmq';
import { DISPATCH_JOB, SITE_CHECKS_QUEUE } from './checks.constants';

@Injectable()
export class ChecksSchedulerService implements OnApplicationBootstrap {
  constructor(@InjectQueue(SITE_CHECKS_QUEUE) private readonly queue: Queue) {}

  async onApplicationBootstrap() {
    if (process.env.CHECKS_ENABLED === 'false') return;
    await this.queue.upsertJobScheduler(
      'dispatch-site-checks',
      { every: 60_000 },
      {
        name: DISPATCH_JOB,
        opts: { removeOnComplete: true, removeOnFail: 100 },
      },
    );
  }
}
