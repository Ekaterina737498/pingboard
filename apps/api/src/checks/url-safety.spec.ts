import { assertPublicHttpUrl, isPublicIp } from './url-safety';

describe('isPublicIp', () => {
  it.each([
    '127.0.0.1',
    '10.1.2.3',
    '172.16.0.1',
    '192.168.1.1',
    '169.254.169.254',
    '0.0.0.0',
    '::1',
    'fd00::1',
    'fe80::1',
    '::ffff:127.0.0.1',
  ])('treats %s as not public', (ip) => {
    expect(isPublicIp(ip)).toBe(false);
  });

  it.each(['8.8.8.8', '93.184.216.34', '2606:4700:4700::1111'])(
    'treats %s as public',
    (ip) => {
      expect(isPublicIp(ip)).toBe(true);
    },
  );
});

describe('assertPublicHttpUrl', () => {
  const publicResolver = () => Promise.resolve([{ address: '93.184.216.34' }]);
  const privateResolver = () => Promise.resolve([{ address: '10.0.0.5' }]);

  it('accepts a host that resolves to a public address', async () => {
    await expect(
      assertPublicHttpUrl('https://example.com', publicResolver),
    ).resolves.toBeInstanceOf(URL);
  });

  it('rejects a host that resolves to a private address', async () => {
    await expect(
      assertPublicHttpUrl('https://internal.example', privateResolver),
    ).rejects.toThrow('Address is not public');
  });

  it('rejects an IP literal pointing to localhost', async () => {
    await expect(assertPublicHttpUrl('http://127.0.0.1:5435')).rejects.toThrow(
      'Address is not public',
    );
  });

  it('rejects non-http protocols', async () => {
    await expect(assertPublicHttpUrl('ftp://example.com')).rejects.toThrow(
      'Only http and https',
    );
  });
});
