import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';

describe('Auth and roles (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const gql = (query: string, token?: string) => {
    const req = request(app.getHttpServer()).post('/graphql');
    if (token) {
      req.set('Authorization', `Bearer ${token}`);
    }
    return req.send({ query });
  };

  const register = (email: string, password = 'abc12345') =>
    gql(`mutation {
      register(input: { email: "${email}", password: "${password}" }) {
        id email role
      }
    }`);

  const login = async (email: string, password = 'abc12345') => {
    const res = await gql(`mutation {
      login(input: { email: "${email}", password: "${password}" }) {
        accessToken
      }
    }`);
    return res.body.data?.login?.accessToken as string | undefined;
  };

  const createAdminToken = async () => {
    await register('admin@example.com');
    await prisma.user.update({
      where: { email: 'admin@example.com' },
      data: { role: 'ADMIN' },
    });
    return (await login('admin@example.com')) as string;
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

  describe('register', () => {
    it('creates a user and stores only a password hash', async () => {
      const res = await register('new@example.com');

      expect(res.body.data.register).toMatchObject({
        email: 'new@example.com',
        role: 'USER',
      });
      const stored = await prisma.user.findUnique({
        where: { email: 'new@example.com' },
      });
      expect(stored?.passwordHash).toBeDefined();
      expect(stored?.passwordHash).not.toBe('abc12345');
    });

    it('rejects a duplicate email', async () => {
      await register('dup@example.com');
      const res = await register('dup@example.com');

      expect(res.body.errors).toBeDefined();
      expect(await prisma.user.count()).toBe(1);
    });

    it('rejects a weak password', async () => {
      const res = await register('weak@example.com', '123');

      expect(res.body.errors).toBeDefined();
      expect(await prisma.user.count()).toBe(0);
    });
  });

  describe('login', () => {
    it('returns an access token for valid credentials', async () => {
      await register('user@example.com');

      const token = await login('user@example.com');

      expect(typeof token).toBe('string');
    });

    it('does not return a token for a wrong password', async () => {
      await register('user@example.com');

      const token = await login('user@example.com', 'wrong12345');

      expect(token).toBeUndefined();
    });
  });

  describe('me', () => {
    it('is unavailable without a token', async () => {
      const res = await gql('{ me { id email } }');

      expect(res.body.errors).toBeDefined();
      expect(res.body.data).toBeNull();
    });

    it('returns the current user with a valid token', async () => {
      await register('user@example.com');
      const token = (await login('user@example.com')) as string;

      const res = await gql('{ me { email role } }', token);

      expect(res.body.data.me).toEqual({
        email: 'user@example.com',
        role: 'USER',
      });
    });
  });

  describe('roles', () => {
    it('forbids a regular user from listing users', async () => {
      await register('user@example.com');
      const token = (await login('user@example.com')) as string;

      const res = await gql('{ users { id email } }', token);

      expect(res.body.errors[0].message).toBe('Insufficient permissions');
    });

    it('lets an admin list users', async () => {
      await register('user@example.com');
      const adminToken = await createAdminToken();

      const res = await gql('{ users { email role } }', adminToken);

      expect(res.body.data.users).toHaveLength(2);
    });

    it('prevents a blocked user from logging in', async () => {
      const reg = await register('user@example.com');
      const userId = reg.body.data.register.id as string;
      const adminToken = await createAdminToken();

      await gql(
        `mutation { setUserBlocked(userId: "${userId}", isBlocked: true) { isBlocked } }`,
        adminToken,
      );

      expect(await login('user@example.com')).toBeUndefined();
    });

    it('does not let an admin block themselves', async () => {
      const adminToken = await createAdminToken();
      const me = await gql('{ me { id } }', adminToken);
      const adminId = me.body.data.me.id as string;

      const res = await gql(
        `mutation { setUserBlocked(userId: "${adminId}", isBlocked: true) { isBlocked } }`,
        adminToken,
      );

      expect(res.body.errors[0].message).toBe('You cannot block yourself');
    });
  });
});