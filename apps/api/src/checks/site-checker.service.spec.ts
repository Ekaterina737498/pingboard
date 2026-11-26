import { SiteCheckerService } from './site-checker.service';
import { assertPublicHttpUrl } from './url-safety';

jest.mock('./url-safety', () => ({ assertPublicHttpUrl: jest.fn() }));

describe('SiteCheckerService', () => {
  const service = new SiteCheckerService();
  const assertUrl = jest.mocked(assertPublicHttpUrl);
  let fetchSpy: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    assertUrl.mockResolvedValue(new URL('https://example.com'));
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => jest.restoreAllMocks());

  it.each([
    [200, true],
    [301, true],
    [404, false],
    [500, false],
  ])('treats status %i as ok=%s', async (status, ok) => {
    fetchSpy.mockResolvedValue(new Response(null, { status }));

    const result = await service.check('https://example.com');

    expect(result).toMatchObject({ ok, statusCode: status, error: null });
  });

  it('returns the error when the request fails', async () => {
    fetchSpy.mockRejectedValue(new Error('timeout'));

    const result = await service.check('https://example.com');

    expect(result).toEqual({
      ok: false,
      statusCode: null,
      responseTimeMs: null,
      error: 'timeout',
    });
  });

  it('does not send a request to a forbidden address', async () => {
    assertUrl.mockRejectedValue(new Error('Address is not public'));

    const result = await service.check('http://127.0.0.1');

    expect(result.ok).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
