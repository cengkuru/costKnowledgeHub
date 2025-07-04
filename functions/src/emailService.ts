import { logger } from 'firebase-functions';
import { GeminiClient } from './geminiClient';
import * as nodemailer from 'nodemailer';
import { google } from 'googleapis';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Email configuration from environment variables
const gmailUser = process.env.GMAIL_USER || 'cengkurulabs@gmail.com';
const gmailPassword = process.env.GMAIL_APP_PASSWORD || 'mery zozx vgfj pwgw';
const geminiApiKey = process.env.GEMINI_API_KEY;

// Email templates and types
export type EmailType =
  | 'user_welcome'
  | 'user_created_by_admin'
  | 'admin_role_assigned'
  | 'admin_role_removed'
  | 'resource_submitted'
  | 'resource_approved'
  | 'resource_rejected'
  | 'ai_processing_complete'
  | 'bulk_operation_complete'
  | 'system_error'
  | 'weekly_summary'
  | 'monthly_report'
  | 'password_reset_confirmation';

export interface EmailData {
  to: string | string[];
  type: EmailType;
  templateData: Record<string, any>;
  priority?: 'high' | 'normal' | 'low';
  replyTo?: string;
}

export interface EmailTemplate {
  subject: string;
  htmlTemplate: string;
  textTemplate: string;
  variables: string[];
}

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private geminiClient: GeminiClient | null = null;
  private isInitialized = false;

  constructor() {
    // Initialize lazily when needed
  }

  /**
   * Initialize the email service
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize Gemini client for content generation
      this.geminiClient = new GeminiClient();

      // Create Gmail transporter
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser,
          pass: gmailPassword
        }
      });

      // Verify connection
      await this.transporter.verify();
      logger.info('Email service initialized successfully');
      this.isInitialized = true;
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
      throw new Error('Email service initialization failed');
    }
  }

  /**
   * Send an email using predefined templates
   */
  async sendEmail(emailData: EmailData): Promise<void> {
    try {
      await this.initialize();

      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      const template = await this.getEmailTemplate(emailData.type, emailData.templateData);
      const recipients = Array.isArray(emailData.to) ? emailData.to : [emailData.to];

      // Send email to each recipient
      for (const recipient of recipients) {
        const mailOptions = {
          from: {
            name: 'Knowledge Hub Team',
            address: gmailUser
          },
          to: recipient,
          subject: template.subject,
          html: template.htmlTemplate,
          text: template.textTemplate,
          replyTo: emailData.replyTo || 'noreply@knowledgehub.com',
          priority: emailData.priority || 'normal'
        };

        await this.transporter.sendMail(mailOptions);
        logger.info(`Email sent successfully to ${recipient}`, {
          type: emailData.type,
          recipient: recipient
        });
      }
    } catch (error) {
      logger.error('Failed to send email:', error);
      throw error;
    }
  }

  /**
   * Get email template with AI-generated content
   */
  private async getEmailTemplate(type: EmailType, templateData: Record<string, any>): Promise<EmailTemplate> {
    const baseTemplate = this.getBaseTemplate(type);

    // Use Gemini to generate personalized content
    const enhancedTemplate = await this.enhanceTemplateWithAI(baseTemplate, templateData);

    return {
      subject: this.interpolateTemplate(enhancedTemplate.subject, templateData),
      htmlTemplate: this.interpolateTemplate(enhancedTemplate.htmlTemplate, templateData),
      textTemplate: this.interpolateTemplate(enhancedTemplate.textTemplate, templateData),
      variables: enhancedTemplate.variables
    };
  }

  /**
   * Get base email template for each type
   */
  private getBaseTemplate(type: EmailType): EmailTemplate {
    const templates: Record<EmailType, EmailTemplate> = {
      user_welcome: {
        subject: 'Welcome to Knowledge Hub - Your Infrastructure Transparency Platform',
        htmlTemplate: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #355E69; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">Welcome to Knowledge Hub</h1>
            </div>
            <div style="padding: 20px;">
              <p>Dear {{userName}},</p>
              <p>Welcome to Knowledge Hub, the Infrastructure Transparency Initiative (CoST) platform for sharing and accessing transparent infrastructure information.</p>
              <p>Your account has been successfully created. You can now:</p>
              <ul>
                <li>Access comprehensive infrastructure resources</li>
                <li>Submit and share transparency documents</li>
                <li>Collaborate with the global CoST community</li>
              </ul>
              <p><a href="{{platformUrl}}" style="background: #355E69; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Access Knowledge Hub</a></p>
              <p>Best regards,<br>Knowledge Hub Team</p>
            </div>
          </div>
        `,
        textTemplate: `Welcome to Knowledge Hub\n\nDear {{userName}},\n\nWelcome to Knowledge Hub, the Infrastructure Transparency Initiative (CoST) platform.\n\nYour account has been successfully created. Access the platform at: {{platformUrl}}\n\nBest regards,\nKnowledge Hub Team`,
        variables: ['userName', 'platformUrl']
      },

      user_created_by_admin: {
        subject: 'Your Knowledge Hub Account Has Been Created',
        htmlTemplate: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #355E69; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">Account Created</h1>
            </div>
            <div style="padding: 20px;">
              <p>Dear {{userName}},</p>
              <p>An administrator has created a Knowledge Hub account for you.</p>
              <p><strong>Account Details:</strong></p>
              <ul>
                <li>Email: {{email}}</li>
                <li>Role: {{role}}</li>
                <li>Temporary Password: <code style="background: #f8f9fa; padding: 2px 6px; border-radius: 3px;">{{tempPassword}}</code></li>
              </ul>
              <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0; color: #856404;"><strong>Important:</strong> Please change your password after your first login for security.</p>
              </div>
              <p>You can now access Knowledge Hub and start contributing to infrastructure transparency:</p>
              <p><a href="{{loginUrl}}" style="background: #355E69; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Login to Knowledge Hub</a></p>
              <p>If you have any questions, please contact {{adminEmail}}.</p>
              <p>Best regards,<br>Knowledge Hub Team</p>
            </div>
          </div>
        `,
        textTemplate: `Account Created\n\nDear {{userName}},\n\nAn administrator has created a Knowledge Hub account for you.\n\nEmail: {{email}}\nRole: {{role}}\nTemporary Password: {{tempPassword}}\n\nIMPORTANT: Please change your password after your first login.\n\nLogin at: {{loginUrl}}\n\nContact: {{adminEmail}}\n\nBest regards,\nKnowledge Hub Team`,
        variables: ['userName', 'email', 'role', 'tempPassword', 'loginUrl', 'adminEmail']
      },

      admin_role_assigned: {
        subject: 'Administrator Access Granted - Knowledge Hub',
        htmlTemplate: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #355E69; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">Administrator Access Granted</h1>
            </div>
            <div style="padding: 20px;">
              <p>Dear {{userName}},</p>
              <p>You have been granted administrator access to Knowledge Hub.</p>
              <p>As an administrator, you can:</p>
              <ul>
                <li>Manage user accounts and permissions</li>
                <li>Review and approve resource submissions</li>
                <li>Access analytics and reporting tools</li>
                <li>Configure platform settings</li>
              </ul>
              <p><a href="{{adminUrl}}" style="background: #355E69; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Access Admin Panel</a></p>
              <p>Best regards,<br>Knowledge Hub Team</p>
            </div>
          </div>
        `,
        textTemplate: `Administrator Access Granted\n\nDear {{userName}},\n\nYou have been granted administrator access to Knowledge Hub.\n\nAccess the admin panel at: {{adminUrl}}\n\nBest regards,\nKnowledge Hub Team`,
        variables: ['userName', 'adminUrl']
      },

      admin_role_removed: {
        subject: 'Administrator Access Removed - Knowledge Hub',
        htmlTemplate: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #355E69; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">Administrator Access Removed</h1>
            </div>
            <div style="padding: 20px;">
              <p>Dear {{userName}},</p>
              <p>Your administrator access to Knowledge Hub has been removed.</p>
              <p>You can continue to access the platform with standard user permissions.</p>
              <p><a href="{{platformUrl}}" style="background: #355E69; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Access Knowledge Hub</a></p>
              <p>Best regards,<br>Knowledge Hub Team</p>
            </div>
          </div>
        `,
        textTemplate: `Administrator Access Removed\n\nDear {{userName}},\n\nYour administrator access to Knowledge Hub has been removed.\n\nAccess the platform at: {{platformUrl}}\n\nBest regards,\nKnowledge Hub Team`,
        variables: ['userName', 'platformUrl']
      },

      resource_submitted: {
        subject: 'Resource Submitted Successfully - Knowledge Hub',
        htmlTemplate: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #355E69; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">Resource Submitted</h1>
            </div>
            <div style="padding: 20px;">
              <p>Dear {{userName}},</p>
              <p>Your resource "{{resourceTitle}}" has been successfully submitted to Knowledge Hub.</p>
              <p><strong>Resource Details:</strong></p>
              <ul>
                <li>Title: {{resourceTitle}}</li>
                <li>Type: {{resourceType}}</li>
                <li>Status: {{resourceStatus}}</li>
                <li>Submitted: {{submissionDate}}</li>
              </ul>
              <p>Our team will review your submission and notify you of any updates.</p>
              <p><a href="{{resourceUrl}}" style="background: #355E69; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Resource</a></p>
              <p>Best regards,<br>Knowledge Hub Team</p>
            </div>
          </div>
        `,
        textTemplate: `Resource Submitted\n\nDear {{userName}},\n\nYour resource "{{resourceTitle}}" has been successfully submitted.\n\nView resource at: {{resourceUrl}}\n\nBest regards,\nKnowledge Hub Team`,
        variables: ['userName', 'resourceTitle', 'resourceType', 'resourceStatus', 'submissionDate', 'resourceUrl']
      },

      resource_approved: {
        subject: 'Resource Approved and Published - Knowledge Hub',
        htmlTemplate: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #0AAEA0; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">Resource Approved! 🎉</h1>
            </div>
            <div style="padding: 20px;">
              <p>Dear {{userName}},</p>
              <p>Great news! Your resource "{{resourceTitle}}" has been approved and is now published on Knowledge Hub.</p>
              <p>Your contribution to infrastructure transparency is making a difference in the global CoST community.</p>
              <p><a href="{{resourceUrl}}" style="background: #0AAEA0; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Published Resource</a></p>
              <p>Thank you for your valuable contribution!</p>
              <p>Best regards,<br>Knowledge Hub Team</p>
            </div>
          </div>
        `,
        textTemplate: `Resource Approved!\n\nDear {{userName}},\n\nYour resource "{{resourceTitle}}" has been approved and published.\n\nView at: {{resourceUrl}}\n\nThank you for your contribution!\n\nBest regards,\nKnowledge Hub Team`,
        variables: ['userName', 'resourceTitle', 'resourceUrl']
      },

      resource_rejected: {
        subject: 'Resource Submission Requires Revision - Knowledge Hub',
        htmlTemplate: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #F0AD4E; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">Resource Requires Revision</h1>
            </div>
            <div style="padding: 20px;">
              <p>Dear {{userName}},</p>
              <p>Your resource "{{resourceTitle}}" requires some revisions before it can be published.</p>
              <p><strong>Feedback:</strong></p>
              <div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #F0AD4E;">
                {{feedback}}
              </div>
              <p>Please make the necessary revisions and resubmit your resource.</p>
              <p><a href="{{editUrl}}" style="background: #F0AD4E; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Edit Resource</a></p>
              <p>Best regards,<br>Knowledge Hub Team</p>
            </div>
          </div>
        `,
        textTemplate: `Resource Requires Revision\n\nDear {{userName}},\n\nYour resource "{{resourceTitle}}" requires revision.\n\nFeedback: {{feedback}}\n\nEdit at: {{editUrl}}\n\nBest regards,\nKnowledge Hub Team`,
        variables: ['userName', 'resourceTitle', 'feedback', 'editUrl']
      },

      ai_processing_complete: {
        subject: 'AI Processing Complete - Knowledge Hub',
        htmlTemplate: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #355E69; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">AI Processing Complete ✨</h1>
            </div>
            <div style="padding: 20px;">
              <p>Dear {{userName}},</p>
              <p>AI processing for your resource "{{resourceTitle}}" has been completed successfully.</p>
              <p><strong>Generated Content:</strong></p>
              <ul>
                <li>Multi-language summaries: {{languageCount}} languages</li>
                <li>Suggested tags: {{tagCount}} tags</li>
                <li>Content analysis: Complete</li>
              </ul>
              <p><a href="{{resourceUrl}}" style="background: #355E69; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Enhanced Resource</a></p>
              <p>Best regards,<br>Knowledge Hub Team</p>
            </div>
          </div>
        `,
        textTemplate: `AI Processing Complete\n\nDear {{userName}},\n\nAI processing for "{{resourceTitle}}" is complete.\n\nView at: {{resourceUrl}}\n\nBest regards,\nKnowledge Hub Team`,
        variables: ['userName', 'resourceTitle', 'languageCount', 'tagCount', 'resourceUrl']
      },

      bulk_operation_complete: {
        subject: 'Bulk Operation Complete - Knowledge Hub',
        htmlTemplate: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #355E69; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">Bulk Operation Complete</h1>
            </div>
            <div style="padding: 20px;">
              <p>Dear {{userName}},</p>
              <p>Your bulk operation has been completed successfully.</p>
              <p><strong>Operation Details:</strong></p>
              <ul>
                <li>Operation: {{operationType}}</li>
                <li>Resources affected: {{resourceCount}}</li>
                <li>Status: {{operationStatus}}</li>
              </ul>
              <p><a href="{{adminUrl}}" style="background: #355E69; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Results</a></p>
              <p>Best regards,<br>Knowledge Hub Team</p>
            </div>
          </div>
        `,
        textTemplate: `Bulk Operation Complete\n\nDear {{userName}},\n\nBulk operation complete: {{operationType}} on {{resourceCount}} resources.\n\nView results at: {{adminUrl}}\n\nBest regards,\nKnowledge Hub Team`,
        variables: ['userName', 'operationType', 'resourceCount', 'operationStatus', 'adminUrl']
      },

      system_error: {
        subject: 'System Alert - Knowledge Hub',
        htmlTemplate: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #dc3545; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">System Alert</h1>
            </div>
            <div style="padding: 20px;">
              <p>Dear Administrator,</p>
              <p>A system error has occurred that requires attention.</p>
              <p><strong>Error Details:</strong></p>
              <div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #dc3545; font-family: monospace;">
                {{errorMessage}}
              </div>
              <p><strong>Timestamp:</strong> {{timestamp}}</p>
              <p><strong>Affected Component:</strong> {{component}}</p>
              <p>Please investigate and resolve this issue promptly.</p>
              <p>Best regards,<br>Knowledge Hub System</p>
            </div>
          </div>
        `,
        textTemplate: `System Alert\n\nDear Administrator,\n\nSystem error occurred: {{errorMessage}}\n\nTimestamp: {{timestamp}}\nComponent: {{component}}\n\nPlease investigate promptly.\n\nBest regards,\nKnowledge Hub System`,
        variables: ['errorMessage', 'timestamp', 'component']
      },

      weekly_summary: {
        subject: 'Weekly Activity Summary - Knowledge Hub',
        htmlTemplate: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #355E69; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">Weekly Summary</h1>
            </div>
            <div style="padding: 20px;">
              <p>Dear {{userName}},</p>
              <p>Here's your weekly activity summary for Knowledge Hub.</p>
              <p><strong>This Week's Activity:</strong></p>
              <ul>
                <li>New resources: {{newResources}}</li>
                <li>Total views: {{totalViews}}</li>
                <li>Downloads: {{totalDownloads}}</li>
                <li>New users: {{newUsers}}</li>
              </ul>
              <p><a href="{{analyticsUrl}}" style="background: #355E69; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Full Analytics</a></p>
              <p>Best regards,<br>Knowledge Hub Team</p>
            </div>
          </div>
        `,
        textTemplate: `Weekly Summary\n\nDear {{userName}},\n\nWeekly activity:\n- New resources: {{newResources}}\n- Total views: {{totalViews}}\n- Downloads: {{totalDownloads}}\n- New users: {{newUsers}}\n\nView analytics at: {{analyticsUrl}}\n\nBest regards,\nKnowledge Hub Team`,
        variables: ['userName', 'newResources', 'totalViews', 'totalDownloads', 'newUsers', 'analyticsUrl']
      },

      monthly_report: {
        subject: 'Monthly Platform Report - Knowledge Hub',
        htmlTemplate: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #355E69; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">Monthly Report</h1>
            </div>
            <div style="padding: 20px;">
              <p>Dear {{userName}},</p>
              <p>Here's your comprehensive monthly report for Knowledge Hub.</p>
              <p><strong>{{monthName}} {{year}} Highlights:</strong></p>
              <ul>
                <li>New resources published: {{monthlyResources}}</li>
                <li>Total platform views: {{monthlyViews}}</li>
                <li>Resource downloads: {{monthlyDownloads}}</li>
                <li>Active users: {{activeUsers}}</li>
                <li>Top performing resource: {{topResource}}</li>
              </ul>
              <p><a href="{{reportUrl}}" style="background: #355E69; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Detailed Report</a></p>
              <p>Best regards,<br>Knowledge Hub Team</p>
            </div>
          </div>
        `,
        textTemplate: `Monthly Report\n\nDear {{userName}},\n\n{{monthName}} {{year}} highlights:\n- New resources: {{monthlyResources}}\n- Total views: {{monthlyViews}}\n- Downloads: {{monthlyDownloads}}\n- Active users: {{activeUsers}}\n- Top resource: {{topResource}}\n\nView report at: {{reportUrl}}\n\nBest regards,\nKnowledge Hub Team`,
        variables: ['userName', 'monthName', 'year', 'monthlyResources', 'monthlyViews', 'monthlyDownloads', 'activeUsers', 'topResource', 'reportUrl']
      },

      password_reset_confirmation: {
        subject: 'Password Reset Confirmation - Knowledge Hub',
        htmlTemplate: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #355E69; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">Password Reset Confirmation</h1>
            </div>
            <div style="padding: 20px;">
              <p>Dear {{userName}},</p>
              <p>Your password for Knowledge Hub has been successfully reset.</p>
              <p>If you did not request this change, please contact our support team immediately.</p>
              <p><a href="{{loginUrl}}" style="background: #355E69; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Login to Knowledge Hub</a></p>
              <p>Best regards,<br>Knowledge Hub Team</p>
            </div>
          </div>
        `,
        textTemplate: `Password Reset Confirmation\n\nDear {{userName}},\n\nYour password has been successfully reset.\n\nLogin at: {{loginUrl}}\n\nBest regards,\nKnowledge Hub Team`,
        variables: ['userName', 'loginUrl']
      }
    };

    return templates[type];
  }

  /**
   * Enhance template with AI-generated content
   */
  private async enhanceTemplateWithAI(template: EmailTemplate, templateData: Record<string, any>): Promise<EmailTemplate> {
    try {
      if (!this.geminiClient) {
        return template; // Return original template if AI not available
      }

      // Generate enhanced content using Gemini
      const prompt = `
        Enhance this email template with personalized, professional content suitable for the Knowledge Hub infrastructure transparency platform.

        Template Type: ${templateData.type || 'general'}
        Recipient Context: ${JSON.stringify(templateData, null, 2)}

        Original Subject: ${template.subject}

        Requirements:
        1. Keep the professional tone appropriate for government officials and infrastructure professionals
        2. Make it more personalized and engaging
        3. Add relevant context about infrastructure transparency and CoST initiatives
        4. Maintain the original structure and variables
        5. Keep it concise and actionable

        Return only the enhanced subject line, do not modify the template structure.
      `;

      const response = await this.geminiClient.generateContent(prompt);
      const enhancedSubject = response.text()?.trim() || template.subject;

      // Return enhanced template with AI-generated subject
      return {
        ...template,
        subject: enhancedSubject.replace(/^Subject:\s*/i, '').trim()
      };
    } catch (error) {
      logger.warn('AI enhancement failed, using original template:', error);
      return template;
    }
  }

  /**
   * Interpolate template variables
   */
  private interpolateTemplate(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : match;
    });
  }

  /**
   * Send bulk emails (for notifications, reports, etc.)
   */
  async sendBulkEmails(emails: EmailData[]): Promise<void> {
    const batchSize = 10; // Send in batches to avoid rate limits

    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);

      // Process batch in parallel
      const promises = batch.map(email =>
        this.sendEmail(email).catch(error => {
          logger.error(`Failed to send email to ${email.to}:`, error);
          return null; // Continue with other emails
        })
      );

      await Promise.all(promises);

      // Add delay between batches
      if (i + batchSize < emails.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  /**
   * Send system error notification to administrators
   */
  async sendSystemErrorNotification(error: Error, component: string, adminEmails: string[]): Promise<void> {
    const emailData: EmailData = {
      to: adminEmails,
      type: 'system_error',
      templateData: {
        errorMessage: error.message,
        timestamp: new Date().toISOString(),
        component
      },
      priority: 'high'
    };

    await this.sendEmail(emailData);
  }

  /**
   * Send weekly summary to administrators
   */
  async sendWeeklySummary(summaryData: Record<string, any>, adminEmails: string[]): Promise<void> {
    const emailData: EmailData = {
      to: adminEmails,
      type: 'weekly_summary',
      templateData: summaryData,
      priority: 'normal'
    };

    await this.sendEmail(emailData);
  }

  /**
   * Send monthly report to administrators
   */
  async sendMonthlyReport(reportData: Record<string, any>, adminEmails: string[]): Promise<void> {
    const emailData: EmailData = {
      to: adminEmails,
      type: 'monthly_report',
      templateData: reportData,
      priority: 'normal'
    };

    await this.sendEmail(emailData);
  }
}

// Export singleton instance
export const emailService = new EmailService();
