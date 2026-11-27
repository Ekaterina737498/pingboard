import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';

describe('MailService with the Brevo API', () => {
  const values: Record<string, string> = {
    BREVO_API_KEY: 'test-key',
    MAIL_FROM: 'PingBoard <sender@example.com>',
  };
  const config = { get: (key: string) => values[key] };
  const service = new MailService(config as unknown as ConfigService);

  afterEach(() => jest.restoreAllMocks());

  it('sends the message over HTTPS', async () => {
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 201 }));

    await service.sendEmailVerification('a@example.com', 'https://link');

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect(init?.headers).toMatchObject({ 'api-key': 'test-key' });
    expect(JSON.parse(init?.body as string)).toMatchObject({
      sender: { name: 'PingBoard', email: 'sender@example.com' },
      to: [{ email: 'a@example.com' }],
      subject: 'Confirm your email for PingBoard',
    });
  });

  it('throws on an error response, so the queue retries', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 401 }));

    await expect(
      service.sendEmailVerification('a@example.com', 'https://link'),
    ).rejects.toThrow('Brevo responded with status 401');
  });
});
