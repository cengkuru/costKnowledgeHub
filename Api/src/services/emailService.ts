/**
 * Email Service
 * Handles sending emails via SMTP (Gmail)
 */

import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config';
import { InsightsReport, EmailRecipient } from '../types/insightsTypes';
import { generateWeeklyInsightsEmail } from '../templates/weeklyInsightsEmail';
import { generateWelcomeAdminEmail, WelcomeEmailData } from '../templates/welcomeAdminEmail';

let transporter: Transporter | null = null;

/**
 * Reset transporter (for testing)
 */
export function resetTransporter(): void {
  transporter = null;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface SendWeeklyInsightsResult extends SendEmailResult {
  recipientCount?: number;
}

/**
 * Create and cache the nodemailer transporter
 */
export function createEmailTransporter(): Transporter {
  if (transporter) {
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: config.emailHost,
    port: config.emailPort,
    secure: config.emailPort === 465,
    auth: {
      user: config.emailUser,
      pass: config.emailPassword,
    },
  });

  return transporter;
}

/**
 * Send a single email
 */
async function sendEmail(
  to: string | string[],
  subject: string,
  html: string
): Promise<SendEmailResult> {
  try {
    const transport = createEmailTransporter();
    const recipients = Array.isArray(to) ? to.join(', ') : to;

    const result = await transport.sendMail({
      from: config.emailFrom,
      to: recipients,
      subject,
      html,
    });

    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error) {
    console.error('Failed to send email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send weekly insights email to all recipients
 */
async function sendWeeklyInsights(
  recipients: EmailRecipient[],
  report: InsightsReport
): Promise<SendWeeklyInsightsResult> {
  if (!recipients.length) {
    return {
      success: false,
      error: 'No recipients provided',
    };
  }

  const emails = recipients.map((r) => r.email);
  const subject = `Weekly Knowledge Hub Insights - ${report.weekRange}`;
  const html = generateWeeklyInsightsEmail(report, config.frontendAdminUrl);

  const result = await sendEmail(emails, subject, html);

  return {
    ...result,
    recipientCount: recipients.length,
  };
}

/**
 * Verify SMTP connection
 */
async function verifyConnection(): Promise<boolean> {
  try {
    const transport = createEmailTransporter();
    await transport.verify();
    return true;
  } catch (error) {
    console.error('SMTP connection verification failed:', error);
    return false;
  }
}

/**
 * Send welcome email to new admin user
 */
async function sendWelcomeEmail(
  name: string,
  email: string,
  temporaryPassword: string
): Promise<SendEmailResult> {
  const emailData: WelcomeEmailData = {
    name,
    email,
    temporaryPassword,
    adminUrl: config.frontendAdminUrl,
    frontendUrl: config.frontendUrl,
  };

  const subject = 'Welcome to CoST Knowledge Hub - Your Admin Account';
  const html = generateWelcomeAdminEmail(emailData);

  console.log(`[Email] Sending welcome email to ${email}`);
  return await sendEmail(email, subject, html);
}

export const emailService = {
  sendEmail,
  sendWeeklyInsights,
  sendWelcomeEmail,
  verifyConnection,
};
