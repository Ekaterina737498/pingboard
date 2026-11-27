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

type Message = { to: string; subject: string; text: string };

@Injectable()
export class MailService {
  private readonly transport: ReturnType<typeof createTransport>;
  private readonly from: string;
  private readonly script: { url: string; secret: string } | undefined;

  constructor(config: ConfigService) {
    this.transport = createTransport(
      config.get<string>('SMTP_URL') ?? 'smtp://localhost:1025',
    );
    this.from =
      config.get<string>('MAIL_FROM') ?? 'PingBoard <alerts@pingboard.local>';
    const url = config.get<string>('MAIL_SCRIPT_URL');
    if (url) {
      const secret = config.get<string>('MAIL_SCRIPT_SECRET');
      if (!secret) {
        throw new Error('MAIL_SCRIPT_SECRET is required with MAIL_SCRIPT_URL');
      }
      this.script = { url, secret };
    }
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

  // Локально письма идут по SMTP. На хостинге, где SMTP закрыт, по HTTPS
  // через скрипт Google Apps Script (apps/api/mail-script/Code.gs).
  private async send(message: Message) {
    if (!this.script) {
      await this.transport.sendMail({ from: this.from, ...message });
      return;
    }

    const response = await fetch(this.script.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ secret: this.script.secret, ...message }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
      throw new Error(`Mail script responded with status ${response.status}`);
    }
    // Apps Script отвечает 200 и при ошибке, поэтому проверяем тело ответа.
    // Если доступ настроен неверно, вместо JSON приходит HTML-страница.
    const result = (await response.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
    } | null;
    if (result?.ok !== true) {
      throw new Error(
        `Mail script failed: ${result?.error ?? 'invalid response'}`,
      );
    }
  }
}
