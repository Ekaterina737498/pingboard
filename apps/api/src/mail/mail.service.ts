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

@Injectable()
export class MailService {
  private readonly transport: ReturnType<typeof createTransport>;
  private readonly from: string;

  constructor(config: ConfigService) {
    this.transport = createTransport(
      config.get<string>('SMTP_URL') ?? 'smtp://localhost:1025',
    );
    this.from =
      config.get<string>('MAIL_FROM') ?? 'PingBoard <alerts@pingboard.local>';
  }

  async sendEmailVerification(to: string, link: string) {
    await this.transport.sendMail({
      from: this.from,
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

    await this.transport.sendMail({
      from: this.from,
      to,
      subject: `Site is down: ${alert.siteName}`,
      text: [
        `${alert.siteName} (${alert.siteUrl}) is not responding.`,
        `Reason: ${reason}`,
        `Checked at: ${alert.checkedAt.toISOString()}`,
      ].join('\n'),
    });
  }
}
