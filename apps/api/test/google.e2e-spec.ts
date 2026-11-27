import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';

describe('Google sign-in (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  // Настоящий Google в тестах не вызывается: подменяется ответ на обмен кода.
  const mockGoogle = (claims: object) => {
    const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ id_token: `header.${payload}.sign` })),
      );
  };

  const startFlow = async () => {
    const res = await request(app.getHttpServer()).get('/auth/google');
    const url = new URL(res.headers.location);
    const cookie = (res.headers['set-cookie'] as unknown as string[])[0];
    return {
      url,
      cookie: cookie.split(';')[0],
      state: url.searchParams.get('state') as string,
      nonce: url.searchParams.get('nonce') as string,
    };
  };

  const finishFlow = (state: string, cookie: string) =>
    request(app.getHttpServer())
      .get('/auth/google/callback')
      .query({ code: 'test-code', state })
      .set('Cookie', cookie);

  const validClaims = (nonce: string) => ({
    iss: 'https://accounts.google.com',
    aud: 'test-client-id',
    exp: Math.floor(Date.now() / 1000) + 300,
    nonce,
    sub: 'google-123',
    email: 'user@gmail.com',
    email_verified: true,
  });

  beforeAll(async () => {
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
    process.env.WEB_URL = 'http://web.test';
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.check.deleteMany();
    await prisma.site.deleteMany();
    await prisma.user.deleteMany();
  });

  afterEach(() => jest.restoreAllMocks());

  afterAll(async () => {
    await app.close();
  });

  it('redirects to Google with state and PKCE', async () => {
    const { url } = await startFlow();

    expect(url.origin).toBe('https://accounts.google.com');
    expect(url.searchParams.get('redirect_uri')).toBe(
      'http://web.test/auth/google/callback',
    );
    expect(url.searchParams.get('state')).toBeTruthy();
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
  });

  it('creates a user and sets the refresh cookie', async () => {
    const flow = await startFlow();
    mockGoogle(validClaims(flow.nonce));

    const res = await finishFlow(flow.state, flow.cookie);

    expect(res.headers.location).toBe('http://web.test/');
    expect(String(res.headers['set-cookie'])).toContain('refresh_token=');
    const user = await prisma.user.findUnique({
      where: { email: 'user@gmail.com' },
    });
    expect(user).toMatchObject({ googleId: 'google-123', passwordHash: null });
  });

  it('rejects a wrong state without calling Google', async () => {
    const flow = await startFlow();
    const fetchSpy = jest.spyOn(global, 'fetch');

    const res = await finishFlow('forged-state', flow.cookie);

    expect(res.headers.location).toBe(
      'http://web.test/login?error=google_failed',
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(await prisma.user.count()).toBe(0);
  });

  it('rejects a token with a wrong nonce', async () => {
    const flow = await startFlow();
    mockGoogle(validClaims('another-nonce'));

    const res = await finishFlow(flow.state, flow.cookie);

    expect(res.headers.location).toBe(
      'http://web.test/login?error=google_failed',
    );
    expect(await prisma.user.count()).toBe(0);
  });
});
