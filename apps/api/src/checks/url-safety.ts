import { lookup } from 'node:dns/promises';
import { isIPv4, isIPv6 } from 'node:net';

type Resolve = (host: string) => Promise<{ address: string }[]>;

const defaultResolve: Resolve = (host) => lookup(host, { all: true });

export function isPublicIp(ip: string): boolean {
  if (isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    if (a === 0 || a === 10 || a === 127) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && (b === 168 || b === 0)) return false;
    if (a === 198 && (b === 18 || b === 19)) return false;
    if (a >= 224) return false;
    return true;
  }
  if (isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (lower === '::' || lower === '::1') return false;
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPublicIp(mapped[1]);
    if (lower.startsWith('::ffff:')) return false;
    if (/^f[cd]/.test(lower)) return false;
    if (/^fe[89ab]/.test(lower)) return false;
    return true;
  }
  return false;
}

export async function assertPublicHttpUrl(
  rawUrl: string,
  resolve: Resolve = defaultResolve,
): Promise<URL> {
  const url = new URL(rawUrl);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only http and https addresses are allowed');
  }
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const addresses =
    isIPv4(host) || isIPv6(host) ? [{ address: host }] : await resolve(host);

  if (addresses.length === 0 || addresses.some((a) => !isPublicIp(a.address))) {
    throw new Error('Address is not public');
  }
  return url;
}
