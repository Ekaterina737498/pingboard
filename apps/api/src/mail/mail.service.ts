import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';

export type SiteDownAlert = {
  siteName: string;
  siteUrl: string;
  statusCode: number | null;
  error: string | null;
  checkedAt: Date;
};

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';

type Message = { to: string; subject: string; text: string };

@Injectable()
export class MailService {
  private readonly transport: ReturnType<typeof createTransport>;
  private readonly from: string;
  private readonly brevoApiKey: string | undefined;

  constructor(config: ConfigService) {
    this.transport = createTransport(
      config.get<string>('SMTP_URL') ?? 'smtp://localhost:1025',
    );
    this.from =
      config.get<string>('MAIL_FROM') ?? 'PingBoard <alerts@pingboard.local>';
    this.brevoApiKey = config.get<string>('BREVO_API_KEY') || undefined;
  }

  async sendEmailVerification(to: string, link: string) {
    await this.send({
      to,
      subject: 'Confirm your email for PingBoard',
      text: [
        'Open this link and press the button to confirm your email:',
        link,
        '',
        'The link works once and expires in 24 hours.',
        'If you did not sign up for PingBoard, ignore this message and do not confirm.',
      ].join('\n'),
    });
  }

  async sendSiteDown(to: string, alert: SiteDownAlert) {
    const reason = alert.statusCode
      ? `HTTP status ${alert.statusCode}`
      : (alert.error ?? 'Unknown error');

    await this.send({
      to,
      subject: `Site is down: ${alert.siteName}`,
      text: [
        `${alert.siteName} (${alert.siteUrl}) is not responding.`,
        `Reason: ${reason}`,
        `Checked at: ${alert.checkedAt.toISOString()}`,
      ].join('\n'),
    });
  }

  // Локально письма идут по SMTP. На хостинге, где SMTP закрыт, через HTTP API.
  private async send(message: Message) {
    if (!this.brevoApiKey) {
      await this.transport.sendMail({ from: this.from, ...message });
      return;
    }

    const response = await fetch(BREVO_URL, {
      method: 'POST',
      headers: {
        'api-key': this.brevoApiKey,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: parseSender(this.from),
        to: [{ email: message.to }],
        subject: message.subject,
        textContent: message.text,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      throw new Error(`Brevo responded with status ${response.status}`);
    }
  }
}

// "PingBoard <a@b.com>" превращается в { name, email }.
function parseSender(from: string) {
  const match = from.match(/^(.*)<(.+)>$/);
  return match
    ? { name: match[1].trim(), email: match[2].trim() }
    : { email: from.trim() };
}
