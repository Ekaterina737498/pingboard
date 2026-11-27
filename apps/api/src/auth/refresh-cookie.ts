import type { Request, Response } from 'express';

export const REFRESH_COOKIE = 'refresh_token';
export const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;

const baseOptions = () => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/graphql',
});

export function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, {
    ...baseOptions(),
    maxAge: REFRESH_TTL_SECONDS * 1000,
  });
}

export function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE, baseOptions());
}

export function readRefreshCookie(req: Request): string | undefined {
  return readCookie(req, REFRESH_COOKIE);
}

export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) {
      return decodeURIComponent(rest.join('='));
    }
  }
  return undefined;
}
