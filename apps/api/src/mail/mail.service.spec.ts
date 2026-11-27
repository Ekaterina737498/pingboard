import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';

function createService(values: Record<string, string>) {
  const config = { get: (key: string) => values[key] };
  return new MailService(config as unknown as ConfigService);
}

describe('MailService with the mail script', () => {
  const service = createService({
    MAIL_SCRIPT_URL: 'https://script.example.com/exec',
    MAIL_SCRIPT_SECRET: 'test-secret',
  });
  const send = () =>
    service.sendEmailVerification('a@example.com', 'https://link');

  afterEach(() => jest.restoreAllMocks());

  function mockResponse(body: string, status = 200) {
    return jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(body, { status }));
  }

  it('sends the message over HTTPS', async () => {
    const fetchSpy = mockResponse('{"ok":true}');

    await send();

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://script.example.com/exec');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toMatchObject({
      secret: 'test-secret',
      to: 'a@example.com',
      subject: 'Confirm your email for PingBoard',
    });
  });

  // Во всех этих случаях нужна ошибка, чтобы очередь повторила отправку.
  it('throws on an error status', async () => {
    mockResponse('{}', 500);

    await expect(send()).rejects.toThrow(
      'Mail script responded with status 500',
    );
  });

  it('throws when the script reports an error with status 200', async () => {
    mockResponse('{"ok":false,"error":"unauthorized"}');

    await expect(send()).rejects.toThrow('Mail script failed: unauthorized');
  });

  it('throws when the response is not JSON', async () => {
    mockResponse('<html>Sign in</html>');

    await expect(send()).rejects.toThrow(
      'Mail script failed: invalid response',
    );
  });

  it('requires the secret together with the URL', () => {
    expect(() =>
      createService({ MAIL_SCRIPT_URL: 'https://script.example.com/exec' }),
    ).toThrow('MAIL_SCRIPT_SECRET is required');
  });
});
