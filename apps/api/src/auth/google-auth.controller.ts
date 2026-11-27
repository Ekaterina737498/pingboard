import {
  ConflictException,
  Controller,
  Get,
  Logger,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { GoogleOAuthService, type GoogleFlow } from './google-oauth.service';
import { readCookie, setRefreshCookie } from './refresh-cookie';

const FLOW_COOKIE = 'google_oauth';

const flowCookieOptions = () => ({
  httpOnly: true,
  // lax: cookie должна прийти при возврате пользователя с сайта Google.
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/auth/google',
});

@Controller('auth/google')
export class GoogleAuthController {
  private readonly logger = new Logger(GoogleAuthController.name);

  constructor(
    private readonly google: GoogleOAuthService,
    private readonly auth: AuthService,
  ) {}

  @Get()
  start(@Res() res: Response) {
    if (!this.google.isConfigured()) {
      return this.fail(res, 'google_unavailable');
    }
    const flow = this.google.createFlow();
    res.cookie(FLOW_COOKIE, [flow.state, flow.nonce, flow.verifier].join('.'), {
      ...flowCookieOptions(),
      maxAge: 10 * 60 * 1000,
    });
    res.redirect(this.google.authorizationUrl(flow));
  }

  @Get('callback')
  async callback(
    @Query() query: Record<string, unknown>,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const flow = parseFlow(readCookie(req, FLOW_COOKIE));
    res.clearCookie(FLOW_COOKIE, flowCookieOptions());

    // state защищает от CSRF: ответ должен относиться ко входу из этого браузера.
    const { code, state } = query;
    if (!flow || typeof code !== 'string' || state !== flow.state) {
      return this.fail(res, 'google_failed');
    }

    try {
      const profile = await this.google.fetchProfile(code, flow);
      const { refreshToken } = await this.auth.loginWithGoogle(profile);
      // Токены не передаются в URL: фронтенд получит access-токен через refresh.
      setRefreshCookie(res, refreshToken);
      res.redirect(`${this.google.webUrl}/`);
    } catch (error) {
      if (error instanceof ConflictException) {
        return this.fail(res, 'google_link');
      }
      this.logger.warn(`Google sign-in failed: ${String(error)}`);
      this.fail(res, 'google_failed');
    }
  }

  private fail(res: Response, reason: string) {
    res.redirect(`${this.google.webUrl}/login?error=${reason}`);
  }
}

function parseFlow(value: string | undefined): GoogleFlow | null {
  const [state, nonce, verifier] = value?.split('.') ?? [];
  return state && nonce && verifier ? { state, nonce, verifier } : null;
}
