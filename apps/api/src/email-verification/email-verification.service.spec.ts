import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma.service';
import { RedisService } from '../redis/redis.service';
import { EmailVerificationService } from './email-verification.service';

jest.mock('../prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

describe('EmailVerificationService', () => {
  const prisma = { user: { findUnique: jest.fn(), updateMany: jest.fn() } };
  const redis = { set: jest.fn(), getdel: jest.fn() };
  const mail = { sendEmailVerification: jest.fn() };
  const config = { get: jest.fn() };

  const service = new EmailVerificationService(
    prisma as unknown as PrismaService,
    redis as unknown as RedisService,
    mail as unknown as MailService,
    config as unknown as ConfigService,
    {} as Queue,
  );

  const user = {
    id: '1',
    email: 'a@example.com',
    isBlocked: false,
    emailVerifiedAt: null,
  };

  beforeEach(() => {
    jest.resetAllMocks();
    config.get.mockReturnValue('http://web.test');
  });

  it('sends a link and stores only a hash of the token', async () => {
    prisma.user.findUnique.mockResolvedValue(user);

    await service.send('1');

    const link = mail.sendEmailVerification.mock.calls[0][1] as string;
    expect(link).toMatch(/^http:\/\/web\.test\/verify-email#token=.{43}$/);
    const token = link.split('#token=')[1];
    expect(redis.set.mock.calls[0][0]).not.toContain(token);
    expect(redis.set).toHaveBeenCalledWith(
      expect.stringMatching(/^email-verify:[0-9a-f]{64}$/),
      '1',
      'EX',
      86400,
    );
  });

  it.each([
    ['already verified', { ...user, emailVerifiedAt: new Date() }],
    ['blocked', { ...user, isBlocked: true }],
    ['deleted', null],
  ])('sends nothing when the user is %s', async (_title, found) => {
    prisma.user.findUnique.mockResolvedValue(found);

    await service.send('1');

    expect(mail.sendEmailVerification).not.toHaveBeenCalled();
  });

  it('rejects an unknown or used token', async () => {
    redis.getdel.mockResolvedValue(null);

    await expect(service.confirm('bad')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
  });
});
