import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EMAILS_QUEUE } from './email-verification.constants';
import { EmailVerificationService } from './email-verification.service';

@Processor(EMAILS_QUEUE)
export class EmailVerificationProcessor extends WorkerHost {
  constructor(private readonly verification: EmailVerificationService) {
    super();
  }

  async process(job: Job<{ userId: string }>): Promise<void> {
    await this.verification.send(job.data.userId);
  }
}
