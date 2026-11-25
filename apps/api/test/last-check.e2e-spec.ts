import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';
import { RedisService } from '../src/redis/redis.service';

describe('Last check cache (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let redis: RedisService;

  const gql = (query: string, token?: string) => {
    const req = request(app.getHttpServer()).post('/graphql');
    if (token) {
      req.set('Authorization', `Bearer ${token}`);
    }
    return req.send({ query });
  };

  const tokenFor = async (email: string) => {
    await gql(`mutation {
      register(input: { email: "${email}", password: "abc12345" }) { id }
    }`);
    const res = await gql(`mutation {
      login(input: { email: "${email}", password: "abc12345" }) { accessToken }
    }`);
    return res.body.data.login.accessToken as string;
  };

  const addSite = async (token: string) => {
    const res = await gql(
      `mutation { addSite(input: { name: "Shop", url: "https://example.com" }) { id } }`,
      token,
    );
    return res.body.data.addSite.id as string;
  };

  const cacheKey = (siteId: string) => `site:${siteId}:last-check`;

  beforeAll(async () => {
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
    await app.close();
  });

  it('returns null before the first check', async () => {
    const token = await tokenFor('a@example.com');
    await addSite(token);

    const res = await gql('{ sites { lastCheck { ok } } }', token);

    expect(res.body.data.sites[0].lastCheck).toBeNull();
  });

  it('falls back to the database and fills the cache', async () => {
    const token = await tokenFor('a@example.com');
    const siteId = await addSite(token);
    await prisma.check.create({
      data: { siteId, ok: true, statusCode: 200, responseTimeMs: 100 },
    });

    const res = await gql('{ sites { lastCheck { ok statusCode } } }', token);

    expect(res.body.data.sites[0].lastCheck).toEqual({
      ok: true,
      statusCode: 200,
    });
    expect(await redis.get(cacheKey(siteId))).not.toBeNull();
  });

  it('serves the cached value while it exists', async () => {
    const token = await tokenFor('a@example.com');
    const siteId = await addSite(token);
    await prisma.check.create({
      data: { siteId, ok: true, statusCode: 200, responseTimeMs: 100 },
    });
    await redis.set(
      cacheKey(siteId),
      JSON.stringify({
        ok: false,
        statusCode: 503,
        responseTimeMs: null,
        error: null,
        checkedAt: new Date().toISOString(),
      }),
    );

    const res = await gql('{ sites { lastCheck { ok statusCode } } }', token);

    expect(res.body.data.sites[0].lastCheck).toEqual({
      ok: false,
      statusCode: 503,
    });
  });

  it('removes the cache entry when the site is deleted', async () => {
    const token = await tokenFor('a@example.com');
    const siteId = await addSite(token);
    await prisma.check.create({
      data: { siteId, ok: true, statusCode: 200, responseTimeMs: 100 },
    });
    await gql('{ sites { lastCheck { ok } } }', token);
    expect(await redis.get(cacheKey(siteId))).not.toBeNull();

    await gql(`mutation { removeSite(id: "${siteId}") { id } }`, token);

    expect(await redis.get(cacheKey(siteId))).toBeNull();
  });
});
