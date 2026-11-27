import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { EMAILS_QUEUE } from './email-verification.constants';
import { EmailVerificationProcessor } from './email-verification.processor';
import { EmailVerificationResolver } from './email-verification.resolver';
import { EmailVerificationService } from './email-verification.service';

@Module({
  imports: [BullModule.registerQueue({ name: EMAILS_QUEUE }), MailModule],
  providers: [
    EmailVerificationService,
    EmailVerificationProcessor,
    EmailVerificationResolver,
  ],
  exports: [EmailVerificationService],
})
export class EmailVerificationModule {}
