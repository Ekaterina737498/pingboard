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
