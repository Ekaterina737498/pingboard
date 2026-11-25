import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';

describe('Checks (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

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
  });

  beforeEach(async () => {
    await prisma.check.deleteMany();
    await prisma.site.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns recent checks and uptime to the owner', async () => {
    const token = await tokenFor('a@example.com');
    const siteId = await addSite(token);
    await prisma.check.createMany({
      data: [
        { siteId, ok: true, statusCode: 200, responseTimeMs: 120 },
        { siteId, ok: true, statusCode: 200, responseTimeMs: 90 },
        { siteId, ok: false, error: 'timeout' },
      ],
    });

    const res = await gql(
      `{
        siteChecks(siteId: "${siteId}", limit: 10) { ok statusCode }
        siteUptime(siteId: "${siteId}")
      }`,
      token,
    );

    expect(res.body.data.siteChecks).toHaveLength(3);
    expect(res.body.data.siteUptime).toBe(66.7);
  });

  it('hides checks of another user from everyone else', async () => {
    const tokenA = await tokenFor('a@example.com');
    const tokenB = await tokenFor('b@example.com');
    const siteId = await addSite(tokenA);

    const res = await gql(`{ siteChecks(siteId: "${siteId}") { id } }`, tokenB);

    expect(res.body.errors[0].message).toBe('Site not found');
  });
});
