import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';

describe('Refresh tokens (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const send = (
    query: string,
    opts: { token?: string; cookie?: string } = {},
  ) => {
    const req = request(app.getHttpServer()).post('/graphql');
    if (opts.token) {
      req.set('Authorization', `Bearer ${opts.token}`);
    }
    if (opts.cookie) {
      req.set('Cookie', opts.cookie);
    }
    return req.send({ query });
  };

  const cookieFrom = (res: { headers: Record<string, unknown> }) => {
    const raw = res.headers['set-cookie'] as string[] | undefined;
    const line = raw?.find((c) => c.startsWith('refresh_token='));
    return line ? line.split(';')[0] : '';
  };

  const register = (email: string) =>
    send(`mutation {
      register(input: { email: "${email}", password: "abc12345" }) { id }
    }`);

  const login = (email: string) =>
    send(`mutation {
      login(input: { email: "${email}", password: "abc12345" }) { accessToken }
    }`);

  const refresh = (cookie?: string) =>
    send('mutation { refresh { accessToken } }', { cookie });

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

  it('sets an httpOnly refresh cookie on login', async () => {
    await register('a@example.com');

    const res = await login('a@example.com');

    const cookies = (res.headers['set-cookie'] as unknown as string[]).join(
      ';',
    );
    expect(cookies).toContain('refresh_token=');
    expect(cookies).toContain('HttpOnly');
    expect(res.body.data.login.accessToken).toBeDefined();
  });

  it('issues a working access token from the refresh cookie', async () => {
    await register('a@example.com');
    const cookie = cookieFrom(await login('a@example.com'));

    const res = await refresh(cookie);
    const me = await send('{ me { email } }', {
      token: res.body.data.refresh.accessToken,
    });

    expect(me.body.data.me.email).toBe('a@example.com');
  });

  it('rotates the token and revokes the session on reuse', async () => {
    await register('a@example.com');
    const cookie1 = cookieFrom(await login('a@example.com'));

    const second = await refresh(cookie1);
    const cookie2 = cookieFrom(second);
    expect(cookie2).not.toBe(cookie1);

    const reuse = await refresh(cookie1);
    expect(reuse.body.errors).toBeDefined();

    const afterReuse = await refresh(cookie2);
    expect(afterReuse.body.errors).toBeDefined();
  });

  it('rejects refresh without a cookie', async () => {
    const res = await refresh();

    expect(res.body.errors).toBeDefined();
  });

  it('logout invalidates the refresh token', async () => {
    await register('a@example.com');
    const cookie = cookieFrom(await login('a@example.com'));

    const out = await send('mutation { logout }', { cookie });
    const res = await refresh(cookie);

    expect(out.body.data.logout).toBe(true);
    expect(res.body.errors).toBeDefined();
  });

  it('does not let a blocked user refresh', async () => {
    const reg = await register('user@example.com');
    const userId = reg.body.data.register.id as string;
    const userCookie = cookieFrom(await login('user@example.com'));

    await register('admin@example.com');
    await prisma.user.update({
      where: { email: 'admin@example.com' },
      data: { role: 'ADMIN' },
    });
    const adminLogin = await login('admin@example.com');
    await send(
      `mutation { setUserBlocked(userId: "${userId}", isBlocked: true) { isBlocked } }`,
      { token: adminLogin.body.data.login.accessToken },
    );

    const res = await refresh(userCookie);

    expect(res.body.errors).toBeDefined();
  });
});
