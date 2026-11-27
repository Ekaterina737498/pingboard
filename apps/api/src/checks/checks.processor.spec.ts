import { Job, Queue } from 'bullmq';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma.service';
import { LastCheckCache } from '../redis/last-check.cache';
import { CHECK_SITE_JOB, SEND_ALERT_JOB } from './checks.constants';
import { ChecksProcessor } from './checks.processor';
import { SiteCheckerService } from './site-checker.service';

jest.mock('../prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

describe('ChecksProcessor', () => {
  const prisma = {
    site: { findUnique: jest.fn() },
    check: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn() },
  };
  const checker = { check: jest.fn() };
  const cache = { set: jest.fn() };
  const mail = { sendSiteDown: jest.fn() };
  const queue = { add: jest.fn() };

  const processor = new ChecksProcessor(
    prisma as unknown as PrismaService,
    checker as unknown as SiteCheckerService,
    cache as unknown as LastCheckCache,
    mail as unknown as MailService,
    queue as unknown as Queue,
  );

  const run = (name: string, data: object) =>
    processor.process({ name, data } as Job);

  const checkSite = async (previousOk: boolean | null, currentOk: boolean) => {
    prisma.site.findUnique.mockResolvedValue({
      id: 's1',
      url: 'https://example.com',
      isActive: true,
    });
    prisma.check.findFirst.mockResolvedValue(
      previousOk === null ? null : { ok: previousOk },
    );
    checker.check.mockResolvedValue({ ok: currentOk });
    prisma.check.create.mockResolvedValue({ id: 'c1', ok: currentOk });
    await run(CHECK_SITE_JOB, { siteId: 's1' });
  };

  beforeEach(() => jest.resetAllMocks());

  it.each([
    ['the site goes down', true, false],
    ['the very first check fails', null, false],
  ])('queues an alert when %s', async (_title, previousOk, currentOk) => {
    await checkSite(previousOk, currentOk);

    expect(queue.add).toHaveBeenCalledWith(
      SEND_ALERT_JOB,
      { checkId: 'c1' },
      expect.objectContaining({ attempts: 3 }),
    );
  });

  it.each([
    ['the site stays down', false, false],
    ['the site stays up', true, true],
    ['the site recovers', false, true],
  ])('does not alert when %s', async (_title, previousOk, currentOk) => {
    await checkSite(previousOk, currentOk);

    expect(queue.add).not.toHaveBeenCalled();
  });

  const storedCheck = (
    isBlocked: boolean,
    emailVerifiedAt: Date | null = new Date(),
  ) => ({
    statusCode: 500,
    error: null,
    checkedAt: new Date('2026-01-01T00:00:00Z'),
    site: {
      name: 'Shop',
      url: 'https://example.com',
      isActive: true,
      owner: { email: 'a@example.com', isBlocked, emailVerifiedAt },
    },
  });

  it('sends the alert to the site owner', async () => {
    prisma.check.findUnique.mockResolvedValue(storedCheck(false));

    await run(SEND_ALERT_JOB, { checkId: 'c1' });

    expect(mail.sendSiteDown).toHaveBeenCalledWith(
      'a@example.com',
      expect.objectContaining({ siteName: 'Shop', statusCode: 500 }),
    );
  });

  it('does not send mail to an unverified address', async () => {
    prisma.check.findUnique.mockResolvedValue(storedCheck(false, null));

    await run(SEND_ALERT_JOB, { checkId: 'c1' });

    expect(mail.sendSiteDown).not.toHaveBeenCalled();
  });

  it('does not send mail to a blocked user', async () => {
    prisma.check.findUnique.mockResolvedValue(storedCheck(true));

    await run(SEND_ALERT_JOB, { checkId: 'c1' });

    expect(mail.sendSiteDown).not.toHaveBeenCalled();
  });
});
