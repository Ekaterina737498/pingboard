import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ChecksProcessor } from './checks.processor';
import { ChecksSchedulerService } from './checks-scheduler.service';
import { SITE_CHECKS_QUEUE } from './checks.constants';
import { SiteCheckerService } from './site-checker.service';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [BullModule.registerQueue({ name: SITE_CHECKS_QUEUE }), MailModule],
  providers: [SiteCheckerService, ChecksProcessor, ChecksSchedulerService],
})
export class ChecksModule {}
