import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';

describe('Admin: sites and blocking (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const gql = (query: string, token?: string) => {
    const req = request(app.getHttpServer()).post('/graphql');
    if (token) {
      req.set('Authorization', `Bearer ${token}`);
    }
    return req.send({ query });
  };

  const createUser = async (email: string, role: 'USER' | 'ADMIN' = 'USER') => {
    await gql(`mutation {
      register(input: { email: "${email}", password: "abc12345" }) { id }
    }`);
    const user = await prisma.user.update({
      where: { email },
      data: { role },
    });
    const res = await gql(`mutation {
      login(input: { email: "${email}", password: "abc12345" }) { accessToken }
    }`);
    return { id: user.id, token: res.body.data.login.accessToken as string };
  };

  const addSite = (token: string, name: string) =>
    gql(
      `mutation { addSite(input: { name: "${name}", url: "https://example.com" }) { id } }`,
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

  it('lets an admin see the sites of all users with their owners', async () => {
    const a = await createUser('a@example.com');
    const b = await createUser('b@example.com');
    const admin = await createUser('admin@example.com', 'ADMIN');
    await addSite(a.token, 'First');
    await addSite(b.token, 'Second');

    const res = await gql('{ allSites { name owner { email } } }', admin.token);

    expect(res.body.data.allSites).toHaveLength(2);
    expect(res.body.data.allSites).toEqual(
      expect.arrayContaining([
        { name: 'First', owner: { email: 'a@example.com' } },
        { name: 'Second', owner: { email: 'b@example.com' } },
      ]),
    );
  });

  it('forbids a regular user from seeing all sites', async () => {
    const user = await createUser('a@example.com');

    const res = await gql('{ allSites { name } }', user.token);

    expect(res.body.errors[0].message).toBe('Insufficient permissions');
  });

  it('rejects the old access token right after blocking', async () => {
    const user = await createUser('a@example.com');
    const admin = await createUser('admin@example.com', 'ADMIN');

    await gql(
      `mutation { setUserBlocked(userId: "${user.id}", isBlocked: true) { id } }`,
      admin.token,
    );
    const res = await addSite(user.token, 'Late');

    expect(res.body.errors[0].message).toBe('Unauthorized');
    expect(await prisma.site.count()).toBe(0);
  });
});
