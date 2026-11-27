import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { MailService } from '../src/mail/mail.service';
import { PrismaService } from '../src/prisma.service';

describe('Email verification (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const mail = { sendEmailVerification: jest.fn(), sendSiteDown: jest.fn() };

  const gql = (query: string) =>
    request(app.getHttpServer()).post('/graphql').send({ query });

  const register = (email: string) =>
    gql(`mutation {
      register(input: { email: "${email}", password: "abc12345" }) { id }
    }`);

  // Письмо отправляет очередь в фоне, поэтому немного ждём.
  const waitForToken = async (email: string) => {
    for (let attempt = 0; attempt < 100; attempt++) {
      const call = mail.sendEmailVerification.mock.calls.find(
        ([to]) => to === email,
      );
      if (call) return (call[1] as string).split('#token=')[1];
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error('Verification email was not sent');
  };

  const verify = (token: string) =>
    gql(`mutation { verifyEmail(token: "${token}") }`);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MailService)
      .useValue(mail)
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.check.deleteMany();
    await prisma.site.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('verifies the email with the link sent after registration', async () => {
    const email = `${randomUUID()}@example.com`;
    await register(email);

    const res = await verify(await waitForToken(email));

    expect(res.body.data.verifyEmail).toBe(true);
    const user = await prisma.user.findUnique({ where: { email } });
    expect(user?.emailVerifiedAt).toBeInstanceOf(Date);
  }, 20_000);

  it('accepts a link only once', async () => {
    const email = `${randomUUID()}@example.com`;
    await register(email);
    const token = await waitForToken(email);
    await verify(token);

    const res = await verify(token);

    expect(res.body.errors[0].message).toBe(
      'Invalid or expired verification link',
    );
  }, 20_000);

  it('does not resend the email without a login', async () => {
    const res = await gql('mutation { resendVerificationEmail }');

    expect(res.body.errors[0].message).toBe('Unauthorized');
  });
});
