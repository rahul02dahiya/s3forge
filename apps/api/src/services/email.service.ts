// @ts-ignore
import nodemailer from 'nodemailer';
import { env, constants } from '@s3forge/config';
import { logger } from '../lib/logger.js';
import { renderPasswordResetEmail, renderWelcomeEmail, WelcomeEmailData } from '../templates/email/index.js';

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initTransporter();
  }

  /**
   * Initialize nodemailer transport with constants and env credentials.
   */
  private initTransporter() {
    const { user, pass } = env.smtp;

    if (!user || !pass) {
      logger.warn('SMTP credentials (user/pass) not fully configured in environment. Mailer running in dry-run mode.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: constants.MAIL.DEFAULT_HOST,
      port: constants.MAIL.DEFAULT_PORT,
      secure: constants.MAIL.DEFAULT_SECURE,
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: true,
      },
    });
  }

  /**
   * Verify SMTP connection and credentials.
   */
  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) {
      logger.warn('SMTP verification skipped: missing SMTP_USER or SMTP_PASS in environment.');
      return false;
    }

    try {
      await this.transporter.verify();
      logger.info({ host: constants.MAIL.DEFAULT_HOST, user: env.smtp.user }, 'SMTP server connection verified successfully.');
      return true;
    } catch (error) {
      logger.error({ error, host: constants.MAIL.DEFAULT_HOST }, 'SMTP connection verification failed.');
      return false;
    }
  }

  /**
   * Send Password Reset Email.
   */
  async sendPasswordResetEmail(to: string, resetToken: string, displayName?: string): Promise<boolean> {
    const resetUrl = `${env.appUrl}/reset-password?token=${resetToken}`;
    const expiresInMinutes = Math.round((constants.MAIL.RESET_TOKEN_EXPIRY_SECONDS || 3600) / 60);
    const templateData = renderPasswordResetEmail({
      name: displayName || 'User',
      resetUrl,
      expiresInMinutes,
    });

    return this.sendMail({
      to,
      subject: templateData.subject,
      html: templateData.html,
      text: templateData.text,
    });
  }

  /**
   * Send Welcome Email.
   */
  async sendWelcomeEmail(to: string, displayName?: string): Promise<boolean> {
    const templateData = renderWelcomeEmail({
      name: displayName || 'User',
      email: to,
      dashboardUrl: env.appUrl,
    });

    return this.sendMail({
      to,
      subject: templateData.subject,
      html: templateData.html,
      text: templateData.text,
    });
  }

  /**
   * Generic send email method.
   */
  async sendMail(options: { to: string; subject: string; html: string; text?: string }): Promise<boolean> {
    if (!this.transporter) {
      logger.warn({ to: options.to, subject: options.subject }, 'SMTP transporter not configured. Skipping email delivery.');
      return false;
    }

    try {
      const info = await this.transporter.sendMail({
        from: env.smtp.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      logger.info({ messageId: info.messageId, to: options.to }, 'Email sent successfully.');
      return true;
    } catch (error) {
      logger.error({ error, to: options.to }, 'Failed to send email via SMTP.');
      throw error;
    }
  }
}

export const emailService = new EmailService();
