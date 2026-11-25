import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';

describe('Sites (e2e)', () => {
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

  const addSite = (token: string, name: string, url: string) =>
    gql(
      `mutation { addSite(input: { name: "${name}", url: "${url}" }) { id name url } }`,
      token,
    );

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

  it('requires a token', async () => {
    const res = await gql('{ sites { id } }');

    expect(res.body.errors).toBeDefined();
  });

  it('adds a site and lists it', async () => {
    const token = await tokenFor('a@example.com');

    const added = await addSite(token, 'Shop', 'https://example.com');
    const list = await gql('{ sites { name url } }', token);

    expect(added.body.data.addSite.name).toBe('Shop');
    expect(list.body.data.sites).toEqual([
      { name: 'Shop', url: 'https://example.com' },
    ]);
  });

  it('rejects an invalid url', async () => {
    const token = await tokenFor('a@example.com');

    const res = await addSite(token, 'Bad', 'not-a-url');

    expect(res.body.errors).toBeDefined();
    expect(await prisma.site.count()).toBe(0);
  });

  it('shows each user only their own sites', async () => {
    const tokenA = await tokenFor('a@example.com');
    const tokenB = await tokenFor('b@example.com');
    await addSite(tokenA, 'A site', 'https://a.example.com');

    const listB = await gql('{ sites { id } }', tokenB);

    expect(listB.body.data.sites).toEqual([]);
  });

  it('does not let another user read or delete a site', async () => {
    const tokenA = await tokenFor('a@example.com');
    const tokenB = await tokenFor('b@example.com');
    const added = await addSite(tokenA, 'A site', 'https://a.example.com');
    const siteId = added.body.data.addSite.id as string;

    const read = await gql(`{ site(id: "${siteId}") { id } }`, tokenB);
    const remove = await gql(
      `mutation { removeSite(id: "${siteId}") { id } }`,
      tokenB,
    );

    expect(read.body.errors[0].message).toBe('Site not found');
    expect(remove.body.errors[0].message).toBe('Site not found');
    expect(await prisma.site.count()).toBe(1);
  });

  it('lets the owner delete a site', async () => {
    const token = await tokenFor('a@example.com');
    const added = await addSite(token, 'Shop', 'https://example.com');
    const siteId = added.body.data.addSite.id as string;

    await gql(`mutation { removeSite(id: "${siteId}") { id } }`, token);

    expect(await prisma.site.count()).toBe(0);
  });

  it('limits the number of sites per user', async () => {
    const token = await tokenFor('a@example.com');
    for (let i = 0; i < 10; i++) {
      await addSite(token, `Site ${i}`, `https://example${i}.com`);
    }

    const res = await addSite(token, 'One too many', 'https://extra.com');

    expect(res.body.errors).toBeDefined();
    expect(await prisma.site.count()).toBe(10);
  });
});
