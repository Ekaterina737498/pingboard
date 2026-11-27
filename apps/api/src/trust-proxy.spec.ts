import { parseTrustProxy } from './trust-proxy';

describe('parseTrustProxy', () => {
  it('reads the number of proxies', () => {
    expect(parseTrustProxy('3')).toBe(3);
  });

  it.each([undefined, '', 'true', '-1', '1.5'])('ignores %s', (value) => {
    expect(parseTrustProxy(value)).toBe(0);
  });
});
