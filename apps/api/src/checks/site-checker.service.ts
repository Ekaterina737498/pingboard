import { Injectable } from '@nestjs/common';
import { assertPublicHttpUrl } from './url-safety';

export const CHECK_TIMEOUT_MS = 10_000;

export type CheckResult = {
  ok: boolean;
  statusCode: number | null;
  responseTimeMs: number | null;
  error: string | null;
};

@Injectable()
export class SiteCheckerService {
  async check(rawUrl: string): Promise<CheckResult> {
    const started = Date.now();
    try {
      const url = await assertPublicHttpUrl(rawUrl);
      const res = await fetch(url, {
        redirect: 'manual',
        signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
        headers: { 'user-agent': 'PingBoard/0.1' },
      });
      await res.body?.cancel();
      return {
        ok: res.status < 400,
        statusCode: res.status,
        responseTimeMs: Date.now() - started,
        error: null,
      };
    } catch (err) {
      return {
        ok: false,
        statusCode: null,
        responseTimeMs: null,
        error:
          err instanceof Error ? err.message.slice(0, 200) : 'Unknown error',
      };
    }
  }
}
