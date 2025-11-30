import { emailService, createEmailTransporter, resetTransporter } from '../../services/emailService';
import { InsightsReport, EmailRecipient } from '../../types/insightsTypes';
import nodemailer from 'nodemailer';

// Mock nodemailer
jest.mock('nodemailer');

// Mock config
jest.mock('../../config', () => ({
  config: {
    emailHost: 'smtp.gmail.com',
    emailPort: 587,
    emailUser: 'test@example.com',
    emailPassword: 'testpassword',
    emailFrom: 'Test <test@example.com>',
    frontendAdminUrl: 'https://test.app/admin',
  },
}));

describe('EmailService', () => {
  let mockTransporter: any;
  let mockSendMail: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    resetTransporter(); // Reset cached transporter

    mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-message-id' });
    mockTransporter = {
      sendMail: mockSendMail,
      verify: jest.fn().mockResolvedValue(true),
    };

    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);
  });

  afterEach(() => {
    resetTransporter();
  });

  describe('createEmailTransporter', () => {
    it('should create transporter with correct config', () => {
      createEmailTransporter();

      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: 'test@example.com',
          pass: 'testpassword',
        },
      });
    });
  });

  describe('sendEmail', () => {
    it('should send email with correct parameters', async () => {
      const result = await emailService.sendEmail(
        'recipient@example.com',
        'Test Subject',
        '<h1>Test</h1>'
      );

      expect(mockSendMail).toHaveBeenCalledWith({
        from: 'Test <test@example.com>',
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<h1>Test</h1>',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('test-message-id');
    });

    it('should handle email sending failure', async () => {
      mockSendMail.mockRejectedValue(new Error('SMTP error'));

      const result = await emailService.sendEmail(
        'recipient@example.com',
        'Test Subject',
        '<h1>Test</h1>'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('SMTP error');
    });

    it('should send to multiple recipients', async () => {
      await emailService.sendEmail(
        ['user1@example.com', 'user2@example.com'],
        'Test Subject',
        '<h1>Test</h1>'
      );

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user1@example.com, user2@example.com',
        })
      );
    });
  });

  describe('sendWeeklyInsights', () => {
    const mockReport: InsightsReport = {
      weekRange: 'Nov 25 - Dec 1, 2024',
      generatedAt: new Date('2024-12-01'),
      executiveSummary: 'This week saw a 23% increase in engagement.',
      engagement: {
        topResources: [
          {
            id: '1',
            title: 'OC4IDS Implementation Manual',
            clicks: 142,
            category: 'OC4IDS',
            comparison: '10x more than category average',
            comparisonMultiplier: 10,
          },
        ],
        trendingTopics: [
          {
            category: 'Assurance',
            currentWeekClicks: 145,
            previousWeekClicks: 100,
            velocityPercent: 45,
            direction: 'up',
          },
        ],
        totalClicksThisWeek: 500,
        totalClicksPreviousWeek: 400,
        weekOverWeekChange: 25,
      },
      contentGaps: [
        {
          category: 'Country Programs',
          issue: 'No engagement in 45 days',
          recommendation: 'Feature in next newsletter or update content',
          daysSinceActivity: 45,
        },
      ],
      staleContent: [],
      aiUsage: {
        mostCited: [
          {
            id: '2',
            title: 'Data Quality Checklist',
            aiCitations: 47,
            category: 'Tools',
          },
        ],
        hiddenGems: [
          {
            id: '2',
            title: 'Data Quality Checklist',
            aiCitations: 47,
            clicks: 12,
            citationToClickRatio: 3.92,
          },
        ],
        totalAICitations: 200,
        citationsByTheme: [{ theme: 'Tools', citations: 47 }],
      },
      actionItems: [
        'Promote "Data Quality Checklist" to users',
        'Review Country Programs content for updates',
      ],
    };

    const mockRecipients: EmailRecipient[] = [
      { email: 'admin1@example.com', name: 'Admin One' },
      { email: 'admin2@example.com', name: 'Admin Two' },
    ];

    it('should send weekly insights email to all recipients', async () => {
      const result = await emailService.sendWeeklyInsights(mockRecipients, mockReport);

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'admin1@example.com, admin2@example.com',
          subject: expect.stringContaining('Weekly Knowledge Hub Insights'),
        })
      );

      expect(result.success).toBe(true);
      expect(result.recipientCount).toBe(2);
    });

    it('should include week range in subject', async () => {
      await emailService.sendWeeklyInsights(mockRecipients, mockReport);

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Weekly Knowledge Hub Insights - Nov 25 - Dec 1, 2024',
        })
      );
    });

    it('should handle empty recipients list', async () => {
      const result = await emailService.sendWeeklyInsights([], mockReport);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No recipients provided');
      expect(mockSendMail).not.toHaveBeenCalled();
    });

    it('should generate valid HTML with all sections', async () => {
      await emailService.sendWeeklyInsights(mockRecipients, mockReport);

      const sentHtml = mockSendMail.mock.calls[0][0].html;

      // Check for key content sections
      expect(sentHtml).toContain('Executive Summary');
      expect(sentHtml).toContain('23% increase in engagement');
      expect(sentHtml).toContain('OC4IDS Implementation Manual');
      expect(sentHtml).toContain('10x more than category average');
      expect(sentHtml).toContain('Assurance');
      expect(sentHtml).toContain('+45%');
      expect(sentHtml).toContain('Country Programs');
      expect(sentHtml).toContain('Data Quality Checklist');
    });

    it('should include admin dashboard CTA link', async () => {
      await emailService.sendWeeklyInsights(mockRecipients, mockReport);

      const sentHtml = mockSendMail.mock.calls[0][0].html;
      expect(sentHtml).toContain('https://test.app/admin');
    });
  });

  describe('verifyConnection', () => {
    it('should verify SMTP connection', async () => {
      const result = await emailService.verifyConnection();

      expect(mockTransporter.verify).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false on connection failure', async () => {
      mockTransporter.verify.mockRejectedValue(new Error('Connection failed'));

      const result = await emailService.verifyConnection();

      expect(result).toBe(false);
    });
  });
});
