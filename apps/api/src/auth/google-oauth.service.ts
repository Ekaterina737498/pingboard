import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';

const AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

export type GoogleFlow = { state: string; nonce: string; verifier: string };

export type GoogleProfile = {
  googleId: string;
  email: string;
  // true, если Google сам отвечает за этот адрес (Gmail или Google Workspace).
  authoritative: boolean;
};

type IdTokenClaims = {
  iss?: string;
  aud?: string;
  exp?: number;
  nonce?: string;
  sub?: string;
  email?: string;
  email_verified?: boolean;
  hd?: string;
};

const randomValue = () => randomBytes(32).toString('base64url');

@Injectable()
export class GoogleOAuthService {
  constructor(private readonly config: ConfigService) {}

  get webUrl() {
    return this.config.get<string>('WEB_URL') || 'http://localhost:3000';
  }

  isConfigured() {
    return Boolean(
      this.config.get<string>('GOOGLE_CLIENT_ID') &&
      this.config.get<string>('GOOGLE_CLIENT_SECRET'),
    );
  }

  createFlow(): GoogleFlow {
    return {
      state: randomValue(),
      nonce: randomValue(),
      verifier: randomValue(),
    };
  }

  authorizationUrl({ state, nonce, verifier }: GoogleFlow) {
    const url = new URL(AUTHORIZE_URL);
    url.search = new URLSearchParams({
      client_id: this.config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      redirect_uri: this.redirectUri(),
      response_type: 'code',
      scope: 'openid email',
      state,
      nonce,
      // PKCE: перехваченный code бесполезен без verifier.
      code_challenge: createHash('sha256').update(verifier).digest('base64url'),
      code_challenge_method: 'S256',
      prompt: 'select_account',
    }).toString();
    return url.toString();
  }

  async fetchProfile(code: string, flow: GoogleFlow): Promise<GoogleProfile> {
    const clientId = this.config.getOrThrow<string>('GOOGLE_CLIENT_ID');
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: this.config.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
        redirect_uri: this.redirectUri(),
        grant_type: 'authorization_code',
        code_verifier: flow.verifier,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      throw new UnauthorizedException('Google rejected the code');
    }

    const { id_token: idToken } = (await response.json()) as {
      id_token?: string;
    };
    // Токен получен напрямую от Google по HTTPS, поэтому стандарт OpenID Connect
    // разрешает не проверять подпись. Токен из браузера так принимать нельзя.
    const claims = decodeClaims(idToken);

    if (
      !ISSUERS.includes(claims.iss ?? '') ||
      claims.aud !== clientId ||
      claims.nonce !== flow.nonce ||
      (claims.exp ?? 0) * 1000 <= Date.now() ||
      !claims.sub ||
      !claims.email ||
      claims.email_verified !== true
    ) {
      throw new UnauthorizedException('Invalid Google token');
    }

    const email = claims.email.trim().toLowerCase();
    return {
      googleId: claims.sub,
      email,
      authoritative: email.endsWith('@gmail.com') || Boolean(claims.hd),
    };
  }

  private redirectUri() {
    return `${this.webUrl}/auth/google/callback`;
  }
}

function decodeClaims(idToken: string | undefined): IdTokenClaims {
  const payload = idToken?.split('.')[1];
  if (!payload) {
    throw new UnauthorizedException('Invalid Google token');
  }
  return JSON.parse(
    Buffer.from(payload, 'base64url').toString('utf8'),
  ) as IdTokenClaims;
}
