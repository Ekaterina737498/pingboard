import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { createHash, randomBytes } from 'node:crypto';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma.service';
import { RedisService } from '../redis/redis.service';
import {
  EMAILS_QUEUE,
  VERIFICATION_JOB,
  VERIFICATION_TTL_SECONDS,
} from './email-verification.constants';

// В Redis лежит только хэш: по нему нельзя восстановить ссылку из письма.
const tokenKey = (token: string) =>
  `email-verify:${createHash('sha256').update(token).digest('hex')}`;

@Injectable()
export class EmailVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
    @InjectQueue(EMAILS_QUEUE) private readonly queue: Queue,
  ) {}

  // В задаче только id пользователя, сам токен в очередь не попадает.
  async request(userId: string) {
    await this.queue.add(
      VERIFICATION_JOB,
      { userId },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 30_000 },
        removeOnComplete: true,
        removeOnFail: 100,
      },
    );
  }

  async send(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.isBlocked || user.emailVerifiedAt) return;

    const token = randomBytes(32).toString('base64url');
    await this.redis.set(
      tokenKey(token),
      user.id,
      'EX',
      VERIFICATION_TTL_SECONDS,
    );
    const webUrl =
      this.config.get<string>('WEB_URL') || 'http://localhost:3000';
    // Часть адреса после # не отправляется на сервер и не попадает в его логи.
    await this.mail.sendEmailVerification(
      user.email,
      `${webUrl}/verify-email#token=${token}`,
    );
  }

  async confirm(token: string) {
    // GETDEL читает и сразу удаляет: ссылка срабатывает только один раз.
    const userId = await this.redis.getdel(tokenKey(token));
    if (!userId) {
      throw new BadRequestException('Invalid or expired verification link');
    }
    await this.prisma.user.updateMany({
      where: { id: userId, emailVerifiedAt: null },
      data: { emailVerifiedAt: new Date() },
    });
    return true;
  }
}
