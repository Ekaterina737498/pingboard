import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';
import { RedisService } from '../src/redis/redis.service';

describe('Rate limiting (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let redis: RedisService;

  const gql = (query: string) =>
    request(app.getHttpServer()).post('/graphql').send({ query });

  const register = (email: string) =>
    gql(`mutation {
      register(input: { email: "${email}", password: "abc12345" }) { id }
    }`);

  const login = (email: string, password = 'abc12345') =>
    gql(`mutation {
      login(input: { email: "${email}", password: "${password}" }) { accessToken }
    }`);

  const message = (res: { body: { errors?: { message: string }[] } }) =>
    res.body.errors?.[0]?.message ?? '';

  beforeAll(async () => {
    process.env.RATE_LIMIT_ENABLED = 'true';
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
    prisma = app.get(PrismaService);
    redis = app.get(RedisService);
  });

  beforeEach(async () => {
    await redis.flushdb();
    await prisma.check.deleteMany();
    await prisma.site.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    process.env.RATE_LIMIT_ENABLED = 'false';
    await app.close();
  });

  it('locks login after five wrong attempts, even with the right password', async () => {
    await register('a@example.com');

    for (let i = 0; i < 5; i++) {
      const res = await login('a@example.com', 'wrong12345');
      expect(message(res)).toBe('Invalid credentials');
    }
    const locked = await login('a@example.com');

    expect(message(locked)).toContain('Too many attempts');
  });

  it('resets the counter after a successful login', async () => {
    await register('a@example.com');

    for (let i = 0; i < 4; i++) {
      await login('a@example.com', 'wrong12345');
    }
    const ok = await login('a@example.com');
    expect(ok.body.data.login.accessToken).toBeDefined();

    for (let i = 0; i < 4; i++) {
      await login('a@example.com', 'wrong12345');
    }
    const okAgain = await login('a@example.com');

    expect(okAgain.body.data.login.accessToken).toBeDefined();
  });

  it('counts attempts per email separately', async () => {
    await register('a@example.com');
    await register('b@example.com');

    for (let i = 0; i < 6; i++) {
      await login('a@example.com', 'wrong12345');
    }
    const other = await login('b@example.com');

    expect(other.body.data.login.accessToken).toBeDefined();
  });

  it('limits registrations per IP', async () => {
    for (let i = 0; i < 5; i++) {
      const res = await register(`user${i}@example.com`);
      expect(res.body.data.register.id).toBeDefined();
    }
    const sixth = await register('user5@example.com');

    expect(message(sixth)).toContain('Too many attempts');
    expect(await prisma.user.count()).toBe(5);
  });
});
